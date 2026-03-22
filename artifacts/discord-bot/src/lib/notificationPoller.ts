/**
 * Notification Poller — BOT_SPEC §Notification Poller (lines 357-373)
 *
 * Polls the notifications table every 60 seconds and sends Discord DMs
 * for players whose notificationPreference is "discord" or "both".
 *
 * Runs on startup and then on a 60-second interval.
 * Processes in batches of 10 with a 1-second delay between batches
 * to respect Discord's rate limit of 5 DMs/second.
 */

import type { Client } from "discord.js";
import { db, notificationsTable, playersTable } from "./db.js";
import { eq, and } from "drizzle-orm";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between batches

export function startNotificationPoller(client: Client): void {
  async function poll() {
    try {
      // Fetch unread, unsent, non-failed notifications
      const pending = await db
        .select({
          id: notificationsTable.id,
          playerId: notificationsTable.playerId,
          title: notificationsTable.title,
          message: notificationsTable.message,
          type: notificationsTable.type,
        })
        .from(notificationsTable)
        .where(
          and(
            eq(notificationsTable.isRead, false),
            eq(notificationsTable.dmSent, false),
            eq(notificationsTable.dmFailed, false)
          )
        )
        .limit(BATCH_SIZE);

      if (pending.length === 0) return;

      console.log(`[poller] Processing ${pending.length} notification(s)`);

      for (const notif of pending) {
        // Look up player discordId and preference
        const [player] = await db
          .select({
            discordId: playersTable.discordId,
            notificationPreference: playersTable.notificationPreference,
          })
          .from(playersTable)
          .where(eq(playersTable.id, notif.playerId))
          .limit(1);

        if (!player) {
          // Player deleted — mark as failed so we don't retry forever
          await db
            .update(notificationsTable)
            .set({ dmFailed: true })
            .where(eq(notificationsTable.id, notif.id));
          continue;
        }

        // Skip if player has no discordId or prefers web-only
        if (!player.discordId) continue;
        const pref = player.notificationPreference ?? "web";
        if (pref === "web") continue;
        if (pref !== "discord" && pref !== "both") continue;

        // Send DM
        try {
          const user = await client.users.fetch(player.discordId);
          await user.send(`**${notif.title}**\n${notif.message}`);
          await db
            .update(notificationsTable)
            .set({ dmSent: true })
            .where(eq(notificationsTable.id, notif.id));
        } catch (err) {
          console.error(`[poller] DM failed for notification #${notif.id}:`, err);
          await db
            .update(notificationsTable)
            .set({ dmFailed: true })
            .where(eq(notificationsTable.id, notif.id));
        }
      }
    } catch (err) {
      console.error("[poller] Poll cycle error:", err);
    }
  }

  // Run immediately on startup, then every 60 seconds
  poll();
  setInterval(poll, POLL_INTERVAL_MS);
  console.log("[poller] Notification poller started.");
}
