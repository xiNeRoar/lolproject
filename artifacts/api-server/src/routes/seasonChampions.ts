import { Router } from "express";
import { db } from "@workspace/db";
import { seasonChampionsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function formatChampion(
  c: typeof seasonChampionsTable.$inferSelect,
  playerRiotId?: string | null
) {
  return {
    id: c.id,
    seasonId: c.seasonId,
    playerId: c.playerId,
    playerRiotId: playerRiotId ?? null,
    finalElo: c.finalElo,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({ champion: seasonChampionsTable, player: { riotId: playersTable.riotId } })
      .from(seasonChampionsTable)
      .leftJoin(playersTable, eq(seasonChampionsTable.playerId, playersTable.id))
      .orderBy(seasonChampionsTable.createdAt);
    res.json(rows.map((r) => formatChampion(r.champion, r.player?.riotId ?? null)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch season champions" });
  }
});

router.get("/:seasonId", async (req, res) => {
  try {
    const rows = await db
      .select({ champion: seasonChampionsTable, player: { riotId: playersTable.riotId } })
      .from(seasonChampionsTable)
      .leftJoin(playersTable, eq(seasonChampionsTable.playerId, playersTable.id))
      .where(eq(seasonChampionsTable.seasonId, Number(req.params.seasonId)))
      .limit(1);
    if (!rows.length) return res.status(404).json({ error: "No champion found for this season" });
    res.json(formatChampion(rows[0].champion, rows[0].player?.riotId ?? null));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch season champion" });
  }
});

export default router;
