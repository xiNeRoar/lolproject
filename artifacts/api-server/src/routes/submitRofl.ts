/**
 * POST /api/matches/submit-rofl
 *
 * Fallback .rofl upload endpoint for files >8MB (Discord default limit).
 * Accepts raw application/octet-stream binary. Runs the same parse +
 * team-match + ELO + notification pipeline as the Discord bot /submit.
 *
 * Auth: X-Discord-Id header — player must exist and be an active member
 * of one of the teams matched in the .rofl. Mirrors bot submitter check.
 *
 * BOT_SPEC §.rofl Upload Size Constraint
 */

import { Router } from "express";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { db } from "@workspace/db";
import {
  matchesTable,
  matchPlayersTable,
  teamsTable,
  teamMembersTable,
  playersTable,
  playerBansTable,
  eloHistoryTable,
  notificationsTable,
  ladderSettingsTable,
} from "@workspace/db";
import { eq, and, inArray, or, isNull, gt } from "drizzle-orm";
import { parseRofl, RoflParseError } from "@workspace/rofl-parse";
import { matchTeams } from "@workspace/rofl-parse";
import { calculateElo } from "@workspace/rofl-parse";

const router = Router();

const MAX_ROFL_SIZE = 50 * 1024 * 1024; // 50 MB hard ceiling

// ── POST /submit-rofl ─────────────────────────────────────────────────────────

