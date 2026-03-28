import { Router } from "express";
import { db } from "@workspace/db";
import { eloHistoryTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// ── Formatter ────────────────────────────────────────────────

function formatEntry(e: typeof eloHistoryTable.$inferSelect) {
  return {
    id: e.id,
    teamId: e.teamId,
    elo: e.elo,
    delta: e.delta,
    matchId: e.matchId ?? null,
    reason: e.reason,
    createdAt: e.createdAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /elo-history/team/:teamId — ELO history for a team (chronological)
router.get("/team/:teamId", async (req, res) => {
  try {
    const teamId = parseInt(req.params.teamId as string);
    if (isNaN(teamId)) {
      res.status(400).json({ error: "Invalid teamId" });
      return;
    }

    const rows = await db
      .select()
      .from(eloHistoryTable)
      .where(eq(eloHistoryTable.teamId, teamId))
      .orderBy(asc(eloHistoryTable.createdAt));

    res.json(rows.map(formatEntry));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ELO history" });
  }
});

export default router;
