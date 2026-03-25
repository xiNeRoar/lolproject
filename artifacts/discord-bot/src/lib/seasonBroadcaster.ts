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

import { type Client, EmbedBuilder, AttachmentBuilder } from "discord.js";
import { db, seasonsTable, teamsTable, botHeartbeatsTable } from "./db.js";
import { eq, desc, and, lt, sql } from "drizzle-orm";
import { renderLeaderboard } from "./leaderboardRenderer.js";
import type { LeaderboardEntry } from "./leaderboardRenderer.js";

const PLATFORM_URL = process.env.PLATFORM_URL ?? "https://vclol.gg";

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

async function getTop5(): Promise<LeaderboardEntry[]> {
  const teams = await db
    .select({ name: teamsTable.name, tag: teamsTable.tag, teamElo: teamsTable.teamElo, wins: teamsTable.wins, losses: teamsTable.losses })
    .from(teamsTable)
    .where(eq(teamsTable.isActive, true))
    .orderBy(desc(teamsTable.wins))
    .limit(5);

  return teams.map((t, i) => ({
    position: i + 1, teamName: t.name, teamTag: t.tag,
    elo: t.teamElo, wins: t.wins, losses: t.losses,
  }));
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

async function broadcastToAllGuilds(client: Client, options: { embeds: EmbedBuilder[]; files?: AttachmentBuilder[] }): Promise<void> {
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
      await (channel as any).send(options);
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

  const entries = await getTop5();
  const subtitle = days <= 1
    ? "Rankings lock at season end. Play your matches now!"
    : `${days} days remaining.`;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(days <= 1 ? `Season "${season.name}" ends TOMORROW!` : `Season "${season.name}" — ${days} days left`)
    .setFooter({ text: PLATFORM_URL });

  const sendOpts: { embeds: EmbedBuilder[]; files?: AttachmentBuilder[] } = { embeds: [embed] };

  if (entries.length === 0) {
    embed.setDescription(subtitle + "\n\nNo active teams yet.");
  } else {
    try {
      const imgBuf = await renderLeaderboard({
        seasonName: season.name, daysRemaining: days, entries, platformUrl: PLATFORM_URL,
      });
      const att = new AttachmentBuilder(imgBuf, { name: "leaderboard.png" });
      embed.setImage("attachment://leaderboard.png");
      embed.setDescription(subtitle);
      sendOpts.files = [att];
    } catch (err) {
      console.error("[season-broadcast] Leaderboard render failed:", err);
      const textList = entries.map((e: LeaderboardEntry) => `${e.position}. **${e.teamName}** [${e.teamTag}] — ${e.wins}W/${e.losses}L`).join("\n");
      embed.setDescription(`${subtitle}\n\nCurrent top 5:\n${textList}`);
    }
  }

  await broadcastToAllGuilds(client, sendOpts);

  // Record today so same-day restarts skip the broadcast
  await recordBroadcastDate(today).catch((err) =>
    console.error("[season-broadcast] Failed to record broadcast date:", err)
  );
}

// -- Public API ---------------------------------------------------------------

const TEAM_INACTIVITY_DAYS = 30;

/**
 * PRD §8: Teams with no match in 30 days → isActive=false (off leaderboard).
 * Data preserved. Runs daily alongside season broadcast.
 */
async function deactivateInactiveTeams(): Promise<void> {
  const cutoff = new Date(Date.now() - TEAM_INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  // Teams inactive if: (lastMatchAt < cutoff) OR (lastMatchAt IS NULL AND createdAt < cutoff)
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
    console.log(`[team-inactivity] Deactivated ${deactivated.length} team(s): ${deactivated.map((t) => t.name).join(", ")}`);
  }
}

export function startSeasonBroadcaster(client: Client): void {
  // On startup: run both checks
  deactivateInactiveTeams().catch((err) =>
    console.error("[team-inactivity] Startup check failed:", err)
  );
  checkAndBroadcast(client).catch((err) =>
    console.error("[season-broadcast] Startup check failed:", err)
  );

  // Schedule daily check at next 00:00 UTC, then every 24 hours
  const msToMidnight = msUntilNextMidnightUTC();
  setTimeout(() => {
    deactivateInactiveTeams().catch((err) =>
      console.error("[team-inactivity] Daily check failed:", err)
    );
    checkAndBroadcast(client).catch((err) =>
      console.error("[season-broadcast] Daily check failed:", err)
    );
    setInterval(() => {
      deactivateInactiveTeams().catch((err) =>
        console.error("[team-inactivity] Daily check failed:", err)
      );
      checkAndBroadcast(client).catch((err) =>
        console.error("[season-broadcast] Daily check failed:", err)
      );
    }, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  const hoursToMidnight = Math.round(msToMidnight / 1000 / 60 / 60);
  console.log(`[season-broadcast] Broadcaster started. Next check in ~${hoursToMidnight}h.`);
}
