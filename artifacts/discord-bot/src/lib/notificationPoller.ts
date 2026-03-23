/**
 * Notification Poller — BOT_SPEC §Notification Poller (lines 357-373)
 *
 * Polls the notifications table every 60 seconds and sends Discord DMs
 * for players whose notificationPreference is "discord" or "both".
 *
 * Runs on startup and then on a 60-second interval.
 * Processes in batches of 10 with a 1-second delay between batches
 * to respect Discord's rate limit of 5 DMs/second.
 *
 * Inner loop: drains the entire pending queue per cycle, not just one batch.
 */

import { type Client, EmbedBuilder } from "discord.js";
import { db, notificationsTable, playersTable } from "./db.js";
import { eq, and } from "drizzle-orm";

const POLL_INTERVAL_MS = 60 * 1000; // 60 seconds
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000; // 1 second between DM sends
const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";

/** Embed color by notification type — matches web theme. */
const NOTIF_COLORS: Record<string, number> = {
  match_result: 0x5865f2,    // primary blue
  roster_change: 0xfee75c,   // yellow
  badge_earned: 0x57f287,    // green
  no_show_flagged: 0xed4245, // red
  season_completed: 0x5865f2,
  event_registration_confirmed: 0x57f287,
};

let isShuttingDown = false;

/** Call on SIGTERM/SIGINT to stop the poller from starting new batches. */
export function stopNotificationPoller(): void {
  isShuttingDown = true;
}

export function startNotificationPoller(client: Client): void {
  async function poll() {
    if (isShuttingDown) return;

    try {
      let totalProcessed = 0;

      // Inner loop: keep fetching batches until queue is drained or shutdown requested
      while (!isShuttingDown) {
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

        if (pending.length === 0) break; // Queue drained

        for (const notif of pending) {
          if (isShuttingDown) break;

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
            await db
              .update(notificationsTable)
              .set({ dmFailed: true })
              .where(eq(notificationsTable.id, notif.id));
            continue;
          }

          // Skip DM if player has no discordId or prefers web-only.
          // Mark dmSent=true so the notification exits the pending queue.
          if (!player.discordId) {
            await db
              .update(notificationsTable)
              .set({ dmSent: true })
              .where(eq(notificationsTable.id, notif.id));
            continue;
          }

          const pref = player.notificationPreference ?? "web";
          if (pref !== "discord" && pref !== "both") {
            await db
              .update(notificationsTable)
              .set({ dmSent: true })
              .where(eq(notificationsTable.id, notif.id));
            continue;
          }

          // Rate limit: 1-second delay between DM sends
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));

          try {
            const user = await client.users.fetch(player.discordId);
            const dmEmbed = new EmbedBuilder()
              .setColor(NOTIF_COLORS[notif.type] ?? 0x5865f2)
              .setTitle(notif.title)
              .setDescription(notif.message)
              .setFooter({ text: PLATFORM_URL })
              .setTimestamp();
            await user.send({ embeds: [dmEmbed] });
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

        totalProcessed += pending.length;

        // If batch was smaller than BATCH_SIZE, queue is fully drained
        if (pending.length < BATCH_SIZE) break;
      }

      if (totalProcessed > 0) {
        console.log(`[poller] Processed ${totalProcessed} notification(s)`);
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
