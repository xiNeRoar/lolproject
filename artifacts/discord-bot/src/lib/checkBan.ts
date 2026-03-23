/**
 * Shared ban check helper for bot commands.
 *
 * Returns the ban reason string if the invoking Discord user has an
 * active player-level ban, or null if not banned (or no player record).
 */

import { db, playersTable, playerBansTable } from "./db.js";
import { eq, and, or, isNull, gt } from "drizzle-orm";

/**
 * Check if a Discord user has an active ban.
 * @returns Ban reason string if banned, null otherwise.
 */
export async function checkBan(discordId: string): Promise<string | null> {
  const [player] = await db
    .select({ id: playersTable.id })
    .from(playersTable)
    .where(eq(playersTable.discordId, discordId))
    .limit(1);

  if (!player) return null; // No player record = not banned

  const [activeBan] = await db
    .select({ reason: playerBansTable.reason })
    .from(playerBansTable)
    .where(
      and(
        eq(playerBansTable.playerId, player.id),
        eq(playerBansTable.isActive, true),
        or(
          isNull(playerBansTable.expiresAt),          // permanent ban
          gt(playerBansTable.expiresAt, new Date()),  // temporary ban still active
        )
      )
    )
    .limit(1);

  return activeBan?.reason ?? null;
}
