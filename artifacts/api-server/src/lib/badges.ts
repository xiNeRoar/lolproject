import { db } from "@workspace/db";
import {
  playerBadgesTable,
  matchPlayersTable,
  teamsTable,
  teamMembersTable,
  eloHistoryTable,
} from "@workspace/db";
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
 */
export async function checkSeasonBadges(
  seasonId: number,
  championTeamId: number
): Promise<void> {
  // season_champion: award to all active members of the champion team
  const members = await db
    .select({ playerId: teamMembersTable.playerId })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, championTeamId),
        eq(teamMembersTable.status, "active")
      )
    );

  for (const m of members) {
    await awardBadge(m.playerId, "season_champion", seasonId);
  }
}

/**
 * Check and award the climber badge after a match.
 * Trigger: team climbs 3+ ladder positions since the start of the current season.
 *
 * "Season start position" = rank at time of the most recent season_reset entry
 * in elo_history for this team. If no reset exists, uses registration baseline.
 * "Current position" = rank among all active teams by teamElo DESC.
 *
 * Called for both participating teams after each /submit.
 */
export async function checkClimberBadge(teamId: number): Promise<void> {
  const CLIMB_THRESHOLD = 3; // positions climbed to earn the badge

  // Get the team's ELO at season start (most recent season_reset entry)
  const [resetEntry] = await db
    .select({ elo: eloHistoryTable.elo })
    .from(eloHistoryTable)
    .where(
      and(
        eq(eloHistoryTable.teamId, teamId),
        eq(eloHistoryTable.reason, "season_reset")
      )
    )
    .orderBy(desc(eloHistoryTable.createdAt))
    .limit(1);

  // If no season reset yet, use registration baseline (first entry)
  const [baselineEntry] = resetEntry
    ? [resetEntry]
    : await db
        .select({ elo: eloHistoryTable.elo })
        .from(eloHistoryTable)
        .where(
          and(
            eq(eloHistoryTable.teamId, teamId),
            eq(eloHistoryTable.reason, "registration")
          )
        )
        .limit(1);

  if (!baselineEntry) return; // no history at all yet

  const baselineElo = baselineEntry.elo;

  // Get all active teams ordered by current ELO (for rank calculation)
  const allActiveTeams = await db
    .select({ id: teamsTable.id, teamElo: teamsTable.teamElo })
    .from(teamsTable)
    .where(eq(teamsTable.isActive, true))
    .orderBy(desc(teamsTable.teamElo));

  // Current rank of this team (1-based)
  const currentRankIdx = allActiveTeams.findIndex((t) => t.id === teamId);
  if (currentRankIdx === -1) return;
  const currentRank = currentRankIdx + 1;

  // Rank at baseline ELO: count how many active teams had ELO >= baseline
  const teamsAboveBaseline = allActiveTeams.filter((t) => t.teamElo >= baselineElo);
  const baselineRank = teamsAboveBaseline.length + (teamsAboveBaseline.some((t) => t.id === teamId) ? 0 : 1);

  const positionsClimbed = baselineRank - currentRank; // positive = climbed up

  if (positionsClimbed < CLIMB_THRESHOLD) return;

  // Award climber badge to all active team members
  const members = await db
    .select({ playerId: teamMembersTable.playerId })
    .from(teamMembersTable)
    .where(
      and(
        eq(teamMembersTable.teamId, teamId),
        eq(teamMembersTable.status, "active")
      )
    );

  for (const m of members) {
    await awardBadge(m.playerId, "climber");
  }
}
