/**
 * @workspace/rofl-parse — shared ROFL2 parsing pipeline
 *
 * Used by both the Discord bot (direct import) and the API server
 * (POST /api/matches/submit-rofl fallback endpoint for >8MB files).
 */

export { parseRofl, parseRoflFile, RoflParseError } from "./rofl-parser.js";
export type { RoflPlayer, RoflMatch } from "./rofl-parser.js";

export { matchTeams, resolveTeamName } from "./team-matcher.js";
export type { MatchedPlayer, SideMatch, TeamMatchResult } from "./team-matcher.js";

export { calculateElo, softResetElo } from "./elo.js";
