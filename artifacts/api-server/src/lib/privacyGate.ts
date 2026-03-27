/**
 * Privacy gate helpers for 3-layer visibility model (PRD v3.1 S7).
 *
 * Layer 1: Scrim = login + participant only (default private)
 * Layer 2: RSO opt-in = public profile
 * Layer 3: Tournament/event = public by design
 *
 * All routes that check visibility MUST use these shared helpers (D-14).
 */

import { db } from "@workspace/db";
import { matchPlayersTable, matchesTable, playersTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";

type Match = typeof matchesTable.$inferSelect;
type Player = typeof playersTable.$inferSelect;

// ── Match Participant Check (D-03) ──────────────────────────

/**
 * Check if playerId is one of the 10 match_players (D-03).
 * NOT team_members -- only actual participants in this specific match.
 */
export async function checkMatchParticipant(
  matchId: number,
  playerId: number
): Promise<boolean> {
  const [row] = await db
    .select({ id: matchPlayersTable.id })
    .from(matchPlayersTable)
    .where(
      and(
        eq(matchPlayersTable.matchId, matchId),
        eq(matchPlayersTable.playerId, playerId)
      )
    )
    .limit(1);
  return !!row;
}

// ── Match Visibility (D-01, D-02, D-05) ────────────────────

/**
 * Determine if a viewer can see full stats for a match.
 *
 * - Admin => always sees everything
 * - Tournament/event => public by default (D-05), unless captain set private
 * - Scrim => participant-only (D-01), captain can override to public
 * - visibleAfter = null means PRIVATE (D-11), not 7-day default
 */
export async function isMatchVisibleTo(
  match: Match,
  viewerId: number | null,
  isAdmin: boolean
): Promise<{ canSeeStats: boolean; isParticipant: boolean }> {
  // Admin always sees everything
  if (isAdmin) return { canSeeStats: true, isParticipant: false };

  const matchType = match.matchType ?? "scrim";

  // Layer 3: Tournament/event matches are always public (D-05)
  if (matchType === "ranked_tournament" || matchType === "event") {
    // Unless captain explicitly set private (visibleAfter = far-future)
    if (match.visibleAfter && match.visibleAfter.getFullYear() >= 9000) {
      if (viewerId) {
        const isParticipant = await checkMatchParticipant(match.id, viewerId);
        return { canSeeStats: isParticipant, isParticipant };
      }
      return { canSeeStats: false, isParticipant: false };
    }
    return { canSeeStats: true, isParticipant: false };
  }

  // Layer 1: Scrim -- check participant via match_players (D-03)
  if (viewerId) {
    const isParticipant = await checkMatchParticipant(match.id, viewerId);
    if (isParticipant) return { canSeeStats: true, isParticipant: true };
  }

  // Check if captain set public (visibleAfter in the past or epoch)
  if (match.visibleAfter && Date.now() >= match.visibleAfter.getTime()) {
    return { canSeeStats: true, isParticipant: false };
  }

  // Default: scrim is private (visibleAfter = null means private per D-11)
  return { canSeeStats: false, isParticipant: false };
}

// ── Match Redaction (D-01, D-02) ────────────────────────────

/**
 * Strip per-player data from match response. Returns team-level data only.
 * D-01: team names, score, date, game duration. Nothing else.
 * D-02: includes isRedacted: true flag.
 */
export function redactMatchForNonParticipant(
  formattedMatch: Record<string, any>
): Record<string, any> {
  return {
    id: formattedMatch.id,
    teamAId: formattedMatch.teamAId,
    teamBId: formattedMatch.teamBId,
    teamAName: formattedMatch.teamAName,
    teamBName: formattedMatch.teamBName,
    teamATag: formattedMatch.teamATag,
    teamBTag: formattedMatch.teamBTag,
    sideAName: formattedMatch.sideAName,
    sideBName: formattedMatch.sideBName,
    matchTitle: formattedMatch.matchTitle,
    winnerName: formattedMatch.winnerName,
    score: formattedMatch.score,
    gameDuration: formattedMatch.gameDuration,
    matchType: formattedMatch.matchType,
    createdAt: formattedMatch.createdAt,
    updatedAt: formattedMatch.updatedAt,
    matchPlayers: [],
    vods: [],
    isRedacted: true,
  };
}

// ── Per-Player RSO Opt-In Filter (D-04) ─────────────────────

/**
 * D-04: For public scrims viewed by non-participants, mask per-player stats
 * for players without rsoOptIn.
 *
 * Participants always see all players. Non-participants only see stats for
 * players who have rsoOptIn = true.
 */
export async function filterMatchPlayersByOptIn(
  matchPlayers: Array<Record<string, any>>,
  viewerIsParticipant: boolean
): Promise<Array<Record<string, any>>> {
  if (viewerIsParticipant) return matchPlayers; // participants see all

  // Collect all non-null playerIds
  const playerIds = matchPlayers
    .map((mp) => mp.playerId)
    .filter((id): id is number => id !== null && id !== undefined);

  if (playerIds.length === 0) return matchPlayers;

  // Batch query rsoOptIn status
  const players = await db
    .select({ id: playersTable.id, rsoOptIn: playersTable.rsoOptIn })
    .from(playersTable)
    .where(inArray(playersTable.id, playerIds));

  const optInMap = new Map<number, boolean>();
  for (const p of players) {
    optInMap.set(p.id, p.rsoOptIn);
  }

  // Mask players without rsoOptIn
  return matchPlayers.map((mp) => {
    // If no playerId (unlinked) or player has opted in, return as-is
    if (!mp.playerId || optInMap.get(mp.playerId)) return mp;

    // Mask non-opted player stats
    return {
      ...mp,
      playerRiotId: null,
      champion: null,
      kills: null,
      deaths: null,
      assists: null,
      cs: null,
      gold: null,
      damageToChampions: null,
      visionScore: null,
      item0: null,
      item1: null,
      item2: null,
      item3: null,
      item4: null,
      item5: null,
      item6: null,
      _masked: true,
    };
  });
}

// ── Player Profile Visibility (D-07, D-08, D-09) ───────────

/**
 * Determine if a viewer can see a player's full profile.
 *
 * - Admin => always sees everything
 * - Owner => always sees own profile
 * - Public profile => anyone can see
 * - Participants-only => co-participants from any shared match
 * - Private => only the player themselves
 */
export async function isPlayerProfileVisibleTo(
  player: Player,
  viewerId: number | null,
  isAdmin: boolean
): Promise<{ canSeeProfile: boolean; isOwner: boolean }> {
  if (isAdmin) return { canSeeProfile: true, isOwner: false };
  if (viewerId === player.id) return { canSeeProfile: true, isOwner: true };

  const visibility = player.profileVisibility ?? "private";

  if (visibility === "public") {
    return { canSeeProfile: true, isOwner: false };
  }

  if (visibility === "participants-only" && viewerId) {
    const isCoParticipant = await checkCoParticipant(player.id, viewerId);
    if (isCoParticipant) {
      return { canSeeProfile: true, isOwner: false };
    }
  }

  return { canSeeProfile: false, isOwner: false };
}

// ── Co-Participant Check (D-09) ─────────────────────────────

/**
 * Check if two players have ever appeared in the same match.
 * "Same-match" = both appear in match_players for the same matchId.
 * NOT same-team -- same-match (D-09).
 */
export async function checkCoParticipant(
  targetPlayerId: number,
  viewerPlayerId: number
): Promise<boolean> {
  // Find matches where targetPlayer participated
  const targetMatches = db
    .select({ matchId: matchPlayersTable.matchId })
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.playerId, targetPlayerId));

  // Check if viewer participated in any of those matches
  const [row] = await db
    .select({ id: matchPlayersTable.id })
    .from(matchPlayersTable)
    .where(
      and(
        eq(matchPlayersTable.playerId, viewerPlayerId),
        inArray(matchPlayersTable.matchId, targetMatches)
      )
    )
    .limit(1);

  return !!row;
}
