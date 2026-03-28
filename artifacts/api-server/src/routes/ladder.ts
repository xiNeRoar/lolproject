import { Router } from "express";
import { db } from "@workspace/db";
import { teamsTable, seasonsTable, ladderSettingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// GET /ladder — team ELO ladder, filtered by minMatchesForDisplay
router.get("/", async (_req, res) => {
  try {
    const [activeSeason] = await db
      .select()
      .from(seasonsTable)
      .where(eq(seasonsTable.status, "active"));

    const [settings] = await db.select().from(ladderSettingsTable).limit(1);
    const minMatches = settings?.minMatchesForDisplay ?? 4;

    const teams = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.isActive, true))
      .orderBy(desc(teamsTable.teamElo));

    const qualified = teams.filter((t) => t.wins + t.losses >= minMatches);

    const entries = qualified.map((t, idx) => ({
      rank: idx + 1,
      id: t.id,
      name: t.name,
      tag: t.tag,
      teamElo: t.teamElo,
      peakElo: t.peakElo,
      wins: t.wins,
      losses: t.losses,
      winRate:
        t.wins + t.losses > 0
          ? Math.round((t.wins / (t.wins + t.losses)) * 1000) / 10
          : 0,
    }));

    const season = activeSeason
      ? {
          id: activeSeason.id,
          name: activeSeason.name,
          status: activeSeason.status,
          startDate: activeSeason.startDate,
          endDate: activeSeason.endDate,
          eloResetFactor: activeSeason.eloResetFactor,
          defaultMatchFormat: activeSeason.defaultMatchFormat ?? null,
          createdAt: activeSeason.createdAt.toISOString(),
          updatedAt: activeSeason.updatedAt.toISOString(),
        }
      : null;

    res.json({ season, entries });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ladder" });
  }
});

export default router;
