/**
 * Shared helpers for building match display names.
 * Used by both the Discord bot /submit and POST /api/matches/submit-rofl.
 */

import { db } from "@workspace/db";
import { teamsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Build a display name for one side of a match.
 * If teamId is known: "TeamName [TAG]"
 * Otherwise: first player's Riot game name
 */
export async function buildSideName(
  teamId: number | null,
  players: { riotIdGameName: string }[]
): Promise<string> {
  if (teamId !== null) {
    const [team] = await db
      .select({ name: teamsTable.name, tag: teamsTable.tag })
      .from(teamsTable)
      .where(eq(teamsTable.id, teamId));
    if (team) return `${team.name} [${team.tag}]`;
  }
  return players[0]?.riotIdGameName ?? "Unknown";
}
