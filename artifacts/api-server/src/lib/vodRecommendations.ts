import { db } from "@workspace/db";
import { vodEntriesTable } from "@workspace/db";
import { eq, ne, and } from "drizzle-orm";

export interface VodRecommendationInput {
  vodId: number;
  champion: string | null;
  opponentChampion: string | null;
  position: string | null;
  playerEloAtTime: number | null;
}

/**
 * Rule-based VOD recommendations. No AI required.
 * Priority: same matchup → same champion → same position → same ELO band.
 * Returns max 4 results.
 */
export async function getRelatedVods(input: VodRecommendationInput) {
  const { vodId, champion, opponentChampion, position } = input;

  // Same champion + same opponent (exact matchup match)
  if (champion && opponentChampion) {
    const matchupResults = await db
      .select()
      .from(vodEntriesTable)
      .where(
        and(
          ne(vodEntriesTable.id, vodId),
          eq(vodEntriesTable.champion, champion),
          eq(vodEntriesTable.opponentChampion, opponentChampion)
        )
      )
      .limit(4);

    if (matchupResults.length >= 2) return matchupResults;
  }

  // Same champion (any opponent)
  if (champion) {
    const championResults = await db
      .select()
      .from(vodEntriesTable)
      .where(
        and(
          ne(vodEntriesTable.id, vodId),
          eq(vodEntriesTable.champion, champion)
        )
      )
      .limit(4);

    if (championResults.length >= 2) return championResults;
  }

  // Same position fallback (for 5v5 future use)
  if (position) {
    const positionResults = await db
      .select()
      .from(vodEntriesTable)
      .where(
        and(
          ne(vodEntriesTable.id, vodId),
          eq(vodEntriesTable.position, position)
        )
      )
      .limit(4);

    return positionResults;
  }

  return [];
}
