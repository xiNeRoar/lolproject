import { Router } from "express";
import { db } from "@workspace/db";
import {
  matchesTable,
  matchPlayersTable,
  teamsTable,
  teamMembersTable,
  eventsTable,
  vodEntriesTable,
  eventRegistrationsTable,
  ladderSettingsTable,
  eloHistoryTable,
  playersTable,
} from "@workspace/db";
import { eq, desc, and, inArray, or, count, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { calculateElo } from "../lib/elo";
import { checkMatchBadges, checkClimberBadge } from "../lib/badges";
import { logAdminAction } from "../lib/auditLog";
import { isMatchVisibleTo, checkMatchParticipant, redactMatchForNonParticipant, filterMatchPlayersByOptIn } from "../lib/privacyGate.js";
import { formatMatch } from "../lib/formatters.js";

const router = Router();

// NOTE: visibleAfter = null means PRIVATE (D-11). Not 7-day default.
// All visibility logic uses shared privacyGate.ts helpers (D-14).

// ── Formatters ───────────────────────────────────────────────

function formatMatchPlayer(
  mp: typeof matchPlayersTable.$inferSelect,
  playerRiotId?: string | null
) {
  return {
    id: mp.id,
    matchId: mp.matchId,
    playerId: mp.playerId ?? null,
    playerRiotId: playerRiotId ?? null,
    teamSide: mp.teamSide,
    champion: mp.champion ?? null,
    teamPosition: mp.teamPosition ?? null,
    kills: mp.kills,
    deaths: mp.deaths,
    assists: mp.assists,
    cs: mp.cs,
    neutralCs: mp.neutralCs,
    gold: mp.gold,
    damageToChampions: mp.damageToChampions,
    visionScore: mp.visionScore,
    level: mp.level ?? null,
    win: mp.win,
    item0: mp.item0 ?? null,
    item1: mp.item1 ?? null,
    item2: mp.item2 ?? null,
    item3: mp.item3 ?? null,
    item4: mp.item4 ?? null,
    item5: mp.item5 ?? null,
    item6: mp.item6 ?? null,
    summonerSpell1: mp.summonerSpell1 ?? null,
    summonerSpell2: mp.summonerSpell2 ?? null,
    createdAt: mp.createdAt.toISOString(),
  };
}

/** Apply ELO update for both teams inside a transaction. */
/**
 * Update wins/losses/lastMatchAt for both teams. Called for ALL match types.
 * Separated from ELO to enforce PRD v3.1 §8: scrims update record only.
 */
async function updateTeamRecord(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  teamAId: number,
  teamBId: number,
  winnerName: string,
  sideAName: string
): Promise<void> {
  const teamAWon = winnerName === sideAName;
  const now = new Date();

  await tx
    .update(teamsTable)
    .set({
      wins: sql`${teamsTable.wins} + ${teamAWon ? 1 : 0}`,
      losses: sql`${teamsTable.losses} + ${teamAWon ? 0 : 1}`,
      lastMatchAt: now,
      updatedAt: now,
    })
    .where(eq(teamsTable.id, teamAId));

  await tx
    .update(teamsTable)
    .set({
      wins: sql`${teamsTable.wins} + ${teamAWon ? 0 : 1}`,
      losses: sql`${teamsTable.losses} + ${teamAWon ? 1 : 0}`,
      lastMatchAt: now,
      updatedAt: now,
    })
    .where(eq(teamsTable.id, teamBId));
}

/**
 * Calculate and apply ELO changes for both teams. ONLY for tournament/event matches.
 * PRD v3.1 §8: "Scrim (.rofl) does NOT count ELO."
 */
async function applyTeamElo(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  matchId: number,
  teamAId: number,
  teamBId: number,
  winnerName: string,
  sideAName: string,
  kFactor: number
): Promise<{ teamABefore: number; teamAAfter: number; teamBBefore: number; teamBAfter: number }> {
  // FOR UPDATE: acquire row-level locks to prevent lost updates from
  // concurrent match submissions for the same team (industry standard
  // pessimistic locking pattern for read-compute-write in transactions).
  const [teamA] = await tx
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamAId))
    .for("update");
  const [teamB] = await tx
    .select()
    .from(teamsTable)
    .where(eq(teamsTable.id, teamBId))
    .for("update");

  if (!teamA || !teamB) throw new Error("Team not found for ELO update");

  const teamAWon = winnerName === sideAName;
  const teamABefore = teamA.teamElo;
  const teamBBefore = teamB.teamElo;
  const teamAAfter = calculateElo(teamABefore, teamBBefore, teamAWon, kFactor);
  const teamBAfter = calculateElo(teamBBefore, teamABefore, !teamAWon, kFactor);

  await tx
    .update(teamsTable)
    .set({
      teamElo: teamAAfter,
      peakElo: Math.max(teamA.peakElo, teamAAfter),
    })
    .where(eq(teamsTable.id, teamAId));

  await tx
    .update(teamsTable)
    .set({
      teamElo: teamBAfter,
      peakElo: Math.max(teamB.peakElo, teamBAfter),
    })
    .where(eq(teamsTable.id, teamBId));

  await tx.insert(eloHistoryTable).values([
    {
      teamId: teamAId,
      elo: teamAAfter,
      delta: teamAAfter - teamABefore,
      matchId,
      reason: "match",
    },
    {
      teamId: teamBId,
      elo: teamBAfter,
      delta: teamBAfter - teamBBefore,
      matchId,
      reason: "match",
    },
  ]);

  return { teamABefore, teamAAfter, teamBBefore, teamBAfter };
}

