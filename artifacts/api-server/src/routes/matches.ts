import { Router } from "express";
import { db } from "@workspace/db";
import { matchesTable, eventsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { calculateElo } from "../lib/elo";

const router = Router();

function formatMatch(
  row: typeof matchesTable.$inferSelect,
  eventTitle: string | null
) {
  return {
    id: row.id,
    eventId: row.eventId,
    eventTitle,
    matchTitle: row.matchTitle,
    sideAName: row.sideAName,
    sideBName: row.sideBName,
    winnerName: row.winnerName,
    score: row.score,
    format: row.format,
    vodUrl: row.vodUrl,
    playerAId: row.playerAId,
    playerBId: row.playerBId,
    playerAEloBefore: row.playerAEloBefore,
    playerAEloAfter: row.playerAEloAfter,
    playerBEloBefore: row.playerBEloBefore,
    playerBEloAfter: row.playerBEloAfter,
    seasonId: row.seasonId,
    isPlayoff: row.isPlayoff ?? false,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;
  const format = req.query.format as string | undefined;
  const search = req.query.search as string | undefined;
  const seasonId = req.query.seasonId ? parseInt(req.query.seasonId as string) : null;
  const playerId = req.query.playerId ? parseInt(req.query.playerId as string) : null;

  let rows = await db
    .select({
      id: matchesTable.id,
      eventId: matchesTable.eventId,
      matchTitle: matchesTable.matchTitle,
      sideAName: matchesTable.sideAName,
      sideBName: matchesTable.sideBName,
      winnerName: matchesTable.winnerName,
      score: matchesTable.score,
      format: matchesTable.format,
      vodUrl: matchesTable.vodUrl,
      playerAId: matchesTable.playerAId,
      playerBId: matchesTable.playerBId,
      playerAEloBefore: matchesTable.playerAEloBefore,
      playerAEloAfter: matchesTable.playerAEloAfter,
      playerBEloBefore: matchesTable.playerBEloBefore,
      playerBEloAfter: matchesTable.playerBEloAfter,
      seasonId: matchesTable.seasonId,
      isPlayoff: matchesTable.isPlayoff,
      createdAt: matchesTable.createdAt,
      updatedAt: matchesTable.updatedAt,
      eventTitle: eventsTable.title,
    })
    .from(matchesTable)
    .leftJoin(eventsTable, eq(matchesTable.eventId, eventsTable.id))
    .orderBy(matchesTable.createdAt);

  if (eventId) rows = rows.filter((r) => r.eventId === eventId);
  if (format) rows = rows.filter((r) => r.format === format);
  if (seasonId) rows = rows.filter((r) => r.seasonId === seasonId);
  if (playerId) {
    rows = rows.filter(
      (r) => r.playerAId === playerId || r.playerBId === playerId
    );
  }
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.matchTitle.toLowerCase().includes(s) ||
        r.sideAName.toLowerCase().includes(s) ||
        r.sideBName.toLowerCase().includes(s) ||
        r.winnerName.toLowerCase().includes(s)
    );
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle ?? null,
      matchTitle: r.matchTitle,
      sideAName: r.sideAName,
      sideBName: r.sideBName,
      winnerName: r.winnerName,
      score: r.score,
      format: r.format,
      vodUrl: r.vodUrl,
      playerAId: r.playerAId,
      playerBId: r.playerBId,
      playerAEloBefore: r.playerAEloBefore,
      playerAEloAfter: r.playerAEloAfter,
      playerBEloBefore: r.playerBEloBefore,
      playerBEloAfter: r.playerBEloAfter,
      seasonId: r.seasonId,
      isPlayoff: r.isPlayoff ?? false,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
});

