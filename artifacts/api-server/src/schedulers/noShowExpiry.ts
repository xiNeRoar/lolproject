import { db } from "@workspace/db";
import { challengesTable, ladderSettingsTable } from "@workspace/db";
import { eq, and, isNull, lte } from "drizzle-orm";
import { notifyPlayer } from "../lib/notifications";

async function expireNoShows() {
  try {
    const [settings] = await db.select().from(ladderSettingsTable).limit(1);
    const noShowExpiryDays = settings?.noShowExpiryDays ?? 7;

    const cutoff = new Date(Date.now() - noShowExpiryDays * 24 * 60 * 60 * 1000);

    const expired = await db
      .update(challengesTable)
      .set({ status: "expired_no_show", updatedAt: new Date() })
      .where(
        and(
          eq(challengesTable.status, "accepted"),
          isNull(challengesTable.gameId),
          lte(challengesTable.updatedAt, cutoff)
        )
      )
      .returning();

    for (const c of expired) {
      notifyPlayer(c.challengerId, "no_show_flagged", "No-Show", "A challenge has expired due to no-show.").catch(() => {});
      notifyPlayer(c.challengedId, "no_show_flagged", "No-Show", "A challenge has expired due to no-show.").catch(() => {});
    }
    if (expired.length > 0) {
      console.log(`[no-show] Expired ${expired.length} challenge(s)`);
    }
  } catch (err) {
    console.error("[no-show] Scheduler error:", err);
  }
}

export function startNoShowScheduler() {
  // Run every hour
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(expireNoShows, ONE_HOUR);
  // Also run immediately on startup
  expireNoShows();
  console.log("[no-show] Scheduler started (every 1h)");
}