// ── Routes ───────────────────────────────────────────────────

// GET /matches — list matches with optional filters
router.get("/", async (req, res) => {
  try {
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;
    const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string) : null;
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;
    const playerId = req.query.playerId ? parseInt(req.query.playerId as string) : null; // #110
    const search = req.query.search as string | undefined;

    let rows = await db
      .select({
        match: matchesTable,
        teamAName: { name: teamsTable.name, tag: teamsTable.tag },
        eventTitle: eventsTable.title,
      })
      .from(matchesTable)
      .leftJoin(teamsTable, eq(matchesTable.teamAId, teamsTable.id))
      .leftJoin(eventsTable, eq(matchesTable.eventId, eventsTable.id))
      .orderBy(desc(matchesTable.createdAt));

    // In-memory filters for teamB and search (avoids complex joins)
    let filtered = rows;
    if (eventId) filtered = filtered.filter((r) => r.match.eventId === eventId);
    if (seasonId) filtered = filtered.filter((r) => r.match.seasonId === seasonId);
    if (teamId)
      filtered = filtered.filter(
        (r) => r.match.teamAId === teamId || r.match.teamBId === teamId
      );
    if (playerId) {
      const playerMatchIds = new Set(
        (await db
          .select({ matchId: matchPlayersTable.matchId })
          .from(matchPlayersTable)
          .where(eq(matchPlayersTable.playerId, playerId))
        ).map((r) => r.matchId)
      );
      filtered = filtered.filter((r) => playerMatchIds.has(r.match.id));
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.match.matchTitle.toLowerCase().includes(s) ||
          r.match.sideAName.toLowerCase().includes(s) ||
          r.match.sideBName.toLowerCase().includes(s)
      );
    }

    // Fetch Team B names separately (inArray avoids complex self-join on teams)
    const teamBIds = [...new Set(filtered.map((r) => r.match.teamBId).filter(Boolean))] as number[];

    // Fetch vodCount per match (#118)
    const matchIds = filtered.map((r) => r.match.id);
    const vodCountMap: Record<number, number> = {};
    if (matchIds.length > 0) {
      const vodCounts = await db
        .select({ matchId: vodEntriesTable.matchId, cnt: count() })
        .from(vodEntriesTable)
        .where(inArray(vodEntriesTable.matchId, matchIds))
        .groupBy(vodEntriesTable.matchId);
      for (const vc of vodCounts) {
        if (vc.matchId != null) vodCountMap[vc.matchId] = Number(vc.cnt);
      }
    }
    const teamBMap: Record<number, { name: string; tag: string }> = {};
    if (teamBIds.length > 0) {
      const teamBRows = await db
        .select()
        .from(teamsTable)
        .where(inArray(teamsTable.id, teamBIds));
      for (const t of teamBRows) teamBMap[t.id] = { name: t.name, tag: t.tag };
    }

    // Strip sensitive fields from non-admin responses (Pitfall 5)
    const isAdmin = !!req.session.adminId;
    res.json(
      filtered.map((r) => {
        const formatted = {
          ...formatMatch(r.match, {
            teamAName: r.teamAName?.name ?? null,
            teamATag: r.teamAName?.tag ?? null,
            teamBName: teamBMap[r.match.teamBId ?? -1]?.name ?? null,
            teamBTag: teamBMap[r.match.teamBId ?? -1]?.tag ?? null,
            eventTitle: r.eventTitle ?? null,
          }),
          vodCount: vodCountMap[r.match.id] ?? 0,
        };
        if (!isAdmin) {
          delete formatted.roflFilePath;
          delete formatted.visibleAfter;
        }
        return formatted;
      })
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

// POST /matches — create match manually (admin), applies team ELO if both teams given
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      teamAId,
      teamBId,
      matchTitle,
      sideAName,
      sideBName,
      winnerName,
      score,
      format,
      resultSource,
      matchType,
      tournamentCode,
      eventId,
      seasonId,
      isPlayoff,
      round,
      bracketSlot,
      isLosersBracket,
    } = req.body as {
      teamAId?: number | null;
      teamBId?: number | null;
      matchTitle?: string;
      sideAName?: string;
      sideBName?: string;
      winnerName?: string;
      score?: string | null;
      format?: string | null;
      resultSource?: string | null;
      matchType?: string | null;
      tournamentCode?: string | null;
      eventId?: number | null;
      seasonId?: number | null;
      isPlayoff?: boolean | null;
      round?: number | null;
      bracketSlot?: number | null;
      isLosersBracket?: boolean | null;
    };

    if (!matchTitle || !sideAName || !sideBName || !winnerName) {
      res.status(400).json({ error: "matchTitle, sideAName, sideBName, and winnerName are required" });
      return;
    }
    if (!validateScore(format, score)) {
      res.status(400).json({ error: scoreError(format!) });
      return;
    }

    const resolvedMatchType = matchType ?? "scrim";
    const eloEligible = resolvedMatchType === "ranked_tournament" || resolvedMatchType === "event";

    const [settings] = await db.select().from(ladderSettingsTable).limit(1);
    const kFactor = settings?.kFactor ?? 32;

    let createdMatchId: number;
    let eloSnapshot = {
      teamAEloBefore: null as number | null,
      teamAEloAfter: null as number | null,
      teamBEloBefore: null as number | null,
      teamBEloAfter: null as number | null,
    };

    await db.transaction(async (tx) => {
      const [match] = await tx
        .insert(matchesTable)
        .values({
          teamAId: teamAId ? Number(teamAId) : null,
          teamBId: teamBId ? Number(teamBId) : null,
          matchTitle,
          sideAName,
          sideBName,
          winnerName,
          score: score ?? null,
          format: format ?? null,
          resultSource: resultSource ?? "admin_manual",
          matchType: resolvedMatchType,
          tournamentCode: tournamentCode ?? null,
          eventId: eventId ? Number(eventId) : null,
          seasonId: seasonId ? Number(seasonId) : null,
          isPlayoff: isPlayoff ?? false,
          round: round ?? null,
          bracketSlot: bracketSlot ?? null,
          isLosersBracket: isLosersBracket ?? false,
        })
        .returning();

      createdMatchId = match!.id;

      // Always update wins/losses for both teams (PRD v3.1 §8)
      if (teamAId && teamBId) {
        await updateTeamRecord(tx, Number(teamAId), Number(teamBId), winnerName, sideAName);

        // ELO only for tournament/event matches (PRD v3.1 §8)
        if (eloEligible) {
          const elo = await applyTeamElo(
            tx,
            createdMatchId,
            Number(teamAId),
            Number(teamBId),
            winnerName,
            sideAName,
            kFactor
          );
          eloSnapshot = {
            teamAEloBefore: elo.teamABefore,
            teamAEloAfter: elo.teamAAfter,
            teamBEloBefore: elo.teamBBefore,
            teamBEloAfter: elo.teamBAfter,
          };
        }

        // Back-fill ELO snapshot on the match row
        await tx
          .update(matchesTable)
          .set(eloSnapshot)
          .where(eq(matchesTable.id, createdMatchId));
      }
    });

    // Fire badge checks async (non-blocking)
    checkMatchBadges(createdMatchId!).catch((err) =>
      console.error("[badges] Error checking match badges:", err)
    );
    // Check climber badge for both teams (if identified)
    for (const tid of [teamAId, teamBId].filter(Boolean) as number[]) {
      checkClimberBadge(tid).catch((err) =>
        console.error("[badges] Error checking climber badge:", err)
      );
    }

    const [created] = await db.select().from(matchesTable).where(eq(matchesTable.id, createdMatchId!));
    res.status(201).json(formatMatch(created!));
    logAdminAction(req.session.adminId!, "create", "match", createdMatchId!, `Created match "${matchTitle}"`);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A match with this gameId already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create match" });
  }
});

