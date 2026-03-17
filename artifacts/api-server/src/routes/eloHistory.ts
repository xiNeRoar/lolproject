import { Router } from "express";
import { db } from "@workspace/db";
import { eloHistoryTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

function formatEntry(e: typeof eloHistoryTable.$inferSelect) {
  return {
    id: e.id,
    playerId: e.playerId,
    elo: e.elo,
    delta: e.delta,
    matchId: e.matchId,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  };
}

router.get("/:playerId", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(eloHistoryTable)
      .where(eq(eloHistoryTable.playerId, Number(req.params.playerId)))
      .orderBy(asc(eloHistoryTable.createdAt));
    res.json(rows.map(formatEntry));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ELO history" });
  }
});

export default router;
