/**
 * Notification Poller — BOT_SPEC §Notification Poller
 *
 * Polls the notifications table every 60 seconds and sends Discord DMs
 * for players whose notificationPreference is "discord" or "both".
 *
 * Retry logic (v3.1): transient DM failures are retried up to MAX_RETRIES
 * times with exponential backoff. After MAX_RETRIES, permanently marked dmFailed.
 */

import { type Client, EmbedBuilder } from "discord.js";
import { db, notificationsTable, playersTable } from "./db.js";
import { eq, and, or, lt, isNull, sql } from "drizzle-orm";

const POLL_INTERVAL_MS = 60 * 1000;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 1000;
const MAX_RETRIES = 3;
const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";

const NOTIF_COLORS: Record<string, number> = {
  match_result: 0x5865f2,
  roster_change: 0xfee75c,
  badge_earned: 0x57f287,
  no_show_flagged: 0xed4245,
  season_completed: 0x5865f2,
  event_registration_confirmed: 0x57f287,
};

let isShuttingDown = false;

export function stopNotificationPoller(): void {
  isShuttingDown = true;
}

/** Calculate backoff: skip if last attempt was less than 2^retryCount minutes ago. */
function isBackoffElapsed(retryCount: number, lastAttempt: Date | null): boolean {
  if (!lastAttempt || retryCount === 0) return true;
  const backoffMs = Math.pow(2, retryCount) * 60 * 1000; // 2min, 4min, 8min
  return Date.now() >= lastAttempt.getTime() + backoffMs;
}

export function startNotificationPoller(client: Client): void {
  async function poll() {
    if (isShuttingDown) return;

    try {
      let totalProcessed = 0;

      while (!isShuttingDown) {
        // Fetch pending: not sent, not permanently failed (retryCount < MAX_RETRIES)
        const pending = await db
          .select({
            id: notificationsTable.id,
            playerId: notificationsTable.playerId,
            title: notificationsTable.title,
            message: notificationsTable.message,
            type: notificationsTable.type,
            dmRetryCount: notificationsTable.dmRetryCount,
            lastDmAttemptAt: notificationsTable.lastDmAttemptAt,
          })
          .from(notificationsTable)
          .where(
            and(
              eq(notificationsTable.isRead, false),
              eq(notificationsTable.dmSent, false),
              eq(notificationsTable.dmFailed, false),
              lt(notificationsTable.dmRetryCount, MAX_RETRIES)
            )
          )
          .limit(BATCH_SIZE);

        if (pending.length === 0) break;

        for (const notif of pending) {
          if (isShuttingDown) break;

          // Exponential backoff check
          if (!isBackoffElapsed(notif.dmRetryCount, notif.lastDmAttemptAt)) continue;

          const [player] = await db
            .select({
              discordId: playersTable.discordId,
              notificationPreference: playersTable.notificationPreference,
            })
            .from(playersTable)
            .where(eq(playersTable.id, notif.playerId))
            .limit(1);

          if (!player) {
            await db.update(notificationsTable)
              .set({ dmFailed: true })
              .where(eq(notificationsTable.id, notif.id));
            continue;
          }

          if (!player.discordId) {
            await db.update(notificationsTable)
              .set({ dmSent: true })
              .where(eq(notificationsTable.id, notif.id));
            continue;
          }

          const pref = player.notificationPreference ?? "web";
          if (pref !== "discord" && pref !== "both") {
            await db.update(notificationsTable)
              .set({ dmSent: true })
              .where(eq(notificationsTable.id, notif.id));
            continue;
          }

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
            await db.update(notificationsTable)
              .set({ dmSent: true })
              .where(eq(notificationsTable.id, notif.id));
          } catch (err) {
            const newRetryCount = notif.dmRetryCount + 1;
            const isPermanentFailure = newRetryCount >= MAX_RETRIES;

            console.error(
              `[poller] DM failed for #${notif.id} (attempt ${newRetryCount}/${MAX_RETRIES}):`,
              err
            );

            await db.update(notificationsTable)
              .set({
                dmRetryCount: newRetryCount,
                lastDmAttemptAt: new Date(),
                dmFailed: isPermanentFailure,
              })
              .where(eq(notificationsTable.id, notif.id));
          }
        }

        totalProcessed += pending.length;
        if (pending.length < BATCH_SIZE) break;
      }

      if (totalProcessed > 0) {
        console.log(`[poller] Processed ${totalProcessed} notification(s)`);
      }
    } catch (err) {
      console.error("[poller] Poll cycle error:", err);
    }
  }

  poll();
  setInterval(poll, POLL_INTERVAL_MS);
  console.log("[poller] Notification poller started.");
}
