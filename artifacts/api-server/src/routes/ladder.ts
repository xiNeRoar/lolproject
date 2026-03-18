import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, seasonsTable, ladderSettingsTable, vodEntriesTable } from "@workspace/db";
import { eq, desc, sql, inArray } from "drizzle-orm";

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

  // S3: Get top champion per qualified player
  const qualifiedIds = qualified.map((p) => p.id);
  const champMap: Record<number, string | null> = {};
  if (qualifiedIds.length > 0) {
    const vodRows = await db
      .select({
        playerId: vodEntriesTable.playerId,
        champion: vodEntriesTable.champion,
      })
      .from(vodEntriesTable)
      .where(inArray(vodEntriesTable.playerId, qualifiedIds));

    // Count per player per champion, pick top
    const playerChamps: Record<number, Record<string, number>> = {};
    for (const v of vodRows) {
      if (!v.playerId || !v.champion) continue;
      if (!playerChamps[v.playerId]) playerChamps[v.playerId] = {};
      playerChamps[v.playerId][v.champion] = (playerChamps[v.playerId][v.champion] || 0) + 1;
    }
    for (const [pid, champs] of Object.entries(playerChamps)) {
      const top = Object.entries(champs).sort((a, b) => b[1] - a[1])[0];
      champMap[Number(pid)] = top ? top[0] : null;
    }
  }

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
    topChampion: champMap[p.id] ?? null,
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
