/**
 * Team auto-inactive scheduler.
 *
 * PRD Section 8: teams with no match in 30 days are removed from the leaderboard.
 * Runs every 6 hours. Sets teams.isActive = false when lastMatchAt < 30 days ago.
 * Teams reactivate automatically when a new match is submitted (lastMatchAt updated).
 */

import { db } from "@workspace/db";
import { teamsTable } from "@workspace/db";
import { eq, and, lt, isNotNull } from "drizzle-orm";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function startTeamInactivityScheduler(): void {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
      const result = await db
        .update(teamsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(
          and(
            eq(teamsTable.isActive, true),
            isNotNull(teamsTable.lastMatchAt),
            lt(teamsTable.lastMatchAt, cutoff)
          )
        )
        .returning({ id: teamsTable.id });

      if (result.length > 0) {
        console.log(`[inactivity] Deactivated ${result.length} team(s) with no match in 30 days`);
      }
    } catch (err) {
      console.error("[inactivity] Scheduler error:", err);
    }
  };

  // Run immediately on startup, then on interval
  run();
  setInterval(run, CHECK_INTERVAL_MS);
  console.log("[inactivity] Team inactivity scheduler started (6h interval)");
}
