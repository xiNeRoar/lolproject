/**
 * Match recorder — DB transaction for recording a match from .rofl data.
 * Creates match row + 10 match_players + W/L updates + notifications.
 * Extracted from submit.ts for maintainability.
 */

import { db } from "./db.js";
import {
  matchesTable,
  matchPlayersTable,
  teamsTable,
  notificationsTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import type { SideMatch } from "./team-matcher.js";
import type { RoflMatch } from "./rofl-parser.js";
import { formatDuration } from "./submitHelpers.js";

export interface RecordMatchInput {
  match: RoflMatch;
  sideA: SideMatch;
  sideB: SideMatch;
  sideAName: string;
  sideBName: string;
  winnerName: string;
  blueWon: boolean;
  roflFilePath: string | null;
}

/**
 * Record a match in the database. Returns the new match ID.
 * Throws on duplicate gameId (caller handles 23505).
 */
export async function recordMatch(input: RecordMatchInput): Promise<number> {
  const { match, sideA, sideB, sideAName, sideBName, winnerName, blueWon, roflFilePath } = input;

  let matchId!: number;

  await db.transaction(async (tx) => {
    // Fetch team visibility settings
    const [teamA] = sideA.teamId
      ? await tx
          .select({ defaultMatchVisibility: teamsTable.defaultMatchVisibility })
          .from(teamsTable).where(eq(teamsTable.id, sideA.teamId))
      : [undefined];
    const [teamB] = sideB.teamId
      ? await tx
          .select({ defaultMatchVisibility: teamsTable.defaultMatchVisibility })
          .from(teamsTable).where(eq(teamsTable.id, sideB.teamId))
      : [undefined];

    // Derive visibleAfter (v3.1: public or private only, default private)
    const resolvedVis = teamA?.defaultMatchVisibility ?? teamB?.defaultMatchVisibility ?? "private";
    const visibleAfter = resolvedVis === "public"
      ? new Date(0)
      : new Date("9999-01-01T00:00:00Z");

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
        matchType: "scrim",
        resultSource: "rofl_parse",
        roflFilePath: roflFilePath ?? null,
        visibleAfter,
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

    // Update wins/losses + lastMatchAt (v3.1: no ELO for scrims)
    if (sideA.teamId && sideB.teamId) {
      const now = new Date();
      // FOR UPDATE: prevent lost W/L updates from concurrent submissions (D-09)
      const [teamARow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
        .from(teamsTable).where(eq(teamsTable.id, sideA.teamId)).for("update");
      const [teamBRow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
        .from(teamsTable).where(eq(teamsTable.id, sideB.teamId)).for("update");

      await tx.update(teamsTable).set({
        wins: blueWon ? (teamARow?.wins ?? 0) + 1 : (teamARow?.wins ?? 0),
        losses: !blueWon ? (teamARow?.losses ?? 0) + 1 : (teamARow?.losses ?? 0),
        lastMatchAt: now, updatedAt: now,
      }).where(eq(teamsTable.id, sideA.teamId));

      await tx.update(teamsTable).set({
        wins: !blueWon ? (teamBRow?.wins ?? 0) + 1 : (teamBRow?.wins ?? 0),
        losses: blueWon ? (teamBRow?.losses ?? 0) + 1 : (teamBRow?.losses ?? 0),
        lastMatchAt: now, updatedAt: now,
      }).where(eq(teamsTable.id, sideB.teamId));
    }

    // Notifications for all known players
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
          entityId: matchId,
          isRead: false,
          dmSent: false,
          dmFailed: false,
        }))
      );
    }
  });

  return matchId;
}
