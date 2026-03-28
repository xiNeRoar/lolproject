import { Router } from "express";
import { db } from "@workspace/db";
import { seasonChampionsTable, teamsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

// ── Formatter ────────────────────────────────────────────────

function formatChampion(
  c: typeof seasonChampionsTable.$inferSelect,
  teamName?: string | null
) {
  return {
    id: c.id,
    seasonId: c.seasonId,
    teamId: c.teamId,
    teamName: teamName ?? c.teamName ?? null,
    finalElo: c.finalElo,
    createdAt: c.createdAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /season-champions — all season champions ordered chronologically
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        champion: seasonChampionsTable,
        teamName: teamsTable.name,
      })
      .from(seasonChampionsTable)
      .leftJoin(teamsTable, eq(seasonChampionsTable.teamId, teamsTable.id))
      .orderBy(asc(seasonChampionsTable.createdAt));

    res.json(rows.map((r) => formatChampion(r.champion, r.teamName ?? null)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch season champions" });
  }
});

// GET /season-champions/:seasonId — champion for a specific season
router.get("/:seasonId", async (req, res) => {
  try {
    const seasonId = parseInt(req.params.seasonId as string);
    if (isNaN(seasonId)) {
      res.status(400).json({ error: "Invalid seasonId" });
      return;
    }

    const rows = await db
      .select({
        champion: seasonChampionsTable,
        teamName: teamsTable.name,
      })
      .from(seasonChampionsTable)
      .leftJoin(teamsTable, eq(seasonChampionsTable.teamId, teamsTable.id))
      .where(eq(seasonChampionsTable.seasonId, seasonId))
      .limit(1);

    if (!rows.length) {
      res.status(404).json({ error: "No champion found for this season" });
      return;
    }

    res.json(formatChampion(rows[0]!.champion, rows[0]!.teamName ?? null));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch season champion" });
  }
});

export default router;