// GET /matches/:id — match detail with match_players and vods
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    // ── Visibility gate (D-01, D-03, D-05) ─────────────────────────────────
    // Uses shared privacyGate.ts helpers — match_players for participant check (D-03).
    const isAdmin = !!req.session.adminId;
    const pid = req.session.playerId ? Number(req.session.playerId) : null;
    const { canSeeStats, isParticipant } = await isMatchVisibleTo(match, pid, isAdmin);

    // Always enrich team names (needed for basic match info)
    const teamA = match.teamAId
      ? (await db.select().from(teamsTable).where(eq(teamsTable.id, match.teamAId)))[0]
      : null;
    const teamB = match.teamBId
      ? (await db.select().from(teamsTable).where(eq(teamsTable.id, match.teamBId)))[0]
      : null;
    const event = match.eventId
      ? (await db.select().from(eventsTable).where(eq(eventsTable.id, match.eventId)))[0]
      : null;

    // bracketSize: round up team registrations to nearest power of 2 (#111)
    let bracketSize: number | null = null;
    if (match.isPlayoff && match.eventId) {
      const [regCount] = await db
        .select({ cnt: count() })
        .from(eventRegistrationsTable)
        .where(eq(eventRegistrationsTable.eventId, match.eventId));
      const n = Number(regCount?.cnt ?? 0);
      if (n >= 2) bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
    }

    const base = formatMatch(match, {
      teamAName: teamA?.name ?? null, teamATag: teamA?.tag ?? null,
      teamBName: teamB?.name ?? null, teamBTag: teamB?.tag ?? null,
      eventTitle: event?.title ?? null, eventSlug: event?.slug ?? null,
    });

    if (!canSeeStats) {
      // Redacted: team names + score + date + duration only (D-01, D-02)
      res.json(redactMatchForNonParticipant(base));
      return;
    }

    const mpRows = await db
      .select({ mp: matchPlayersTable, playerRiotId: playersTable.riotId })
      .from(matchPlayersTable)
      .leftJoin(playersTable, eq(matchPlayersTable.playerId, playersTable.id))
      .where(eq(matchPlayersTable.matchId, id))
      .orderBy(matchPlayersTable.teamSide, matchPlayersTable.id);

    // D-04: For public scrims viewed by non-participants, mask per-player stats
    // for players without rsoOptIn
    let matchPlayers = mpRows.map((r) => formatMatchPlayer(r.mp, r.playerRiotId ?? null));
    const isPublicScrimNonParticipant =
      match.matchType !== "ranked_tournament" &&
      match.matchType !== "event" &&
      !isParticipant &&
      !isAdmin;
    if (isPublicScrimNonParticipant) {
      matchPlayers = await filterMatchPlayersByOptIn(matchPlayers, isParticipant);
    }

    // Join players to surface playerRiotId per VOD (#117)
    const vodRows = await db
      .select({ v: vodEntriesTable, playerRiotId: playersTable.riotId })
      .from(vodEntriesTable)
      .leftJoin(playersTable, eq(vodEntriesTable.playerId, playersTable.id))
      .where(eq(vodEntriesTable.matchId, id));

    res.json({
      ...base,
      bracketSize,
      matchPlayers,
      vods: vodRows.map(({ v, playerRiotId }) => ({
        id: v.id, matchId: v.matchId ?? null, title: v.title,
        videoUrl: v.videoUrl, champion: v.champion ?? null,
        playerId: v.playerId ?? null, playerRiotId: playerRiotId ?? null,
        position: v.position ?? null, roleTag: v.roleTag ?? null,
        gameNumber: v.gameNumber ?? null, vodType: v.vodType ?? null,
        createdAt: v.createdAt.toISOString(), updatedAt: v.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch match" });
  }
});

// PUT /matches/:id — update match (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const {
      teamAId,
      teamBId,
      matchTitle,
      sideAName,
      sideBName,
      winnerName,
      score,
      format,
      resultSource,
      eventId,
      seasonId,
      isPlayoff,
      round,
      bracketSlot,
      isLosersBracket,
    } = req.body as Partial<typeof matchesTable.$inferInsert>;

    const updates: Partial<typeof matchesTable.$inferInsert> = { updatedAt: new Date() };
    if (teamAId !== undefined) updates.teamAId = teamAId;
    if (teamBId !== undefined) updates.teamBId = teamBId;
    if (matchTitle !== undefined) updates.matchTitle = matchTitle;
    if (sideAName !== undefined) updates.sideAName = sideAName;
    if (sideBName !== undefined) updates.sideBName = sideBName;
    if (winnerName !== undefined) updates.winnerName = winnerName;
    if (score !== undefined) updates.score = score;
    if (format !== undefined) updates.format = format;
    if (resultSource !== undefined) updates.resultSource = resultSource;
    if (eventId !== undefined) updates.eventId = eventId;
    if (seasonId !== undefined) updates.seasonId = seasonId;
    if (isPlayoff !== undefined) updates.isPlayoff = isPlayoff;
    if (round !== undefined) updates.round = round;
    if (bracketSlot !== undefined) updates.bracketSlot = bracketSlot;
    if (isLosersBracket !== undefined) updates.isLosersBracket = isLosersBracket;

    if (!validateScore(updates.format as string, updates.score as string)) {
      res.status(400).json({ error: scoreError(updates.format as string) });
      return;
    }

    const [row] = await db
      .update(matchesTable)
      .set(updates)
      .where(eq(matchesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Match not found" });
      return;
    }
    res.json(formatMatch(row));
    logAdminAction(req.session.adminId!, "update", "match", row.id, `Updated match "${row.matchTitle}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to update match" });
  }
});

// DELETE /matches/:id — delete match (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(matchesTable).where(eq(matchesTable.id, id));
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "delete", "match", id, `Deleted match #${id}`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete match" });
  }
});

