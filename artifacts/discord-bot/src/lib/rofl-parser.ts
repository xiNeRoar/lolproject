/**
 * Re-export from shared @workspace/rofl-parse package.
 * The canonical implementation lives in lib/rofl-parse/src/rofl-parser.ts.
 */
export { parseRofl, parseRoflFile, RoflParseError } from "@workspace/rofl-parse";
export type { RoflPlayer, RoflMatch } from "@workspace/rofl-parse";
