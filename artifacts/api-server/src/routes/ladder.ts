import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, seasonsTable, ladderSettingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const [activeSeason] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.status, "active"));

  const [ladderSettings] = await db.select().from(ladderSettingsTable).limit(1);
  const minMatches = ladderSettings?.minMatchesForDisplay ?? 4;

  const players = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.isActive, true))
    .orderBy(desc(playersTable.currentElo));

  const qualified = players.filter(
    (p) => p.wins + p.losses >= minMatches
  );

  const entries = qualified.map((p, idx) => ({
    rank: idx + 1,
    id: p.id,
    riotId: p.riotId,
    discordUsername: p.discordUsername,
    currentElo: p.currentElo,
    peakElo: p.peakElo,
    wins: p.wins,
    losses: p.losses,
    winRate:
      p.wins + p.losses > 0
        ? Math.round((p.wins / (p.wins + p.losses)) * 1000) / 10
        : 0,
  }));

  res.json({
    season: activeSeason
      ? {
          id: activeSeason.id,
          name: activeSeason.name,
          status: activeSeason.status,
          startDate: activeSeason.startDate,
          endDate: activeSeason.endDate,
          eloResetFactor: activeSeason.eloResetFactor,
          createdAt: activeSeason.createdAt.toISOString(),
          updatedAt: activeSeason.updatedAt.toISOString(),
        }
      : null,
    entries,
  });
});

export default router;
