/**
 * Team matcher for VCLoL .rofl submissions.
 *
 * Given 10 parsed player entries (from rofl-parser), identifies which
 * registered team each side belongs to by cross-referencing PUUIDs and
 * riotIds against the team_members + players tables.
 *
 * Algorithm:
 *   1. Primary match: PUUID in players.puuid → join team_members
 *   2. Fallback: riotId in players.riotId → join team_members
 *      (used when player exists but hasn't run /connect yet)
 *   3. Team with 3+ player matches = identified; fewer = null (unregistered)
 *   4. On match, update players.puuid from .rofl if not yet set (side-effect)
 */

import { db } from "@workspace/db";
import {
  playersTable,
  teamMembersTable,
  teamsTable,
} from "@workspace/db";
import { eq, inArray, and, count } from "drizzle-orm";
import type { RoflPlayer } from "./rofl-parser.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MatchedPlayer {
  /** From .rofl */
  puuid: string;
  /** From .rofl (e.g. "xiNe#NA1") */
  riotId: string;
  /** Set if matched to a players row, null if unregistered */
  playerId: number | null;
}

export interface SideMatch {
  /** Matched team ID, or null if < 3 players matched any single team */
  teamId: number | null;
  /** All 5 players with their resolution status */
  matchedPlayers: MatchedPlayer[];
}

