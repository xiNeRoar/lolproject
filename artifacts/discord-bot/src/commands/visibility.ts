/**
 * /visibility [match-id] <public|private|default>
 *
 * Captain controls match visibility from Discord.
 * Spec: docs/BOT_SPEC.md → /visibility
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
import {
  matchesTable,
  teamsTable,
  teamMembersTable,
  playersTable,
} from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { checkBan } from "../lib/checkBan.js";

export const data = new SlashCommandBuilder()
  .setName("visibility")
  .setDescription("Set a match's visibility.")
  .addStringOption((o) =>
    o
      .setName("setting")
      .setDescription("public = visible to all | private = team only | default = public after 7 days")
      .setRequired(true)
      .addChoices(
        { name: "public — visible to everyone now", value: "public" },
        { name: "private — team only, forever", value: "private" },
        { name: "default — public after 7 days", value: "default" }
      )
  )
  .addIntegerOption((o) =>
    o.setName("match-id").setDescription("Match ID (optional — omit to use your most recent match)").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  // ── Ban check ──────────────────────────────────────────────────────────────
  const banReason = await checkBan(interaction.user.id);
  if (banReason) {
    await interaction.editReply(`❌ Your account is currently banned: ${banReason}`);
    return;
  }


  const setting = interaction.options.getString("setting", true) as "public" | "private" | "default";
  const explicitMatchId = interaction.options.getInteger("match-id");
  const discordId = interaction.user.id;

  // ── Find invoker ──────────────────────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];
  if (!invoker) {
    await interaction.editReply("❌ You don't have a player record.");
    return;
  }

  // ── Find captain teams ────────────────────────────────────────────────────
  const captainTeams = await db
    .select({ id: teamsTable.id, name: teamsTable.name, tag: teamsTable.tag })
    .from(teamsTable)
    .where(and(eq(teamsTable.captainPlayerId, invoker.id), eq(teamsTable.isActive, true)));

  if (captainTeams.length === 0) {
    await interaction.editReply("❌ Only team captains can change match visibility.");
    return;
  }

  // ── Resolve match ID ──────────────────────────────────────────────────────
  let matchId: number;

  if (explicitMatchId) {
    matchId = explicitMatchId;
  } else {
    // Use most recent match for any of the captain's teams
    const captainTeamIds = captainTeams.map((t) => t.id);

    // Find most recent match involving any of captain's teams
    let recentMatch: typeof matchesTable.$inferSelect | undefined;
    for (const teamId of captainTeamIds) {
      const [m] = await db
        .select()
        .from(matchesTable)
        .where(or(eq(matchesTable.teamAId, teamId), eq(matchesTable.teamBId, teamId)))
        .orderBy(desc(matchesTable.createdAt))
        .limit(1);
      if (m && (!recentMatch || m.createdAt > recentMatch.createdAt)) {
        recentMatch = m;
      }
    }

    if (!recentMatch) {
      await interaction.editReply("❌ No matches found for your team(s). Submit a match first.");
      return;
    }

    matchId = recentMatch.id;
  }

  // ── Fetch match ───────────────────────────────────────────────────────────
  const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, matchId));
  if (!match) {
    await interaction.editReply(`❌ Match #${matchId} not found.`);
    return;
  }

  // ── Verify invoker is captain of a participating team ────────────────────
  const captainTeamIds = captainTeams.map((t) => t.id);
  const isParticipant =
    (match.teamAId && captainTeamIds.includes(match.teamAId)) ||
    (match.teamBId && captainTeamIds.includes(match.teamBId));

  if (!isParticipant) {
    await interaction.editReply("❌ You are not a captain of any team in this match.");
    return;
  }

  // ── Disambiguation: if multiple captain teams in this match, which controls it? ─
  // (Both captains can control visibility — this is intentional per PRD)

  // ── Apply visibility setting ──────────────────────────────────────────────
  let visibleAfter: Date | null;
  let settingLabel: string;

  switch (setting) {
    case "public":
      visibleAfter = new Date(0); // epoch = always public
      settingLabel = "🌐 Public — visible to everyone now";
      break;
    case "private":
      visibleAfter = new Date("9999-01-01");
      settingLabel = "🔒 Private — team only, permanently";
      break;
    case "default":
      visibleAfter = null; // null = 7-day auto-public
      settingLabel = "⏳ Default — public 7 days after match";
      break;
  }

  await db
    .update(matchesTable)
    .set({ visibleAfter, updatedAt: new Date() })
    .where(eq(matchesTable.id, matchId));

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`✅ Visibility updated — Match #${matchId}`)
    .setDescription(settingLabel)
    .addFields({ name: "Match", value: `${match.sideAName} vs ${match.sideBName}`, inline: true });

  await interaction.editReply({ embeds: [embed] });
}
