/**
 * Team Inactivity Scheduler — PRD §8
 *
 * Teams with no match in 30 days → isActive=false (off leaderboard).
 * Data preserved. Runs daily at 00:00 UTC.
 * Extracted from seasonBroadcaster.ts for separation of concerns.
 */

import { db, teamsTable } from "./db.js";
import { eq, and, sql } from "drizzle-orm";

const TEAM_INACTIVITY_DAYS = 30;

/** Deactivate teams with no match in TEAM_INACTIVITY_DAYS days. */
export async function deactivateInactiveTeams(): Promise<void> {
  const cutoff = new Date(Date.now() - TEAM_INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  const deactivated = await db
    .update(teamsTable)
    .set({ isActive: false })
    .where(
      and(
        eq(teamsTable.isActive, true),
        sql`(${teamsTable.lastMatchAt} < ${cutoff} OR (${teamsTable.lastMatchAt} IS NULL AND ${teamsTable.createdAt} < ${cutoff}))`
      )
    )
    .returning({ id: teamsTable.id, name: teamsTable.name });

  if (deactivated.length > 0) {
    console.log(
      `[team-inactivity] Deactivated ${deactivated.length} team(s): ${deactivated.map((t) => t.name).join(", ")}`
    );
  }
}

function msUntilNextMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0
  ));
  return midnight.getTime() - now.getTime();
}

/** Start daily team inactivity check at 00:00 UTC. */
export function startTeamInactivityScheduler(): void {
  // Run immediately on startup
  deactivateInactiveTeams().catch((err) =>
    console.error("[team-inactivity] Startup check failed:", err)
  );

  // Schedule at next midnight UTC, then every 24h
  const msToMidnight = msUntilNextMidnightUTC();
  setTimeout(() => {
    deactivateInactiveTeams().catch((err) =>
      console.error("[team-inactivity] Daily check failed:", err)
    );
    setInterval(() => {
      deactivateInactiveTeams().catch((err) =>
        console.error("[team-inactivity] Daily check failed:", err)
      );
    }, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  const hoursToMidnight = Math.round(msToMidnight / 1000 / 60 / 60);
  console.log(`[team-inactivity] Scheduler started. Next check in ~${hoursToMidnight}h.`);
}