router.post("/", requireAdmin, async (req, res) => {
  const {
    eventId, matchTitle, sideAName, sideBName, winnerName,
    score, format, vodUrl, playerAId, playerBId, seasonId, isPlayoff,
  } = req.body as {
    eventId?: number | null;
    matchTitle?: string;
    sideAName?: string;
    sideBName?: string;
    winnerName?: string;
    score?: string | null;
    format?: string | null;
    vodUrl?: string | null;
    playerAId?: number | null;
    playerBId?: number | null;
    seasonId?: number | null;
    isPlayoff?: boolean | null;
  };

  if (!matchTitle || !sideAName || !sideBName || !winnerName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Compute ELO deltas if both players are linked
  let playerAEloBefore: number | null = null;
  let playerAEloAfter: number | null = null;
  let playerBEloBefore: number | null = null;
  let playerBEloAfter: number | null = null;
  let playerA: typeof playersTable.$inferSelect | null = null;
  let playerB: typeof playersTable.$inferSelect | null = null;

  if (playerAId && playerBId) {
    const [pA] = await db.select().from(playersTable).where(eq(playersTable.id, Number(playerAId)));
    const [pB] = await db.select().from(playersTable).where(eq(playersTable.id, Number(playerBId)));

    if (pA && pB) {
      playerA = pA;
      playerB = pB;
      playerAEloBefore = pA.currentElo;
      playerBEloBefore = pB.currentElo;

      // Determine winner by matching winnerName to sideAName/sideBName
      const playerAWon = winnerName === sideAName;
      playerAEloAfter = calculateElo(pA.currentElo, pB.currentElo, playerAWon);
      playerBEloAfter = calculateElo(pB.currentElo, pA.currentElo, !playerAWon);
    }
  }

  // Wrap match insert + ELO player updates in a transaction for data integrity
  const row = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(matchesTable)
      .values({
        eventId: eventId ? Number(eventId) : null,
        matchTitle,
        sideAName,
        sideBName,
        winnerName,
        score: score || null,
        format: format || null,
        vodUrl: vodUrl || null,
        playerAId: playerAId ? Number(playerAId) : null,
        playerBId: playerBId ? Number(playerBId) : null,
        playerAEloBefore,
        playerAEloAfter,
        playerBEloBefore,
        playerBEloAfter,
        seasonId: seasonId ? Number(seasonId) : null,
        isPlayoff: isPlayoff || false,
      })
      .returning();

    // Update player ELO + record outcome atomically with match insert
    if (playerA && playerB && playerAEloAfter !== null && playerBEloAfter !== null) {
      const playerAWon = winnerName === sideAName;

      await tx.update(playersTable).set({
        currentElo: playerAEloAfter,
        peakElo: Math.max(playerA.peakElo, playerAEloAfter),
        wins: playerA.wins + (playerAWon ? 1 : 0),
        losses: playerA.losses + (playerAWon ? 0 : 1),
        updatedAt: new Date(),
      }).where(eq(playersTable.id, playerA.id));

      await tx.update(playersTable).set({
        currentElo: playerBEloAfter,
        peakElo: Math.max(playerB.peakElo, playerBEloAfter),
        wins: playerB.wins + (playerAWon ? 0 : 1),
        losses: playerB.losses + (playerAWon ? 1 : 0),
        updatedAt: new Date(),
      }).where(eq(playersTable.id, playerB.id));
    }

    return inserted!;
  });

  const event = eventId
    ? (await db.select().from(eventsTable).where(eq(eventsTable.id, Number(eventId))))[0]
    : null;

  res.status(201).json(formatMatch(row, event?.title ?? null));
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const {
    eventId, matchTitle, sideAName, sideBName, winnerName,
    score, format, vodUrl, seasonId, isPlayoff,
  } = req.body as {
    eventId?: number | null;
    matchTitle?: string;
    sideAName?: string;
    sideBName?: string;
    winnerName?: string;
    score?: string | null;
    format?: string | null;
    vodUrl?: string | null;
    seasonId?: number | null;
    isPlayoff?: boolean | null;
  };

  const [row] = await db
    .update(matchesTable)
    .set({
      eventId: eventId !== undefined ? (eventId ? Number(eventId) : null) : undefined,
      matchTitle,
      sideAName,
      sideBName,
      winnerName,
      score: score !== undefined ? (score || null) : undefined,
      format: format !== undefined ? (format || null) : undefined,
      vodUrl: vodUrl !== undefined ? (vodUrl || null) : undefined,
      seasonId: seasonId !== undefined ? (seasonId ? Number(seasonId) : null) : undefined,
      isPlayoff: isPlayoff !== undefined ? (isPlayoff || false) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(matchesTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const event = row.eventId
    ? (await db.select().from(eventsTable).where(eq(eventsTable.id, row.eventId)))[0]
    : null;

  res.json(formatMatch(row, event?.title ?? null));
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(matchesTable).where(eq(matchesTable.id, id));
  res.json({ success: true });
});

export default router;
