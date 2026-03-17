import { Router } from "express";
import { db } from "@workspace/db";
import { playerBadgesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

function formatBadge(b: typeof playerBadgesTable.$inferSelect) {
  return {
    id: b.id,
    playerId: b.playerId,
    badgeType: b.badgeType,
    earnedAt: b.earnedAt.toISOString(),
    seasonId: b.seasonId,
  };
}

router.get("/:playerId", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(playerBadgesTable)
      .where(eq(playerBadgesTable.playerId, Number(req.params.playerId)))
      .orderBy(desc(playerBadgesTable.earnedAt));
    res.json(rows.map(formatBadge));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player badges" });
  }
});

export default router;
