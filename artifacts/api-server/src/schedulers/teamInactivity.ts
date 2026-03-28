/**
 * Team auto-inactive scheduler (Issue #13).
 * PRD Section 8: teams with no match in 30 days removed from leaderboard.
 * Runs every 6 hours. Teams reactivate when a new match is submitted.
 */

import { db } from "@workspace/db";
import { teamsTable } from "@workspace/db";
import { eq, and, lt, isNotNull } from "drizzle-orm";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const INTERVAL_MS = 6 * 60 * 60 * 1000;

export function startTeamInactivityScheduler(): void {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - THIRTY_DAYS_MS);
      const result = await db
        .update(teamsTable)
        .set({ isActive: false, updatedAt: new Date() })
        .where(and(
          eq(teamsTable.isActive, true),
          isNotNull(teamsTable.lastMatchAt),
          lt(teamsTable.lastMatchAt, cutoff)
        ))
        .returning({ id: teamsTable.id });
      if (result.length > 0)
        console.log(`[inactivity] Deactivated ${result.length} team(s) inactive for 30+ days`);
    } catch (err) {
      console.error("[inactivity] Error:", err);
    }
  };
  run(); // run immediately on startup
  setInterval(run, INTERVAL_MS);
  console.log("[inactivity] Scheduler started (6h interval)");
}