router.post(
  "/submit-rofl",
  // Parse raw binary body for this route only (not app-wide)
  (req, res, next) => {
    const contentType = req.headers["content-type"] ?? "";
    if (!contentType.startsWith("application/octet-stream")) {
      res.status(415).json({ error: "Content-Type must be application/octet-stream" });
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_ROFL_SIZE) {
        res.status(413).json({ error: `File too large. Maximum is ${MAX_ROFL_SIZE / 1024 / 1024}MB.` });
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      (req as any).rawBody = Buffer.concat(chunks);
      next();
    });
    req.on("error", () => {
      if (!res.headersSent) res.status(500).json({ error: "Upload failed" });
    });
  },
  async (req, res) => {
    try {
      const discordId = req.headers["x-discord-id"] as string | undefined;
      if (!discordId) {
        res.status(401).json({ error: "X-Discord-Id header required" });
        return;
      }

      const roflBuffer: Buffer = (req as any).rawBody;
      if (!roflBuffer || roflBuffer.length === 0) {
        res.status(400).json({ error: "Empty body" });
        return;
      }

      // ── 1. Parse .rofl ──────────────────────────────────────────────────────
      let match: ReturnType<typeof parseRofl>;
      try {
        match = parseRofl(roflBuffer);
      } catch (err) {
        if (err instanceof RoflParseError) {
          res.status(422).json({ error: err.message });
        } else {
          res.status(422).json({ error: "Could not read replay file. Is it a valid .rofl?" });
        }
        return;
      }

      // ── 2. Duplicate check ──────────────────────────────────────────────────
      const [existing] = await db
        .select({ id: matchesTable.id })
        .from(matchesTable)
        .where(eq(matchesTable.gameId, match.gameId))
        .limit(1);
      if (existing) {
        res.status(409).json({ error: `Match already submitted (Match #${existing.id})` });
        return;
      }

      // ── 3. Ban check ────────────────────────────────────────────────────────
      const allPuuids = match.players.map((p) => p.puuid).filter(Boolean);
      const allRiotIds = match.players.map((p) => p.riotId).filter(Boolean);
      const participantPlayers = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(
          or(
            allPuuids.length > 0 ? inArray(playersTable.puuid, allPuuids) : undefined,
            allRiotIds.length > 0 ? inArray(playersTable.riotId, allRiotIds) : undefined,
          )
        );

      if (participantPlayers.length > 0) {
        const ids = participantPlayers.map((p) => p.id);
        const [activeBan] = await db
          .select({ reason: playerBansTable.reason })
          .from(playerBansTable)
          .where(
            and(
              inArray(playerBansTable.playerId, ids),
              eq(playerBansTable.isActive, true),
              or(isNull(playerBansTable.expiresAt), gt(playerBansTable.expiresAt, new Date()))
            )
          )
          .limit(1);
        if (activeBan) {
          res.status(403).json({ error: `A participant is currently banned: ${activeBan.reason}` });
          return;
        }
      }

      // ── 4. Team matching ────────────────────────────────────────────────────
      const { sideA, sideB } = await matchTeams(match.blueSide, match.redSide);

      // ── 5. Submitter membership check ───────────────────────────────────────
      if (sideA.teamId || sideB.teamId) {
        const [invoker] = await db
          .select({ id: playersTable.id })
          .from(playersTable)
          .where(eq(playersTable.discordId, discordId))
          .limit(1);

        if (!invoker) {
          res.status(403).json({
            error: "You must be a registered team member to submit for an identified team.",
          });
          return;
        }

        const teamIds = [sideA.teamId, sideB.teamId].filter((id): id is number => id !== null);
        const [membership] = await db
          .select({ id: teamMembersTable.id })
          .from(teamMembersTable)
          .where(
            and(
              eq(teamMembersTable.playerId, invoker.id),
              eq(teamMembersTable.status, "active"),
              inArray(teamMembersTable.teamId, teamIds)
            )
          )
          .limit(1);

        if (!membership) {
          res.status(403).json({ error: "You can only submit replays for matches you participated in." });
          return;
        }
      }

      // ── 6. Store .rofl file ─────────────────────────────────────────────────
      const uploadDir = process.env.ROFL_UPLOAD_DIR ?? "./uploads/rofl";
      const roflFilePath = join(uploadDir, `${match.gameId}.rofl`);
      try {
        mkdirSync(uploadDir, { recursive: true });
        writeFileSync(roflFilePath, roflBuffer);
      } catch {
        console.error("[submit-rofl] Failed to store .rofl file");
      }

      // ── 7. Build display names ──────────────────────────────────────────────
      async function buildSideName(teamId: number | null, players: { riotIdGameName: string }[]): Promise<string> {
        if (teamId) {
          const [team] = await db.select({ name: teamsTable.name, tag: teamsTable.tag }).from(teamsTable).where(eq(teamsTable.id, teamId));
          if (team) return `${team.name} [${team.tag}]`;
        }
        return players[0]?.riotIdGameName ?? "Unknown";
      }

      const blueWon = match.blueSide[0]?.win ?? false;
      const sideAName = await buildSideName(sideA.teamId, match.blueSide);
      const sideBName = await buildSideName(sideB.teamId, match.redSide);
      const winnerName = blueWon ? sideAName : sideBName;

      // ── 8. Record match in transaction ──────────────────────────────────────
      const [settings] = await db.select().from(ladderSettingsTable).limit(1);
      const kFactor = settings?.kFactor ?? 32;

      let matchId!: number;
      let eloDeltas: { teamABefore: number; teamAAfter: number; teamBBefore: number; teamBAfter: number } | null = null;

      await db.transaction(async (tx) => {
        let teamAEloBefore: number | null = null;
        let teamAEloAfter: number | null = null;
        let teamBEloBefore: number | null = null;
        let teamBEloAfter: number | null = null;

        const [teamA] = sideA.teamId
          ? await tx.select({ teamElo: teamsTable.teamElo, defaultMatchVisibility: teamsTable.defaultMatchVisibility }).from(teamsTable).where(eq(teamsTable.id, sideA.teamId))
          : [undefined];
        const [teamB] = sideB.teamId
          ? await tx.select({ teamElo: teamsTable.teamElo, defaultMatchVisibility: teamsTable.defaultMatchVisibility }).from(teamsTable).where(eq(teamsTable.id, sideB.teamId))
          : [undefined];

        if (sideA.teamId && sideB.teamId) {
          const eloA = teamA?.teamElo ?? 1000;
          const eloB = teamB?.teamElo ?? 1000;
          teamAEloBefore = eloA;
          teamBEloBefore = eloB;
          teamAEloAfter = calculateElo(eloA, eloB, blueWon, kFactor);
          teamBEloAfter = calculateElo(eloB, eloA, !blueWon, kFactor);
          eloDeltas = { teamABefore: eloA, teamAAfter: teamAEloAfter, teamBBefore: eloB, teamBAfter: teamBEloAfter };
        }

        const resolvedVis = teamA?.defaultMatchVisibility ?? teamB?.defaultMatchVisibility ?? "default";
        const visibleAfter = resolvedVis === "public"
          ? new Date(0)
          : resolvedVis === "private"
            ? new Date("9999-01-01T00:00:00Z")
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        const [createdMatch] = await tx.insert(matchesTable).values({
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
        }).returning({ id: matchesTable.id });

        matchId = createdMatch!.id;

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

        if (sideA.teamId && sideB.teamId && eloDeltas) {
          const now = new Date();
          const [teamARow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses }).from(teamsTable).where(eq(teamsTable.id, sideA.teamId));
          const [teamBRow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses }).from(teamsTable).where(eq(teamsTable.id, sideB.teamId));

          await tx.update(teamsTable).set({
            teamElo: eloDeltas.teamAAfter,
            peakElo: Math.max(eloDeltas.teamAAfter, eloDeltas.teamABefore),
            wins: blueWon ? (teamARow?.wins ?? 0) + 1 : (teamARow?.wins ?? 0),
            losses: !blueWon ? (teamARow?.losses ?? 0) + 1 : (teamARow?.losses ?? 0),
            lastMatchAt: now, updatedAt: now,
          }).where(eq(teamsTable.id, sideA.teamId));

          await tx.update(teamsTable).set({
            teamElo: eloDeltas.teamBAfter,
            peakElo: Math.max(eloDeltas.teamBAfter, eloDeltas.teamBBefore),
            wins: !blueWon ? (teamBRow?.wins ?? 0) + 1 : (teamBRow?.wins ?? 0),
            losses: blueWon ? (teamBRow?.losses ?? 0) + 1 : (teamBRow?.losses ?? 0),
            lastMatchAt: now, updatedAt: now,
          }).where(eq(teamsTable.id, sideB.teamId));

          await tx.insert(eloHistoryTable).values([
            { teamId: sideA.teamId, elo: eloDeltas.teamAAfter, delta: eloDeltas.teamAAfter - eloDeltas.teamABefore, reason: "match", matchId },
            { teamId: sideB.teamId, elo: eloDeltas.teamBAfter, delta: eloDeltas.teamBAfter - eloDeltas.teamBBefore, reason: "match", matchId },
          ]);
        }

        // Notifications for known players
        const knownPlayerIds = allSidePlayers.map(({ mp }) => mp.playerId).filter((id): id is number => id !== null);
        if (knownPlayerIds.length > 0) {
          const totalSec = Math.floor(match.gameLength / 1000);
          const mins = Math.floor(totalSec / 60);
          const secs = String(totalSec % 60).padStart(2, "0");
          await tx.insert(notificationsTable).values(
            knownPlayerIds.map((playerId) => ({
              playerId,
              type: "match_result",
              title: "Match recorded",
              message: `${sideAName} vs ${sideBName} — ${winnerName} won (${mins}:${secs})`,
              entityId: matchId,
              isRead: false,
              dmSent: false,
              dmFailed: false,
            }))
          );
        }
      });

      res.status(201).json({
        matchId,
        sideAName,
        sideBName,
        winnerName,
        eloDeltas,
        bothTeamsIdentified: !!(sideA.teamId && sideB.teamId),
      });
    } catch (err) {
      console.error("[submit-rofl] Error:", err);
      res.status(500).json({ error: "Failed to record match" });
    }
  }
);

export default router;