// GET /matches/:id/players — per-player stats (visibility-gated)
router.get("/:id/players", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    // Visibility gate: uses shared privacyGate.ts helpers (D-14)
    const isAdmin = !!req.session.adminId;
    const pid = req.session.playerId ? Number(req.session.playerId) : null;
    const { canSeeStats, isParticipant } = await isMatchVisibleTo(match, pid, isAdmin);

    if (!canSeeStats) {
      // Return empty array — consistent with GET /:id redacted response
      res.json([]);
      return;
    }

    const rows = await db
      .select({
        mp: matchPlayersTable,
        playerRiotId: playersTable.riotId,
      })
      .from(matchPlayersTable)
      .leftJoin(playersTable, eq(matchPlayersTable.playerId, playersTable.id))
      .where(eq(matchPlayersTable.matchId, id))
      .orderBy(matchPlayersTable.teamSide, matchPlayersTable.id);

    // D-04: Apply per-player RSO opt-in filtering for non-participant scrim viewers
    let matchPlayers = rows.map((r) => formatMatchPlayer(r.mp, r.playerRiotId ?? null));
    const isPublicScrimNonParticipant =
      match.matchType !== "ranked_tournament" &&
      match.matchType !== "event" &&
      !isParticipant &&
      !isAdmin;
    if (isPublicScrimNonParticipant) {
      matchPlayers = await filterMatchPlayersByOptIn(matchPlayers, isParticipant);
    }

    res.json(matchPlayers);
  } catch (err) {
    console.error("[matches]", err);
    res.status(500).json({ error: "Failed to fetch match players" });
  }
});