export interface TeamMatchResult {
  /** Blue side (TEAM=100) */
  sideA: SideMatch;
  /** Red side (TEAM=200) */
  sideB: SideMatch;
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface PlayerRow {
  id: number;
  puuid: string | null;
  riotId: string;
}

interface MemberRow {
  playerId: number;
  teamId: number;
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Match both sides of a parsed .rofl to registered teams.
 *
 * This function is pure DB read (plus one optional PUUID back-fill write).
 * All errors are surfaced as TeamMatchResult with null teamIds — never thrown.
 */
export async function matchTeams(
  bluePlayers: RoflPlayer[],
  redPlayers: RoflPlayer[]
): Promise<TeamMatchResult> {
  const [sideA, sideB] = await Promise.all([
    matchSide(bluePlayers),
    matchSide(redPlayers),
  ]);
  return { sideA, sideB };
}

// ─── Internal ─────────────────────────────────────────────────────────────────

const MIN_MATCHES = 3;

async function matchSide(players: RoflPlayer[]): Promise<SideMatch> {
  const puuids = players.map((p) => p.puuid).filter(Boolean);
  const riotIds = players.map((p) => p.riotId).filter(Boolean);

  // Step 1: Fetch all player rows matching by PUUID or riotId
  const [byPuuid, byRiotId] = await Promise.all([
    puuids.length > 0
      ? db
          .select({ id: playersTable.id, puuid: playersTable.puuid, riotId: playersTable.riotId })
          .from(playersTable)
          .where(inArray(playersTable.puuid, puuids))
      : Promise.resolve([] as PlayerRow[]),
    riotIds.length > 0
      ? db
          .select({ id: playersTable.id, puuid: playersTable.puuid, riotId: playersTable.riotId })
          .from(playersTable)
          .where(inArray(playersTable.riotId, riotIds))
      : Promise.resolve([] as PlayerRow[]),
  ]);

  // Merge: PUUID match takes priority over riotId match for the same player
  const playerMap = new Map<number, PlayerRow>();
  for (const row of [...byRiotId, ...byPuuid]) {
    playerMap.set(row.id, row); // byPuuid written last → wins on conflict
  }
  const allPlayerRows = [...playerMap.values()];

  if (allPlayerRows.length === 0) {
    // Nobody on this side is registered
    return {
      teamId: null,
      matchedPlayers: players.map((p) => ({ puuid: p.puuid, riotId: p.riotId, playerId: null })),
    };
  }

  // Step 2: Fetch team memberships for all matched players
  const playerIds = allPlayerRows.map((r) => r.id);
  const memberships: MemberRow[] = await db
    .select({ playerId: teamMembersTable.playerId, teamId: teamMembersTable.teamId })
    .from(teamMembersTable)
    .where(
      and(
        inArray(teamMembersTable.playerId, playerIds),
        eq(teamMembersTable.status, "active")
      )
    );

  // Step 3: Count how many matched players belong to each team
  const teamCounts = new Map<number, Set<number>>(); // teamId → Set<playerId>
  for (const m of memberships) {
    if (!teamCounts.has(m.teamId)) teamCounts.set(m.teamId, new Set());
    teamCounts.get(m.teamId)!.add(m.playerId);
  }

  // Find team with most matches; must be >= MIN_MATCHES.
  // Tiebreaker: if multiple teams tie on match count, pick the one with the
  // smallest active roster (more concentrated match = more likely correct).
  // If still tied after roster comparison, leave teamId as null (requires /claim-match).
  let bestTeamId: number | null = null;
  let bestCount = 0;
  const tiedTeams: number[] = [];

  for (const [teamId, playerSet] of teamCounts) {
    if (playerSet.size > bestCount) {
      bestCount = playerSet.size;
      bestTeamId = teamId;
      tiedTeams.length = 0;
      tiedTeams.push(teamId);
    } else if (playerSet.size === bestCount && bestCount > 0) {
      tiedTeams.push(teamId);
    }
  }

  if (bestCount < MIN_MATCHES) {
    bestTeamId = null;
  } else if (tiedTeams.length > 1) {
    // Resolve tie by smallest active roster
    let smallestRoster = Infinity;
    let tieWinner: number | null = null;
    let stillTied = false;

    for (const tid of tiedTeams) {
      const [{ rosterSize }] = await db
        .select({ rosterSize: count() })
        .from(teamMembersTable)
        .where(and(eq(teamMembersTable.teamId, tid), eq(teamMembersTable.status, "active")));

      const size = Number(rosterSize);
      if (size < smallestRoster) {
        smallestRoster = size;
        tieWinner = tid;
        stillTied = false;
      } else if (size === smallestRoster) {
        stillTied = true;
      }
    }

    bestTeamId = stillTied ? null : tieWinner;
  }

  // Step 4: Build playerId lookup for .rofl players
  // PUUID → playerId (primary key lookup)
  const puuidToPlayerId = new Map<string, number>();
  const riotIdToPlayerId = new Map<string, number>();
  for (const row of allPlayerRows) {
    if (row.puuid) puuidToPlayerId.set(row.puuid, row.id);
    riotIdToPlayerId.set(row.riotId, row.id);
  }

  const matchedPlayers: MatchedPlayer[] = players.map((p) => {
    const playerId =
      puuidToPlayerId.get(p.puuid) ??
      riotIdToPlayerId.get(p.riotId) ??
      null;
    return { puuid: p.puuid, riotId: p.riotId, playerId };
  });

  // Step 5: Back-fill PUUID for players matched by riotId only
  // (They exist in DB but haven't run /connect yet)
  const puuidBackfills: Promise<void>[] = [];
  for (const p of players) {
    const byRiot = riotIdToPlayerId.get(p.riotId);
    if (byRiot && !puuidToPlayerId.has(p.puuid) && p.puuid) {
      // Player matched by riotId but puuid not yet stored — update it
      puuidBackfills.push(
        db
          .update(playersTable)
          .set({ puuid: p.puuid })
          .where(and(eq(playersTable.id, byRiot), eq(playersTable.riotId, p.riotId)))
          .then(() => undefined)
      );
    }
  }
  if (puuidBackfills.length > 0) {
    await Promise.all(puuidBackfills);
  }

  return { teamId: bestTeamId, matchedPlayers };
}

/**
 * Convenience: resolve teamId to team name for embed display.
 * Returns null if teamId is null or team not found.
 */
export async function resolveTeamName(teamId: number | null): Promise<string | null> {
  if (teamId === null) return null;
  const [team] = await db
    .select({ name: teamsTable.name, tag: teamsTable.tag })
    .from(teamsTable)
    .where(eq(teamsTable.id, teamId));
  return team ? `${team.name} [${team.tag}]` : null;
}
