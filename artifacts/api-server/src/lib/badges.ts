import { db } from "@workspace/db";
import { playerBadgesTable, matchPlayersTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { notifyPlayer } from "./notifications";

// ── Internal helpers ─────────────────────────────────────────

async function hasBadge(playerId: number, badgeType: string): Promise<boolean> {
  const [existing] = await db
    .select({ value: count() })
    .from(playerBadgesTable)
    .where(
      and(
        eq(playerBadgesTable.playerId, playerId),
        eq(playerBadgesTable.badgeType, badgeType)
      )
    );
  return (existing?.value ?? 0) > 0;
}

async function awardBadge(
  playerId: number,
  badgeType: string,
  seasonId?: number | null
): Promise<void> {
  if (await hasBadge(playerId, badgeType)) return;
  await db.insert(playerBadgesTable).values({
    playerId,
    badgeType,
    seasonId: seasonId ?? null,
  });
  console.log(`[badges] Awarded '${badgeType}' to player ${playerId}`);
  // Notify player of badge award (fire-and-forget)
  notifyPlayer(
    playerId,
    "badge_earned",
    "Badge earned",
    `You earned the '${badgeType}' badge!`
  ).catch((err) => console.error(`[notify] badge_earned failed for player ${playerId}:`, err));
}

// ── Public API ───────────────────────────────────────────────

/**
 * Check and award badges after a match is recorded.
 * Called with the matchId after match_players have been inserted.
 * All stats come from match_players — never from stale player.wins/losses.
 */
export async function checkMatchBadges(matchId: number): Promise<void> {
  // Get all players in this match
  const participants = await db
    .select({ playerId: matchPlayersTable.playerId })
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.matchId, matchId));

  const playerIds = [...new Set(
    participants.map((p) => p.playerId).filter((id): id is number => id !== null)
  )];

  for (const playerId of playerIds) {
    // All match_player rows for this player (lifetime stats)
    const allEntries = await db
      .select({ win: matchPlayersTable.win })
      .from(matchPlayersTable)
      .where(eq(matchPlayersTable.playerId, playerId))
      .orderBy(desc(matchPlayersTable.createdAt));

    const totalGames = allEntries.length;

    // first_blood: very first match ever played
    if (totalGames === 1) {
      await awardBadge(playerId, "first_blood");
    }

    // veteran: 20+ total games across all teams
    if (totalGames >= 20) {
      await awardBadge(playerId, "veteran");
    }

    // win_streak: last 3 matches are all wins
    if (totalGames >= 3) {
      const lastThree = allEntries.slice(0, 3);
      if (lastThree.every((e) => e.win)) {
        await awardBadge(playerId, "win_streak");
      }
    }
  }
}

/**
 * Check and award badges after season completion.
 * Called with the seasonId and the winning teamId.
 * climber badge is currently team-scoped — individual climber badges
 * can be added in a future phase when per-player ELO is tracked.
 */
export async function checkSeasonBadges(
  seasonId: number,
  championTeamId: number
): Promise<void> {
  // season_champion: award to all active members of the champion team
  // Imported inline to avoid circular deps; team_members is in schema
  const { teamMembersTable } = await import("@workspace/db");
  const { eq: eqI } = await import("drizzle-orm");

  const members = await db
    .select({ playerId: teamMembersTable.playerId })
    .from(teamMembersTable)
    .where(
      and(
        eqI(teamMembersTable.teamId, championTeamId),
        eqI(teamMembersTable.status, "active")
      )
    );

  for (const m of members) {
    await awardBadge(m.playerId, "season_champion", seasonId);
  }
}