// GET /matches/:id/replay — download the .rofl file (2-week window)
router.get("/:id/replay", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match || !match.roflFilePath) {
      res.status(404).json({ error: "Replay file not found" });
      return;
    }

    // Visibility gate: uses shared privacyGate.ts helpers (D-14, D-15)
    const isAdmin = !!req.session.adminId;
    const pid = req.session.playerId ? Number(req.session.playerId) : null;
    const { canSeeStats } = await isMatchVisibleTo(match, pid, isAdmin);
    if (!canSeeStats) {
      res.status(403).json({ error: "Match is not publicly visible yet" });
      return;
    }

    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;
    if (Date.now() - match.createdAt.getTime() > twoWeeksMs) {
      res.status(410).json({ error: "Replay download window has expired (2-week limit)" });
      return;
    }

    const path = await import("path");
    const fs = await import("fs");
    const filePath = path.resolve(match.roflFilePath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "Replay file not found on disk" });
      return;
    }

    const fileName = `${match.sideAName}_vs_${match.sideBName}_${match.id}.rofl`.replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Type", "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: "Failed to download replay" });
  }
});

// PUT /matches/:id/visibility — set match visibility (captain or admin)
router.put("/:id/visibility", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { visibility } = req.body as { visibility?: "public" | "private" | "default" };
    if (!visibility || !["public", "private", "default"].includes(visibility)) {
      res.status(400).json({ error: "visibility must be 'public', 'private', or 'default'" });
      return;
    }

    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    // Check authorization: must be admin or captain of one of the teams
    const isAdmin = !!req.session.adminId;
    if (!isAdmin) {
      const playerId = req.session.playerId;
      if (!playerId) {
        res.status(401).json({ error: "Login required to change visibility" });
        return;
      }
      const isCaptainA = match.teamAId
        ? (await db.select().from(teamsTable).where(
            and(eq(teamsTable.id, match.teamAId), eq(teamsTable.captainPlayerId, playerId))
          )).length > 0
        : false;
      const isCaptainB = match.teamBId
        ? (await db.select().from(teamsTable).where(
            and(eq(teamsTable.id, match.teamBId), eq(teamsTable.captainPlayerId, playerId))
          )).length > 0
        : false;

      if (!isCaptainA && !isCaptainB) {
        res.status(403).json({ error: "Only team captains can change match visibility" });
        return;
      }
    }

    // Map visibility enum to DB value
    let visibleAfter: Date | null;
    if (visibility === "public") {
      visibleAfter = new Date(0); // epoch = always visible
    } else if (visibility === "private") {
      visibleAfter = new Date("9999-01-01"); // far future = never visible
    } else {
      visibleAfter = null; // default = 7 days from createdAt
    }

    await db
      .update(matchesTable)
      .set({ visibleAfter, updatedAt: new Date() })
      .where(eq(matchesTable.id, id));

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update match visibility" });
  }
});

