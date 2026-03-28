/**
 * .rofl file cleanup scheduler (Issue #31).
 * Deletes .rofl files after the 14-day patch window expires.
 * Keeps DB metadata; only removes the file from disk.
 */

import { db } from "@workspace/db";
import { matchesTable } from "@workspace/db";
import { and, lt, isNotNull } from "drizzle-orm";
import { existsSync, unlinkSync } from "fs";
import { eq } from "drizzle-orm";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

export function startRoflCleanupScheduler(): void {
  const run = async () => {
    try {
      const cutoff = new Date(Date.now() - FOURTEEN_DAYS_MS);
      const expired = await db
        .select({ id: matchesTable.id, roflFilePath: matchesTable.roflFilePath })
        .from(matchesTable)
        .where(and(isNotNull(matchesTable.roflFilePath), lt(matchesTable.createdAt, cutoff)));

      let deleted = 0;
      for (const match of expired) {
        if (match.roflFilePath && existsSync(match.roflFilePath)) {
          try {
            unlinkSync(match.roflFilePath);
            deleted++;
          } catch { /* file already gone */ }
        }
        await db
          .update(matchesTable)
          .set({ roflFilePath: null })
          .where(eq(matchesTable.id, match.id));
      }

      if (deleted > 0)
        console.log(`[rofl-cleanup] Deleted ${deleted} expired replay file(s)`);
    } catch (err) {
      console.error("[rofl-cleanup] Error:", err);
    }
  };

  setInterval(run, 24 * 60 * 60 * 1000); // daily
  console.log("[rofl-cleanup] Scheduler started (24h interval)");
}
