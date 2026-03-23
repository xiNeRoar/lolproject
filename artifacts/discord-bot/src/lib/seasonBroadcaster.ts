/**
 * Season Broadcaster -- BOT_SPEC §Season Broadcast (lines 343-353)
 *
 * Daily check at 00:00 UTC: if active season endDate <= 7 days away, broadcast
 * warning to all guilds.
 *
 * Guard: last_broadcast_date in bot_heartbeats prevents duplicate broadcasts
 * on same-day bot restarts (fixes #151).
 *
 * Note: "Season complete" DM to captains is handled by notifyPlayer()
 * in api-server/src/routes/seasons.ts.
 */

import type { Client } from "discord.js";
import { db, seasonsTable, teamsTable, botHeartbeatsTable } from "./db.js";
import { eq, desc } from "drizzle-orm";

// -- Helpers ------------------------------------------------------------------

/** Today's UTC date as ISO date string, e.g. "2026-03-23" */
function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function msUntilNextMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return midnight.getTime() - now.getTime();
}

async function getTop5(): Promise<string> {
  const teams = await db
    .select({ name: teamsTable.name, tag: teamsTable.tag, teamElo: teamsTable.teamElo })
    .from(teamsTable)
    .where(eq(teamsTable.isActive, true))
    .orderBy(desc(teamsTable.teamElo))
    .limit(5);

  if (teams.length === 0) return "No active teams yet.";

  return teams
    .map((t, i) => `${i + 1}. **${t.name}** [${t.tag}] -- ${t.teamElo} ELO`)
    .join("\n");
}

/** Read last broadcast date from the most recent bot_heartbeats row. */
async function getLastBroadcastDate(): Promise<string | null> {
  const [row] = await db
    .select({ lastBroadcastDate: botHeartbeatsTable.lastBroadcastDate })
    .from(botHeartbeatsTable)
    .orderBy(desc(botHeartbeatsTable.timestamp))
    .limit(1);
  return row?.lastBroadcastDate ?? null;
}

/** Insert a new heartbeat row recording today as the broadcast date. */
async function recordBroadcastDate(today: string): Promise<void> {
  await db.insert(botHeartbeatsTable).values({ timestamp: new Date(), lastBroadcastDate: today });
}

// -- Broadcast to all guilds --------------------------------------------------

async function broadcastToAllGuilds(client: Client, message: string): Promise<void> {
  let sent = 0;
  for (const guild of client.guilds.cache.values()) {
    try {
      const channel =
        (guild.systemChannel?.permissionsFor(guild.members.me!)?.has("SendMessages")
          ? guild.systemChannel
          : null) ??
        guild.channels.cache.find(
          (c) =>
            c.isTextBased() &&
            !c.isDMBased() &&
            (c as any).permissionsFor?.(guild.members.me!)?.has("SendMessages")
        );
      if (!channel || !channel.isTextBased()) continue;
      await (channel as any).send(message);
      sent++;
    } catch (err) {
      console.error(`[season-broadcast] Failed to send to guild ${guild.id}:`, err);
    }
  }
  console.log(`[season-broadcast] Broadcast sent to ${sent}/${client.guilds.cache.size} guilds.`);
}

// -- Core check ---------------------------------------------------------------

/**
 * Check if a broadcast is needed today and send it if so.
 * Idempotent: if last_broadcast_date == today, returns immediately without sending.
 */
async function checkAndBroadcast(client: Client): Promise<void> {
  const today = todayUTC();

  // Duplicate-broadcast guard
  const lastDate = await getLastBroadcastDate();
  if (lastDate === today) {
    console.log("[season-broadcast] Already broadcast today -- skipping.");
    return;
  }

  const [season] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.status, "active"))
    .limit(1);

  if (!season) return;

  const days = daysUntil(season.endDate);
  if (days > 7 || days < 0) return;

  const top5 = await getTop5();

  let message: string;
  if (days <= 1) {
    message =
      `Season "${season.name}" ends TOMORROW!\n\n` +
      `Final standings:\n${top5}\n\n` +
      `Play your matches now -- rankings lock at season end.`;
  } else {
    message =
      `Season "${season.name}" ends in ${days} days!\n\n` +
      `Current top 5:\n${top5}`;
  }

  await broadcastToAllGuilds(client, message);

  // Record today so same-day restarts skip the broadcast
  await recordBroadcastDate(today).catch((err) =>
    console.error("[season-broadcast] Failed to record broadcast date:", err)
  );
}

// -- Public API ---------------------------------------------------------------

export function startSeasonBroadcaster(client: Client): void {
  // On startup: broadcast if not yet sent today (handles missed midnight broadcast).
  // Bot restarts within the same UTC day are safely no-ops via lastBroadcastDate guard.
  checkAndBroadcast(client).catch((err) =>
    console.error("[season-broadcast] Startup check failed:", err)
  );

  // Schedule daily check at next 00:00 UTC, then every 24 hours
  const msToMidnight = msUntilNextMidnightUTC();
  setTimeout(() => {
    checkAndBroadcast(client).catch((err) =>
      console.error("[season-broadcast] Daily check failed:", err)
    );
    setInterval(() => {
      checkAndBroadcast(client).catch((err) =>
        console.error("[season-broadcast] Daily check failed:", err)
      );
    }, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  const hoursToMidnight = Math.round(msToMidnight / 1000 / 60 / 60);
  console.log(`[season-broadcast] Broadcaster started. Next check in ~${hoursToMidnight}h.`);
}