// POST /matches/:id/claim-team — captain claims their team for one side of the match
router.post("/:id/claim-team", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const playerId = req.session.playerId;
    if (!playerId) {
      res.status(401).json({ error: "Player session required" });
      return;
    }

    const { teamId } = req.body as { teamId?: number };
    if (!teamId) {
      res.status(400).json({ error: "teamId is required" });
      return;
    }

    // Find the match
    const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, id));
    if (!match) {
      res.status(404).json({ error: "Match not found" });
      return;
    }

    // Check that at least one side is unclaimed
    if (match.teamAId !== null && match.teamBId !== null) {
      res.status(400).json({ error: "This match already has both teams assigned" });
      return;
    }

    // Verify the requesting player is captain of the given team
    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    if (team.captainPlayerId !== playerId) {
      res.status(403).json({ error: "Only the team captain can claim a match" });
      return;
    }

    // Determine which side is unclaimed
    const unclaimedSide = match.teamAId === null ? "A" : "B";

    // Get match_players on the unclaimed side
    const sidePlayers = await db
      .select()
      .from(matchPlayersTable)
      .where(
        and(
          eq(matchPlayersTable.matchId, id),
          eq(matchPlayersTable.teamSide, unclaimedSide)
        )
      );

    const sidePuuids = sidePlayers
      .map((mp) => mp.puuid)
      .filter((p): p is string => p !== null);

    // Get team members and their PUUIDs
    const members = await db
      .select({
        memberId: teamMembersTable.playerId,
        puuid: playersTable.puuid,
      })
      .from(teamMembersTable)
      .leftJoin(playersTable, eq(teamMembersTable.playerId, playersTable.id))
      .where(eq(teamMembersTable.teamId, teamId));

    const memberPuuids = members
      .map((m) => m.puuid)
      .filter((p): p is string => p !== null);

    // Count how many team member PUUIDs appear in the unclaimed side's match_players
    const matchingPuuids = memberPuuids.filter((puuid) => sidePuuids.includes(puuid));

    if (matchingPuuids.length < 3) {
      res.status(400).json({
        error: `Only ${matchingPuuids.length} team members matched players on the unclaimed side (need at least 3)`,
      });
      return;
    }

    // Assign the team to the unclaimed side
    let eloUpdated = false;

    await db.transaction(async (tx) => {
      if (unclaimedSide === "A") {
        await tx
          .update(matchesTable)
          .set({ teamAId: teamId, updatedAt: new Date() })
          .where(eq(matchesTable.id, id));
      } else {
        await tx
          .update(matchesTable)
          .set({ teamBId: teamId, updatedAt: new Date() })
          .where(eq(matchesTable.id, id));
      }

      // Re-read match to check if both sides now have teamIds
      const [updatedMatch] = await tx.select().from(matchesTable).where(eq(matchesTable.id, id));

      if (updatedMatch && updatedMatch.teamAId !== null && updatedMatch.teamBId !== null) {
        // Always update W/L for both teams
        await updateTeamRecord(tx, updatedMatch.teamAId, updatedMatch.teamBId, updatedMatch.winnerName, updatedMatch.sideAName);

        // ELO only for tournament/event (PRD v3.1 §8)
        const mt = (updatedMatch as any).matchType ?? "scrim";
        if (mt === "ranked_tournament" || mt === "event") {
          const [settings] = await tx.select().from(ladderSettingsTable).limit(1);
          const kFactor = settings?.kFactor ?? 32;

          const elo = await applyTeamElo(
            tx,
            id,
            updatedMatch.teamAId,
            updatedMatch.teamBId,
            updatedMatch.winnerName,
            updatedMatch.sideAName,
            kFactor
          );

          await tx
            .update(matchesTable)
            .set({
              teamAEloBefore: elo.teamABefore,
              teamAEloAfter: elo.teamAAfter,
              teamBEloBefore: elo.teamBBefore,
              teamBEloAfter: elo.teamBAfter,
            })
            .where(eq(matchesTable.id, id));

          eloUpdated = true;
        }
      }
    });

    res.json({ success: true, eloUpdated });
  } catch (err) {
    res.status(500).json({ error: "Failed to claim team for match" });
  }
});

export default router;
