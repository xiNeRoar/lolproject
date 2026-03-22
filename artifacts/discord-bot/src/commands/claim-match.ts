/**
 * /claim-match <matchId>
 *
 * Captain claims their team for an unregistered side of a match.
 * Calculates ELO retroactively if both sides become known.
 * Spec: docs/BOT_SPEC.md → /claim-match
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
  matchPlayersTable,
  teamMembersTable,
  playersTable,
  teamsTable,
  eloHistoryTable,
  ladderSettingsTable,
} from "@workspace/db";
import { eq, and, inArray, isNull, or } from "drizzle-orm";
import { calculateElo } from "../lib/elo.js";

export const data = new SlashCommandBuilder()
  .setName("claim-match")
  .setDescription("Claim an unregistered side of a recorded match for your team.")
  .addIntegerOption((o) =>
    o.setName("match-id").setDescription("Match ID to claim").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const matchId = interaction.options.getInteger("match-id", true);
  const discordId = interaction.user.id;

  // ── Find invoker's player record ─────────────────────────────────────────
  const invoker = (
    await db.select().from(playersTable).where(eq(playersTable.discordId, discordId)).limit(1)
  )[0];

  if (!invoker) {
    await interaction.editReply("❌ You don't have a player record. Ask a captain to `/add` you.");
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

  // ── Find the match ────────────────────────────────────────────────────────
  const [match] = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.id, matchId));

  if (!match) {
    await interaction.editReply(`❌ Match #${matchId} not found.`);
    return;
  }

  // ── Check there's an unregistered side ───────────────────────────────────
  const hasNullA = match.teamAId === null;
  const hasNullB = match.teamBId === null;

  if (!hasNullA && !hasNullB) {
    await interaction.editReply("❌ This match already has both teams assigned.");
    return;
  }

  // ── Determine which team to claim with ───────────────────────────────────
  let claimTeamId: number;
  let claimTeamName: string;
  let claimTeamTag: string;

  if (captainTeams.length === 1) {
    claimTeamId = captainTeams[0]!.id;
    claimTeamName = captainTeams[0]!.name;
    claimTeamTag = captainTeams[0]!.tag;
  } else {
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("claim_team_select")
      .setPlaceholder("Which team is claiming this match?")
      .addOptions(captainTeams.map((t) => ({ label: `${t.name} [${t.tag}]`, value: String(t.id) })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);
    const reply = await interaction.editReply({ content: "Which team is claiming this match?", components: [row] });

    try {
      const sel = await reply.awaitMessageComponent({
        componentType: ComponentType.StringSelect,
        filter: (i: StringSelectMenuInteraction) => i.user.id === discordId,
        time: 30_000,
      });
      await sel.deferUpdate();
      const chosen = captainTeams.find((t) => String(t.id) === sel.values[0]);
      if (!chosen) { await interaction.editReply({ content: "❌ Invalid selection.", components: [] }); return; }
      claimTeamId = chosen.id;
      claimTeamName = chosen.name;
      claimTeamTag = chosen.tag;
    } catch {
      await interaction.editReply({ content: "❌ Timed out.", components: [] });
      return;
    }
  }

  // ── Get team members' PUUIDs ──────────────────────────────────────────────
  const members = await db
    .select({ puuid: playersTable.puuid, playerId: playersTable.id })
    .from(teamMembersTable)
    .innerJoin(playersTable, eq(teamMembersTable.playerId, playersTable.id))
    .where(and(eq(teamMembersTable.teamId, claimTeamId), eq(teamMembersTable.status, "active")));

  const memberPuuids = members.map((m) => m.puuid).filter((p): p is string => Boolean(p));

  // ── Count PUUID matches in the unclaimed side ─────────────────────────────
  const unclaimedSide = hasNullA ? "A" : "B";
  const matchPlayers = await db
    .select({ puuid: matchPlayersTable.puuid })
    .from(matchPlayersTable)
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.teamSide, unclaimedSide)
    ));

  const matchPuuids = matchPlayers.map((mp) => mp.puuid).filter(Boolean);
  const overlap = memberPuuids.filter((p) => matchPuuids.includes(p));

  if (overlap.length < 3) {
    await interaction.editReply(
      `❌ Your team only matches ${overlap.length}/5 players on the unclaimed side (need 3+). ` +
      `Make sure your team members have run \`/link-riot\`.`
    );
    return;
  }

  // ── Assign team to unclaimed side ─────────────────────────────────────────
  const update = hasNullA ? { teamAId: claimTeamId } : { teamBId: claimTeamId };
  await db.update(matchesTable).set({ ...update, updatedAt: new Date() }).where(eq(matchesTable.id, matchId));

  // ── Calculate retroactive ELO if both sides now known ────────────────────
  const updatedTeamAId = hasNullA ? claimTeamId : match.teamAId!;
  const updatedTeamBId = hasNullB ? claimTeamId : match.teamBId!;

  let eloText = "";

  if (updatedTeamAId && updatedTeamBId) {
    const [teamA] = await db.select().from(teamsTable).where(eq(teamsTable.id, updatedTeamAId));
    const [teamB] = await db.select().from(teamsTable).where(eq(teamsTable.id, updatedTeamBId));
    const [settings] = await db.select().from(ladderSettingsTable).limit(1);
    const kFactor = settings?.kFactor ?? 32;

    const eloA = teamA?.teamElo ?? 1000;
    const eloB = teamB?.teamElo ?? 1000;

    // Determine winner from match data.
    // sideAName always = blue side name (set at match creation from .rofl).
    // teamAWon = blueWon regardless of which side was claimed — Side A is always blue.
    const blueWon = match.winnerName === match.sideAName;
    const teamAWon = blueWon;

    const newEloA = calculateElo(eloA, eloB, teamAWon, kFactor);
    const newEloB = calculateElo(eloB, eloA, !teamAWon, kFactor);
    const deltaA = newEloA - eloA;
    const deltaB = newEloB - eloB;

    await db.transaction(async (tx) => {
      await tx.update(matchesTable).set({
        teamAEloBefore: eloA, teamAEloAfter: newEloA,
        teamBEloBefore: eloB, teamBEloAfter: newEloB,
        updatedAt: new Date(),
      }).where(eq(matchesTable.id, matchId));

      const now = new Date();
      await tx.update(teamsTable).set({
        teamElo: newEloA,
        peakElo: Math.max(newEloA, eloA),
        wins: teamAWon ? (teamA?.wins ?? 0) + 1 : (teamA?.wins ?? 0),
        losses: !teamAWon ? (teamA?.losses ?? 0) + 1 : (teamA?.losses ?? 0),
        lastMatchAt: now, updatedAt: now,
      }).where(eq(teamsTable.id, updatedTeamAId));

      await tx.update(teamsTable).set({
        teamElo: newEloB,
        peakElo: Math.max(newEloB, eloB),
        wins: !teamAWon ? (teamB?.wins ?? 0) + 1 : (teamB?.wins ?? 0),
        losses: teamAWon ? (teamB?.losses ?? 0) + 1 : (teamB?.losses ?? 0),
        lastMatchAt: now, updatedAt: now,
      }).where(eq(teamsTable.id, updatedTeamBId));

      await tx.insert(eloHistoryTable).values([
        { teamId: updatedTeamAId, elo: newEloA, delta: deltaA, reason: "match", matchId },
        { teamId: updatedTeamBId, elo: newEloB, delta: deltaB, reason: "match", matchId },
      ]);
    });

    const aName = teamA?.name ?? "Team A";
    const bName = teamB?.name ?? "Team B";
    eloText =
      `\n\n📊 **ELO updated:**\n` +
      `${aName}: ${eloA} → ${newEloA} (${deltaA >= 0 ? "+" : ""}${deltaA})\n` +
      `${bName}: ${eloB} → ${newEloB} (${deltaB >= 0 ? "+" : ""}${deltaB})`;
  }

  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`✅ Match #${matchId} claimed`)
    .setDescription(
      `**${claimTeamName} [${claimTeamTag}]** claimed the ${unclaimedSide === "A" ? "blue" : "red"} side.` +
      eloText
    );

  await interaction.editReply({ embeds: [embed], components: [] });
}
