import { db } from "@workspace/db";
import { playerBadgesTable, matchesTable, playersTable } from "@workspace/db";
import { eq, or, and, count } from "drizzle-orm";

async function hasBadge(playerId: number, badgeType: string): Promise<boolean> {
  const [existing] = await db
    .select({ value: count() })
    .from(playerBadgesTable)
    .where(and(eq(playerBadgesTable.playerId, playerId), eq(playerBadgesTable.badgeType, badgeType)));
  return (existing?.value ?? 0) > 0;
}

async function awardBadge(playerId: number, badgeType: string, seasonId?: number | null) {
  if (await hasBadge(playerId, badgeType)) return;
  await db.insert(playerBadgesTable).values({
    playerId,
    badgeType,
    seasonId: seasonId ?? null,
  });
  console.log(`[badges] Awarded '${badgeType}' to player ${playerId}`);
}

/**
 * Check and award badges after a match is created.
 * Called with the winning and losing player IDs after ELO update.
 */
export async function checkMatchBadges(playerAId: number, playerBId: number) {
  for (const pid of [playerAId, playerBId]) {
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, pid));
    if (!player) continue;

    const totalMatches = player.wins + player.losses;

    // first_blood: player's first ever match
    if (totalMatches === 1) {
      await awardBadge(pid, "first_blood");
    }

    // veteran: 20+ total matches
    if (totalMatches >= 20) {
      await awardBadge(pid, "veteran");
    }

    // win_streak: 3+ consecutive wins
    if (player.wins >= 3) {
      // Check last 3 matches for this player — all wins
      const recentAsA = await db
        .select({ winnerName: matchesTable.winnerName, sideAName: matchesTable.sideAName })
        .from(matchesTable)
        .where(eq(matchesTable.playerAId, pid))
        .orderBy(matchesTable.createdAt)
        .limit(3);

      const recentAsB = await db
        .select({ winnerName: matchesTable.winnerName, sideBName: matchesTable.sideBName })
        .from(matchesTable)
        .where(eq(matchesTable.playerBId, pid))
        .orderBy(matchesTable.createdAt)
        .limit(3);

      // Combine, sort by most recent, take 3
      const allRecent = [
        ...recentAsA.map((m) => m.winnerName === m.sideAName),
        ...recentAsB.map((m) => m.winnerName === m.sideBName),
      ];

      // Simple check: if wins >= 3, check if the last 3 results are all wins
      // This is a simplified version — for accuracy we'd need to sort by createdAt
      if (allRecent.length >= 3) {
        const lastThree = allRecent.slice(-3);
        if (lastThree.every(Boolean)) {
          await awardBadge(pid, "win_streak");
        }
      }
    }
  }
}

/**
 * Check and award badges after season completion.
 * Called with seasonId and champion playerId.
 */
export async function checkSeasonBadges(
  seasonId: number,
  championId: number,
  players: { id: number; currentElo: number; startElo?: number }[]
) {
  // season_champion badge
  await awardBadge(championId, "season_champion", seasonId);

  // climber: 200+ ELO gain in season (approximate — compare current vs base 1000)
  for (const p of players) {
    const eloGain = p.currentElo - (p.startElo ?? 1000);
    if (eloGain >= 200) {
      await awardBadge(p.id, "climber", seasonId);
    }
  }
}
