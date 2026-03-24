/**
 * /remove <@user>
 *
 * Captain sets a team member as inactive (preserves history).
 * Spec: docs/BOT_SPEC.md → /remove
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  ComponentType,
} from "discord.js";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import { playersTable, teamMembersTable, teamsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { checkBan } from "../lib/checkBan.js";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";

export const data = new SlashCommandBuilder()
  .setName("remove")
  .setDescription("Remove a player from your team roster (captain only).")
  .addUserOption((o) =>
    o.setName("player").setDescription("The Discord user to remove").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  // ── Ban check ──────────────────────────────────────────────────────────────
  const banReason = await checkBan(interaction.user.id);
  if (banReason) {
    await replyError(interaction, `❌ Your account is currently banned: ${banReason}`);
    return;
  }


  const discordId = interaction.user.id;
  const targetUser = interaction.options.getUser("player", true);

  if (targetUser.id === discordId) {
    await replyError(interaction, "❌ You can't remove yourself. Use `/leave` to leave your team.");
    return;
  }

  // Find invoker's player record
  const [invoker] = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(eq(playersTable.discordId, discordId))
    .limit(1);

  if (!invoker) {
    await replyError(interaction, "❌ You don't have a player record.");
    return;
  }

  // Find teams where invoker is captain
  const captainTeams = await db
    .select({ id: teamsTable.id, name: teamsTable.name, tag: teamsTable.tag })
    .from(teamsTable)
    .where(and(eq(teamsTable.captainPlayerId, invoker.id), eq(teamsTable.isActive, true)));

  if (captainTeams.length === 0) {
    await replyError(interaction, "❌ You are not the captain of any active team.");
    return;
  }

  // Disambiguate if captain of multiple teams
  let teamId: number;
  let teamName: string;
  let teamTag: string;

  if (captainTeams.length === 1) {
    teamId = captainTeams[0]!.id;
    teamName = captainTeams[0]!.name;
    teamTag = captainTeams[0]!.tag;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("remove_team_select")
      .setPlaceholder("Which team?")
      .addOptions(captainTeams.map((t) => ({ label: `${t.name} [${t.tag}]`, value: String(t.id) })));
    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const reply = await interaction.editReply({ content: "Which team?", components: [row] });

    try {
      const sel = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await sel.deferUpdate();
      const chosen = captainTeams.find((t) => String(t.id) === sel.values[0]);
      if (!chosen) {
        await replyError(interaction, { content: "❌ Invalid selection.", components: [] });
        return;
      }
      teamId = chosen.id;
      teamName = chosen.name;
      teamTag = chosen.tag;
    } catch {
      await replyError(interaction, { content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // Find target player record
  const [targetPlayer] = await db
    .select({ id: playersTable.id, riotId: playersTable.riotId })
    .from(playersTable)
    .where(eq(playersTable.discordId, targetUser.id))
    .limit(1);

  if (!targetPlayer) {
    await replyError(interaction, 
      `❌ <@${targetUser.id}> doesn't have a VCLoL player record.`
    );
    return;
  }

  // Verify target is an active member of this team
  const [membership] = await db
    .select({ id: teamMembersTable.id })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.playerId, targetPlayer.id),
        eq(teamMembersTable.status, "active")
      )
    )
    .limit(1);

  if (!membership) {
    await replyError(interaction, 
      `❌ <@${targetUser.id}> is not an active member of **${teamName}**.`
    );
    return;
  }

  // Set inactive — preserves history, does not delete
  await db
    .update(teamMembersTable)
    .set({ status: "inactive" })
    .where(eq(teamMembersTable.id, membership.id));

  // ── Notify removed player ──────────────────────────────────────────────────
  // Insert notification row (poller handles DM delivery)
  await db.insert(notificationsTable).values({
    playerId: targetPlayer.id,
    type: "roster_change",
    title: "Removed from team",
    message: `You have been removed from ${teamName} [${teamTag}] by the team captain.`,
    isRead: false,
    dmSent: false,
    dmFailed: false,
  }).catch((err) => console.error("[remove] Failed to insert notification:", err));

  // Also DM directly (fire-and-forget, same pattern as /add DM)
  if (targetUser.id) {
    try {
      const dmUser = await interaction.client.users.fetch(targetUser.id);
      const dmEmbed = new EmbedBuilder()
        .setColor(0xfee75c)
        .setTitle(`Removed from ${teamName} [${teamTag}]`)
        .setDescription(
          `You have been removed from the roster by the team captain.\n` +
          `Your match history and stats are preserved.`
        )
        .setFooter({ text: PLATFORM_URL });
      await dmUser.send({ embeds: [dmEmbed] });
    } catch {
      // DM failed (user has DMs disabled) — notification row handles fallback
    }
  }

  const displayName = targetPlayer.riotId.startsWith("pending")
    ? `<@${targetUser.id}>`
    : targetPlayer.riotId;

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle(`✅ Player removed — ${teamName} [${teamTag}]`)
    .setDescription(
      `${displayName} has been removed from the roster.\nTheir match history is preserved.`
    );

  await interaction.editReply({ embeds: [embed], components: [] });
}
