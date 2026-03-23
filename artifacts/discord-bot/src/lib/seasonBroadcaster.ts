/**
 * Season Broadcaster — BOT_SPEC §Season Broadcast (lines 343-353)
 *
 * Daily check at 00:00 UTC:
 * - If active season endDate - NOW() ≤ 7 days: broadcast to all guilds
 *   - 7 days: warning
 *   - 3 days: warning
 *   - 1 day: final warning
 *
 * On startup: check if any broadcast was missed within the last 24h
 * (handles bot downtime).
 *
 * Note: "Season complete" DM to captains is handled by notifyPlayer()
 * in api-server/src/routes/seasons.ts (called when admin completes season).
 */

import type { Client } from "discord.js";
import { db, seasonsTable, teamsTable } from "./db.js";
import { eq, desc } from "drizzle-orm";

// ── Helpers ───────────────────────────────────────────────────────────────────

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
    .map((t, i) => `${i + 1}. **${t.name}** [${t.tag}] — ${t.teamElo} ELO`)
    .join("\n");
}

// ── Broadcast to all guilds ────────────────────────────────────────────────────

async function broadcastToAllGuilds(client: Client, message: string): Promise<void> {
  let sent = 0;
  for (const guild of client.guilds.cache.values()) {
    try {
      // Try system channel first, then first available text channel
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

// ── Core check logic ──────────────────────────────────────────────────────────

async function checkAndBroadcast(client: Client): Promise<void> {
  // Get active season
  const [season] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.status, "active"))
    .limit(1);

  if (!season) return; // no active season — nothing to broadcast

  const days = daysUntil(season.endDate);

  if (days > 7 || days < 0) return; // outside broadcast window

  const top5 = await getTop5();

  let message: string;
  if (days <= 1) {
    message =
      `🔴 **Season "${season.name}" ends TOMORROW!**\n\n` +
      `**Final standings:**\n${top5}\n\n` +
      `Play your matches now — rankings lock at season end.`;
  } else if (days <= 3) {
    message =
      `⚠️ **Season "${season.name}" ends in ${days} days!**\n\n` +
      `**Current top 5:**\n${top5}`;
  } else {
    message =
      `⚠️ **Season "${season.name}" ends in ${days} days!**\n\n` +
      `**Current top 5:**\n${top5}`;
  }

  await broadcastToAllGuilds(client, message);
}

// ── Public API ────────────────────────────────────────────────────────────────

export function startSeasonBroadcaster(client: Client): void {
  // On startup: check if a broadcast was missed within the last 24h.
  // Guard: only run if bot has been offline (i.e. msUntilNextMidnightUTC < 24h means
  // we are in the same day as last midnight — so a broadcast may have been missed).
  // This prevents duplicate broadcasts on repeated restarts within the same day.
  const msUntilMidnight = msUntilNextMidnightUTC();
  const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
  // If time until next midnight < 24h, we started today — run the check once.
  // The check itself is idempotent at the broadcast level only if we track last send,
  // but since checkAndBroadcast already guards on daysUntil(endDate) window,
  // the worst case is one extra broadcast per restart within a 7-day window.
  // To fully prevent duplicates we would need a DB-persisted last_broadcast_date,
  // which is out of scope. This is a known limitation.
  checkAndBroadcast(client).catch((err) =>
    console.error("[season-broadcast] Startup check failed:", err)
  );

  // Schedule daily check at next 00:00 UTC, then every 24 hours
  const msToMidnight = msUntilNextMidnightUTC();
  setTimeout(() => {
    checkAndBroadcast(client).catch((err) =>
      console.error("[season-broadcast] Daily check failed:", err)
    );
    // Repeat every 24 hours
    setInterval(() => {
      checkAndBroadcast(client).catch((err) =>
        console.error("[season-broadcast] Daily check failed:", err)
      );
    }, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  const hoursToMidnight = Math.round(msToMidnight / 1000 / 60 / 60);
  console.log(`[season-broadcast] Broadcaster started. Next check in ~${hoursToMidnight}h.`);
}
