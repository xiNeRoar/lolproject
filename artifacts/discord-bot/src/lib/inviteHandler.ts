/**
 * Invite Button Handler — persistent handler for team invite accept/decline.
 *
 * Buttons use customId format: invite_accept_{teamMemberId} / invite_decline_{teamMemberId}
 * Handled in index.ts interactionCreate — survives bot restarts.
 */

import { ButtonInteraction, EmbedBuilder } from "discord.js";
import { db } from "./db.js";
import { teamMembersTable, teamsTable, playersTable, notificationsTable } from "@workspace/db";
import { eq, and, lt } from "drizzle-orm";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";
const INVITE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function handleInviteButton(interaction: ButtonInteraction): Promise<void> {
  const [, action, memberIdStr] = interaction.customId.split("_") as [string, string, string];
  const memberId = parseInt(memberIdStr, 10);
  if (isNaN(memberId)) {
    await interaction.reply({ content: "Invalid invite.", ephemeral: true });
    return;
  }

  // Look up the pending membership
  const [membership] = await db
    .select({
      id: teamMembersTable.id,
      teamId: teamMembersTable.teamId,
      playerId: teamMembersTable.playerId,
      status: teamMembersTable.status,
      joinedAt: teamMembersTable.joinedAt,
    })
    .from(teamMembersTable)
    .where(eq(teamMembersTable.id, memberId))
    .limit(1);

  if (!membership) {
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription("This invite no longer exists.")],
      components: [],
    });
    return;
  }

  if (membership.status !== "pending") {
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription("This invite has already been processed.")],
      components: [],
    });
    return;
  }

  // Check expiry (24h)
  const elapsed = Date.now() - membership.joinedAt.getTime();
  if (elapsed > INVITE_EXPIRY_MS) {
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, memberId));
    await interaction.update({
      embeds: [new EmbedBuilder().setColor(0xed4245).setDescription("This invite has expired.")],
      components: [],
    });
    return;
  }

  // Verify the clicking user owns this invite
  const [player] = await db
    .select({ id: playersTable.id, discordId: playersTable.discordId })
    .from(playersTable)
    .where(eq(playersTable.id, membership.playerId))
    .limit(1);

  if (!player || player.discordId !== interaction.user.id) {
    await interaction.reply({ content: "This invite is not for you.", ephemeral: true });
    return;
  }

  // Get team info
  const [team] = await db
    .select({ name: teamsTable.name, tag: teamsTable.tag, captainPlayerId: teamsTable.captainPlayerId, isActive: teamsTable.isActive })
    .from(teamsTable)
    .where(eq(teamsTable.id, membership.teamId))
    .limit(1);

  const teamLabel = team ? `${team.name} [${team.tag}]` : "Unknown Team";

  if (action === "accept") {
    if (team && !team.isActive) {
      await db.delete(teamMembersTable).where(eq(teamMembersTable.id, memberId));
      await interaction.update({
        embeds: [new EmbedBuilder().setColor(0xed4245).setDescription("This team is no longer active. The invite has been cancelled.")],
        components: [],
      });
      return;
    }

    await db
      .update(teamMembersTable)
      .set({ status: "active" })
      .where(eq(teamMembersTable.id, memberId));

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle(`Joined ${teamLabel}`)
          .setDescription(
            `You are now an active member.\n\n` +
            `• Link your Riot ID: \`/link-riot YourName#TAG\`\n` +
            `• Your team: ${PLATFORM_URL}/teams/${membership.teamId}`
          )
          .setFooter({ text: PLATFORM_URL }),
      ],
      components: [],
    });

    // Notify captain
    if (team?.captainPlayerId) {
      await db.insert(notificationsTable).values({
        playerId: team.captainPlayerId,
        type: "roster_change",
        title: "Invite accepted",
        message: `${interaction.user.username} accepted the invite to ${teamLabel}.`,
        isRead: false, dmSent: false, dmFailed: false,
      }).catch(() => {});
    }
  } else {
    // Decline — delete the pending row
    await db.delete(teamMembersTable).where(eq(teamMembersTable.id, memberId));

    await interaction.update({
      embeds: [
        new EmbedBuilder()
          .setColor(0xed4245)
          .setTitle("Invite declined")
          .setDescription(`You declined the invite to ${teamLabel}.`),
      ],
      components: [],
    });

    // Notify captain
    if (team?.captainPlayerId) {
      await db.insert(notificationsTable).values({
        playerId: team.captainPlayerId,
        type: "roster_change",
        title: "Invite declined",
        message: `${interaction.user.username} declined the invite to ${teamLabel}.`,
        isRead: false, dmSent: false, dmFailed: false,
      }).catch(() => {});
    }
  }
}

/** Clean up expired pending invites (call on bot startup). */
export async function cleanupExpiredInvites(): Promise<void> {
  const cutoff = new Date(Date.now() - INVITE_EXPIRY_MS);
  const deleted = await db
    .delete(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.status, "pending"),
        lt(teamMembersTable.joinedAt, cutoff)
      )
    )
    .returning({ id: teamMembersTable.id });

  if (deleted.length > 0) {
    console.log(`[invite] Cleaned up ${deleted.length} expired pending invite(s).`);
  }
}
