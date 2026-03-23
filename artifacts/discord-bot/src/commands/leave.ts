/**
 * /leave
 *
 * Team member voluntarily leaves their team.
 * Captains must /transfer-captain first.
 * Spec: docs/BOT_SPEC.md → /leave
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
import { playersTable, teamMembersTable, teamsTable, notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Leave your team. Captains must /transfer-captain first.");

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;

  // ── Find invoker ──────────────────────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!invoker) {
    await interaction.editReply("❌ You don't have a player record.");
    return;
  }

  // ── Find active memberships ───────────────────────────────────────────────
  const memberships = await db
    .select({
      membershipId: teamMembersTable.id,
      teamId: teamsTable.id,
      teamName: teamsTable.name,
      teamTag: teamsTable.tag,
      captainPlayerId: teamsTable.captainPlayerId,
    })
    .from(teamMembersTable)
    .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(
      and(
        eq(teamMembersTable.playerId, invoker.id),
        eq(teamMembersTable.status, "active"),
        eq(teamsTable.isActive, true)
      )
    );

  if (memberships.length === 0) {
    await interaction.editReply("❌ You are not an active member of any team.");
    return;
  }

  // ── Determine which team to leave ─────────────────────────────────────────
  let membership: (typeof memberships)[0];

  if (memberships.length === 1) {
    membership = memberships[0]!;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("leave_team_select")
      .setPlaceholder("Which team do you want to leave?")
      .addOptions(
        memberships.map((m) => ({ label: `${m.teamName} [${m.teamTag}]`, value: String(m.membershipId) }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const reply = await interaction.editReply({ content: "Which team do you want to leave?", components: [row] });

    try {
      const sel = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await sel.deferUpdate();
      const chosen = memberships.find((m) => String(m.membershipId) === sel.values[0]);
      if (!chosen) {
        await interaction.editReply({ content: "❌ Invalid selection.", components: [] });
        return;
      }
      membership = chosen;
    } catch {
      await interaction.editReply({ content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // ── Block captains from leaving without transferring first ────────────────
  if (membership.captainPlayerId === invoker.id) {
    await interaction.editReply({
      content:
        `❌ You are the captain of **${membership.teamName}**. ` +
        `Use \`/transfer-captain @player\` to hand over leadership before leaving.`,
      components: [],
    });
    return;
  }

  // ── Set membership inactive (preserve history, don't delete) ─────────────
  await db
    .update(teamMembersTable)
    .set({ status: "inactive" })
    .where(eq(teamMembersTable.id, membership.membershipId));

  // ── Notify captain that member left ────────────────────────────────────────
  if (membership.captainPlayerId) {
    const displayName = invoker.riotId?.startsWith("pending")
      ? interaction.user.username
      : (invoker.riotId ?? interaction.user.username);
    await db.insert(notificationsTable).values({
      playerId: membership.captainPlayerId,
      type: "roster_change",
      title: "Team member left",
      message: `${displayName} has left ${membership.teamName} [${membership.teamTag}].`,
      isRead: false,
      dmSent: false,
      dmFailed: false,
    }).catch((err) => console.error("[leave] Failed to notify captain:", err));
  }

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle(`✅ Left **${membership.teamName}** [${membership.teamTag}]`)
    .setDescription("Your match history and stats are preserved. You can join or create another team any time.");

  await interaction.editReply({ embeds: [embed], components: [] });
}
