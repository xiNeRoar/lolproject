/**
 * Roster inactivity check (PRD §8).
 * After a match is submitted, check each team's active roster members.
 * If a member has been absent from the last N team matches, mark them inactive.
 * Extracted from submit.ts for maintainability.
 */

import { db } from "./db.js";
import {
  matchesTable,
  matchPlayersTable,
  teamMembersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, inArray, or, desc } from "drizzle-orm";

export const INACTIVITY_THRESHOLD = 5;

export async function checkRosterInactivity(
  teamIds: number[],
  currentMatchId: number
): Promise<void> {
  for (const teamId of teamIds) {
    const recentMatches = await db
      .select({ id: matchesTable.id })
      .from(matchesTable)
      .where(
        or(
          eq(matchesTable.teamAId, teamId),
          eq(matchesTable.teamBId, teamId)
        )
      )
      .orderBy(desc(matchesTable.createdAt))
      .limit(INACTIVITY_THRESHOLD);

    if (recentMatches.length < INACTIVITY_THRESHOLD) continue;

    const recentMatchIds = recentMatches.map((m) => m.id);

    const activeMembers = await db
      .select({ playerId: teamMembersTable.playerId, membershipId: teamMembersTable.id })
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.teamId, teamId),
          eq(teamMembersTable.status, "active")
        )
      );

    for (const member of activeMembers) {
      const appearances = await db
        .select({ id: matchPlayersTable.id })
        .from(matchPlayersTable)
        .where(
          and(
            eq(matchPlayersTable.playerId, member.playerId),
            inArray(matchPlayersTable.matchId, recentMatchIds)
          )
        )
        .limit(1);

      if (appearances.length === 0) {
        await db
          .update(teamMembersTable)
          .set({ status: "inactive" })
          .where(eq(teamMembersTable.id, member.membershipId));

        console.log(
          `[roster-inactivity] Player ${member.playerId} marked inactive on team ${teamId} (${INACTIVITY_THRESHOLD} consecutive absences)`
        );

        await db.insert(notificationsTable).values({
          playerId: member.playerId,
          type: "no_show_flagged",
          title: "Roster status updated",
          message: `You have been marked inactive on your team after missing ${INACTIVITY_THRESHOLD} consecutive matches. Submit a new match or contact your captain to rejoin.`,
          isRead: false,
          dmSent: false,
          dmFailed: false,
        });
      }
    }
  }
}
