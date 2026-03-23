/**
 * Re-export from shared @workspace/rofl-parse package.
 * The canonical implementation lives in lib/rofl-parse/src/team-matcher.ts.
 */
export { matchTeams, resolveTeamName } from "@workspace/rofl-parse";
export type { MatchedPlayer, SideMatch, TeamMatchResult } from "@workspace/rofl-parse";
