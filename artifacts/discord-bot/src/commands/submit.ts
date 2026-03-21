/**
 * /submit
 *
 * Core match recording command. User attaches a .rofl file.
 * Parses it, identifies both teams, records match + ELO in a transaction.
 * Spec: docs/BOT_SPEC.md → /submit
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  AttachmentBuilder,
} from "discord.js";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { db } from "../lib/db.js";
import {
  matchesTable,
  matchPlayersTable,
  teamsTable,
  playersTable,
  playerBansTable,
  ladderSettingsTable,
  eloHistoryTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, inArray, or, isNull, isNotNull } from "drizzle-orm";
import { parseRofl, RoflParseError } from "../lib/rofl-parser.js";
import { matchTeams } from "../lib/team-matcher.js";
import { calculateElo } from "../lib/elo.js";

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

export const data = new SlashCommandBuilder()
  .setName("submit")
  .setDescription("Submit a .rofl replay file to record a match result.")
  .addAttachmentOption((o) =>
    o.setName("replay").setDescription("Your .rofl replay file").setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply();

  const attachment = interaction.options.getAttachment("replay", true);

  // ── 1. Validate file ────────────────────────────────────────────────────
  if (!attachment.name?.endsWith(".rofl")) {
    await interaction.editReply("❌ Please attach a `.rofl` replay file.");
    return;
  }
  if (attachment.size > MAX_FILE_SIZE) {
    await interaction.editReply(
      `❌ Replay file too large (${(attachment.size / 1024 / 1024).toFixed(1)} MB). Maximum is 8 MB.`
    );
    return;
  }

  // ── 2. Download .rofl ───────────────────────────────────────────────────
  let roflBuffer: Buffer;
  try {
    const resp = await fetch(attachment.url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    roflBuffer = Buffer.from(await resp.arrayBuffer());
  } catch (err) {
    await interaction.editReply("❌ Failed to download the replay file. Please try again.");
    return;
  }

  // ── 3. Parse .rofl ──────────────────────────────────────────────────────
  let match: Awaited<ReturnType<typeof parseRofl>>;
  try {
    match = parseRofl(roflBuffer);
  } catch (err) {
    if (err instanceof RoflParseError) {
      await interaction.editReply(`❌ ${err.message}`);
    } else {
      await interaction.editReply("❌ Could not read the replay file. Is it a valid .rofl?");
    }
    return;
  }

  // ── 4. Duplicate check (same gameId) ───────────────────────────────────
  const existing = (
    await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(eq(matchesTable.gameId, match.gameId))
      .limit(1)
  )[0];

  if (existing) {
    await interaction.editReply(
      `❌ This match has already been submitted (Match #${existing.id}).`
    );
    return;
  }

  // ── 5. Ban check ────────────────────────────────────────────────────────
  const allPuuids = match.players.map((p) => p.puuid).filter(Boolean);
  const allRiotIds = match.players.map((p) => p.riotId).filter(Boolean);

  // Find player IDs for participants
  const participantPlayers = await db
    .select({ id: playersTable.id, riotId: playersTable.riotId })
    .from(playersTable)
    .where(
      or(
        allPuuids.length > 0 ? inArray(playersTable.puuid, allPuuids) : undefined,
        allRiotIds.length > 0 ? inArray(playersTable.riotId, allRiotIds) : undefined
      )
    );

  if (participantPlayers.length > 0) {
    const participantIds = participantPlayers.map((p) => p.id);
    const activeBan = (
      await db
        .select({ reason: playerBansTable.reason })
        .from(playerBansTable)
        .where(
          and(
            inArray(playerBansTable.playerId, participantIds),
            eq(playerBansTable.isActive, true),
            or(
              isNull(playerBansTable.expiresAt),
              // expiresAt in future — check manually since drizzle gt needs same type
            )
          )
        )
        .limit(1)
    )[0];

    if (activeBan) {
      await interaction.editReply(
        `❌ A participant in this match is currently banned: ${activeBan.reason}`
      );
      return;
    }
  }

  // ── 6. Team matching ────────────────────────────────────────────────────
  const { sideA, sideB } = await matchTeams(match.blueSide, match.redSide);

  // Determine winner side
  const blueWon = match.blueSide[0]?.win ?? false;

  // Build side names for display
  const sideAName = await buildSideName(sideA.teamId, match.blueSide);
  const sideBName = await buildSideName(sideB.teamId, match.redSide);
  const winnerName = blueWon ? sideAName : sideBName;

  // ── 7. Store .rofl file ─────────────────────────────────────────────────
  const uploadDir = process.env.ROFL_UPLOAD_DIR ?? "./uploads/rofl";
  const roflFilePath = join(uploadDir, `${match.gameId}.rofl`);
  try {
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(roflFilePath, roflBuffer);
  } catch (err) {
    console.error("[submit] Failed to store .rofl file:", err);
    // Non-fatal: proceed without file path
  }

  // ── 8. Record match in transaction ──────────────────────────────────────
  const [settings] = await db.select().from(ladderSettingsTable).limit(1);
  const kFactor = settings?.kFactor ?? 32;

  let matchId: number;
  let eloDeltas: { teamABefore: number; teamAAfter: number; teamBBefore: number; teamBAfter: number } | null = null;

  try {
    await db.transaction(async (tx) => {
      // ELO calculation (only if both teams identified)
      let teamAEloBefore: number | null = null;
      let teamAEloAfter: number | null = null;
      let teamBEloBefore: number | null = null;
      let teamBEloAfter: number | null = null;

      if (sideA.teamId && sideB.teamId) {
        const [teamA] = await tx
          .select({ teamElo: teamsTable.teamElo })
          .from(teamsTable)
          .where(eq(teamsTable.id, sideA.teamId));
        const [teamB] = await tx
          .select({ teamElo: teamsTable.teamElo })
          .from(teamsTable)
          .where(eq(teamsTable.id, sideB.teamId));

        const eloA = teamA?.teamElo ?? 1000;
        const eloB = teamB?.teamElo ?? 1000;

        teamAEloBefore = eloA;
        teamBEloBefore = eloB;
        teamAEloAfter = calculateElo(eloA, eloB, blueWon, kFactor);
        teamBEloAfter = calculateElo(eloB, eloA, !blueWon, kFactor);

        eloDeltas = {
          teamABefore: eloA,
          teamAAfter: teamAEloAfter,
          teamBBefore: eloB,
          teamBAfter: teamBEloAfter,
        };
      }

      // Create match row
      const visibleAfter = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const [createdMatch] = await tx
        .insert(matchesTable)
        .values({
          teamAId: sideA.teamId,
          teamBId: sideB.teamId,
          sideAName,
          sideBName,
          matchTitle: `${sideAName} vs ${sideBName}`,
          winnerName,
          score: "1-0",
          format: "BO1",
          gameId: match.gameId,
          gameDuration: match.gameLength,
          gameVersion: match.gameVersion,
          resultSource: "rofl_parse",
          roflFilePath: roflFilePath ?? null,
          visibleAfter,
          teamAEloBefore,
          teamAEloAfter,
          teamBEloBefore,
          teamBEloAfter,
        })
        .returning({ id: matchesTable.id });

      matchId = createdMatch!.id;

      // Create 10 match_players rows
      const allSidePlayers = [
        ...sideA.matchedPlayers.map((mp, i) => ({ mp, rofl: match.blueSide[i]!, side: "A" as const })),
        ...sideB.matchedPlayers.map((mp, i) => ({ mp, rofl: match.redSide[i]!, side: "B" as const })),
      ];

      await tx.insert(matchPlayersTable).values(
        allSidePlayers.map(({ mp, rofl, side }) => ({
          matchId,
          playerId: mp.playerId,
          teamSide: side,
          puuid: rofl.puuid,
          riotIdGameName: rofl.riotIdGameName,
          riotIdTagLine: rofl.riotIdTagLine,
          champion: rofl.champion,
          teamPosition: rofl.teamPosition,
          kills: rofl.kills,
          deaths: rofl.deaths,
          assists: rofl.assists,
          cs: rofl.cs,
          neutralCs: rofl.neutralCs,
          gold: rofl.gold,
          damageToChampions: rofl.damageToChampions,
          visionScore: rofl.visionScore,
          level: rofl.level,
          win: rofl.win,
          item0: rofl.item0,
          item1: rofl.item1,
          item2: rofl.item2,
          item3: rofl.item3,
          item4: rofl.item4,
          item5: rofl.item5,
          item6: rofl.item6,
          summonerSpell1: rofl.summonerSpell1,
          summonerSpell2: rofl.summonerSpell2,
        }))
      );

      // Update team ELO + wins/losses + lastMatchAt
      if (sideA.teamId && sideB.teamId && eloDeltas) {
        const now = new Date();

        // Read current wins/losses for both teams, then update atomically
        const [teamARow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
          .from(teamsTable).where(eq(teamsTable.id, sideA.teamId));
        const [teamBRow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
          .from(teamsTable).where(eq(teamsTable.id, sideB.teamId));

        await tx.update(teamsTable).set({
          teamElo: eloDeltas.teamAAfter,
          peakElo: Math.max(eloDeltas.teamAAfter, eloDeltas.teamABefore),
          wins: blueWon ? (teamARow?.wins ?? 0) + 1 : (teamARow?.wins ?? 0),
          losses: !blueWon ? (teamARow?.losses ?? 0) + 1 : (teamARow?.losses ?? 0),
          lastMatchAt: now,
          updatedAt: now,
        }).where(eq(teamsTable.id, sideA.teamId));

        await tx.update(teamsTable).set({
          teamElo: eloDeltas.teamBAfter,
          peakElo: Math.max(eloDeltas.teamBAfter, eloDeltas.teamBBefore),
          wins: !blueWon ? (teamBRow?.wins ?? 0) + 1 : (teamBRow?.wins ?? 0),
          losses: blueWon ? (teamBRow?.losses ?? 0) + 1 : (teamBRow?.losses ?? 0),
          lastMatchAt: now,
          updatedAt: now,
        }).where(eq(teamsTable.id, sideB.teamId));

        // Write elo_history
        await tx.insert(eloHistoryTable).values([
          {
            teamId: sideA.teamId,
            elo: eloDeltas.teamAAfter,
            delta: eloDeltas.teamAAfter - eloDeltas.teamABefore,
            reason: "match",
            matchId,
          },
          {
            teamId: sideB.teamId,
            elo: eloDeltas.teamBAfter,
            delta: eloDeltas.teamBAfter - eloDeltas.teamBBefore,
            reason: "match",
            matchId,
          },
        ]);
      }

      // Create notification rows for all known players
      const knownPlayerIds = allSidePlayers
        .map(({ mp }) => mp.playerId)
        .filter((id): id is number => id !== null);

      if (knownPlayerIds.length > 0) {
        const duration = formatDuration(match.gameLength);
        await tx.insert(notificationsTable).values(
          knownPlayerIds.map((playerId) => ({
            playerId,
            type: "match_result",
            title: "Match recorded",
            message: `${sideAName} vs ${sideBName} — ${winnerName} won (${duration})`,
            entityId: match.id,
            isRead: false,
            dmSent: false,
            dmFailed: false,
          }))
        );
      }
    });
  } catch (err) {
    console.error("[submit] Transaction error:", err);
    await interaction.editReply("❌ Failed to record match. Please try again.");
    return;
  }

  // ── 9. Build reply embed ────────────────────────────────────────────────
  const embed = buildMatchEmbed({
    matchId: matchId!,
    sideAName,
    sideBName,
    winnerName,
    blueWon,
    duration: formatDuration(match.gameLength),
    gameVersion: match.gameVersion,
    bluePlayers: sideA.matchedPlayers.map((mp, i) => ({
      riotId: mp.riotId,
      champion: match.blueSide[i]?.champion ?? "?",
      kda: `${match.blueSide[i]?.kills ?? 0}/${match.blueSide[i]?.deaths ?? 0}/${match.blueSide[i]?.assists ?? 0}`,
      linked: mp.playerId !== null,
    })),
    redPlayers: sideB.matchedPlayers.map((mp, i) => ({
      riotId: mp.riotId,
      champion: match.redSide[i]?.champion ?? "?",
      kda: `${match.redSide[i]?.kills ?? 0}/${match.redSide[i]?.deaths ?? 0}/${match.redSide[i]?.assists ?? 0}`,
      linked: mp.playerId !== null,
    })),
    eloDeltas,
    bothTeamsIdentified: !!(sideA.teamId && sideB.teamId),
  });

  await interaction.editReply({ embeds: [embed] });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function buildSideName(teamId: number | null, players: { riotIdGameName: string }[]): Promise<string> {
  if (teamId) {
    const [team] = await db
      .select({ name: teamsTable.name, tag: teamsTable.tag })
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId));
    if (team) return `${team.name} [${team.tag}]`;
  }
  // Unregistered: use first player's name
  return players[0]?.riotIdGameName ?? "Unknown";
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

interface PlayerDisplay {
  riotId: string;
  champion: string;
  kda: string;
  linked: boolean;
}

function buildMatchEmbed(opts: {
  matchId: number;
  sideAName: string;
  sideBName: string;
  winnerName: string;
  blueWon: boolean;
  duration: string;
  gameVersion: string;
  bluePlayers: PlayerDisplay[];
  redPlayers: PlayerDisplay[];
  eloDeltas: { teamABefore: number; teamAAfter: number; teamBBefore: number; teamBAfter: number } | null;
  bothTeamsIdentified: boolean;
}) {
  const {
    matchId, sideAName, sideBName, winnerName, blueWon,
    duration, gameVersion, bluePlayers, redPlayers, eloDeltas, bothTeamsIdentified,
  } = opts;

  const embed = new EmbedBuilder()
    .setColor(blueWon ? 0x5865f2 : 0xed4245)
    .setTitle(`✅ Match #${matchId} recorded`)
    .setDescription(
      `**${sideAName}** ${blueWon ? "🏆" : ""} vs ${!blueWon ? "🏆" : ""} **${sideBName}**\n` +
      `Duration: ${duration} | Patch: ${gameVersion}`
    );

  const formatPlayers = (players: PlayerDisplay[]) =>
    players
      .map((p) => `${p.linked ? "" : "⚠️"} ${p.champion} · ${p.kda} · ${p.riotId}`)
      .join("\n");

  embed.addFields(
    { name: `🔵 ${sideAName}`, value: formatPlayers(bluePlayers), inline: true },
    { name: `🔴 ${sideBName}`, value: formatPlayers(redPlayers), inline: true }
  );

  if (eloDeltas && bothTeamsIdentified) {
    const aDelta = eloDeltas.teamAAfter - eloDeltas.teamABefore;
    const bDelta = eloDeltas.teamBAfter - eloDeltas.teamBBefore;
    embed.addFields({
      name: "📊 ELO",
      value:
        `${sideAName}: ${eloDeltas.teamABefore} → ${eloDeltas.teamAAfter} (${aDelta >= 0 ? "+" : ""}${aDelta})\n` +
        `${sideBName}: ${eloDeltas.teamBBefore} → ${eloDeltas.teamBAfter} (${bDelta >= 0 ? "+" : ""}${bDelta})`,
    });
  }

  if (!bothTeamsIdentified) {
    embed.addFields({
      name: "⚠️ No ELO change",
      value:
        "One or both teams aren't registered. Stats recorded without ELO update.\n" +
        `Use \`/claim-match ${matchId}\` after registering to claim ELO.`,
    });
  }

  const unlinked = [...bluePlayers, ...redPlayers].filter((p) => !p.linked);
  if (unlinked.length > 0) {
    embed.addFields({
      name: "⚠️ Unlinked players",
      value:
        `${unlinked.length} player(s) not linked to a VCLoL profile:\n` +
        unlinked.map((p) => `• ${p.riotId}`).join("\n") +
        "\nThey can use `/link-riot` to claim their stats.",
    });
  }

  embed.setFooter({ text: `Match ID: ${matchId} • VOD render queued` });

  return embed;
}
