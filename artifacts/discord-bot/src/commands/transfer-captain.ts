/**
 * /transfer-captain <@user>
 *
 * Captain transfers leadership to another active team member.
 * Spec: docs/BOT_SPEC.md → /transfer-captain
 * Blocked by: Issue #14 (captain endpoint) — bot calls DB directly
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
import { playersTable, teamMembersTable, teamsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

export const data = new SlashCommandBuilder()
  .setName("transfer-captain")
  .setDescription("Transfer team leadership to another active member.")
  .addUserOption((o) =>
    o.setName("player").setDescription("The player to make captain").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const discordId = interaction.user.id;
  const targetDiscordUser = interaction.options.getUser("player", true);

  if (targetDiscordUser.id === discordId) {
    await interaction.editReply("❌ You can't transfer captaincy to yourself.");
    return;
  }

  // ── Find invoker ──────────────────────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];
  if (!invoker) {
    await interaction.editReply("❌ You don't have a player record.");
    return;
  }

  // ── Find teams where invoker is captain ──────────────────────────────────
  const captainTeams = await db
    .select({ id: teamsTable.id, name: teamsTable.name, tag: teamsTable.tag })
    .from(teamsTable)
    .where(and(eq(teamsTable.captainPlayerId, invoker.id), eq(teamsTable.isActive, true)));

  if (captainTeams.length === 0) {
    await interaction.editReply("❌ You are not the captain of any active team.");
    return;
  }

  // ── Determine which team ──────────────────────────────────────────────────
  let teamId: number;
  let teamName: string;
  let teamTag: string;

  if (captainTeams.length === 1) {
    teamId = captainTeams[0]!.id;
    teamName = captainTeams[0]!.name;
    teamTag = captainTeams[0]!.tag;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("transfer_team_select")
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
      if (!chosen) { await interaction.editReply({ content: "❌ Invalid.", components: [] }); return; }
      teamId = chosen.id;
      teamName = chosen.name;
      teamTag = chosen.tag;
    } catch {
      await interaction.editReply({ content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // ── Find target player ────────────────────────────────────────────────────
  const targetPlayer = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, targetDiscordUser.id)).limit(1)
  )[0];

  if (!targetPlayer) {
    await interaction.editReply(
      `❌ <@${targetDiscordUser.id}> doesn't have a VCLoL player record. They need to be added to the team with \`/add\` first.`
    );
    return;
  }

  // ── Verify target is active member of this team ───────────────────────────
  const membership = (
    await db
      .select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.playerId, targetPlayer.id),
          eq(teamMembersTable.status, "active")
        )
      )
      .limit(1)
  )[0];

  if (!membership) {
    await interaction.editReply(
      `❌ <@${targetDiscordUser.id}> is not an active member of **${teamName}**. Only active team members can become captain.`
    );
    return;
  }

  // ── Transfer captaincy ────────────────────────────────────────────────────
  await db
    .update(teamsTable)
    .set({ captainPlayerId: targetPlayer.id, updatedAt: new Date() })
    .where(eq(teamsTable.id, teamId));

  const embed = new EmbedBuilder()
    .setColor(0xfee75c)
    .setTitle(`✅ Captain transferred — **${teamName}** [${teamTag}]`)
    .setDescription(
      `<@${targetDiscordUser.id}> is now the captain.\n` +
      `<@${discordId}> remains an active team member.`
    );

  await interaction.editReply({ embeds: [embed], components: [] });
}
