import { db, pool } from "@workspace/db";
import {
  adminUsersTable,
  eventsTable,
  matchesTable,
  vodEntriesTable,
  playersTable,
  seasonsTable,
  ladderSettingsTable,
  eloHistoryTable,
  seasonChampionsTable,
  challengesTable,
  eventRegistrationsTable,
  playerBadgesTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function seed() {
  console.log("Seeding database (full reset)...");

  // Truncate all tables in correct FK order
  await db.execute(sql`TRUNCATE
    elo_history, season_champions, player_badges, vod_entries, vod_timestamps,
    event_registrations, challenges, matchmaking_queue, matches,
    replay_submissions, notifications,
    players, seasons, events, interest_submissions,
    ladder_settings, admin_schedule_settings, admin_users
    CASCADE`);

  // Admin
  await db.insert(adminUsersTable).values({
    email: "admin@vclol.gg",
    passwordHash: hashPassword("admin123"),
  });
  console.log("Created admin: admin@vclol.gg / admin123");

  // Ladder Settings
  await db.insert(ladderSettingsTable).values({});
  console.log("Created default ladder settings");

  // Season
  const [season] = await db.insert(seasonsTable).values({
    name: "Season 1 — Spring 2026",
    status: "active",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    eloResetFactor: "0.50",
  }).returning();
  console.log("Created Season 1");

  // Players (12 players — enough for a realistic ladder)
  const playerData = [
    { riotId: "xiNe#NA1", discordUsername: "xine", discordId: "100001", currentElo: 1280, wins: 8, losses: 3 },
    { riotId: "TwitchArcher#NA1", discordUsername: "twitcharcher", discordId: "100002", currentElo: 1220, wins: 7, losses: 4 },
    { riotId: "VoidWalker#NA1", discordUsername: "voidwalker", discordId: "100003", currentElo: 1180, wins: 6, losses: 4 },
    { riotId: "SteelMind#NA1", discordUsername: "steelmind", discordId: "100004", currentElo: 1150, wins: 6, losses: 5 },
    { riotId: "CloudRift#NA1", discordUsername: "cloudrift", discordId: "100005", currentElo: 1120, wins: 5, losses: 4 },
    { riotId: "NightBlade#NA1", discordUsername: "nightblade", discordId: "100006", currentElo: 1090, wins: 5, losses: 5 },
    { riotId: "IronFlux#NA1", discordUsername: "ironflux", discordId: "100007", currentElo: 1060, wins: 4, losses: 5 },
    { riotId: "PhantomGap#NA1", discordUsername: "phantomgap", discordId: "100008", currentElo: 1030, wins: 4, losses: 6 },
    { riotId: "ZenithPulse#NA1", discordUsername: "zenithpulse", discordId: "100009", currentElo: 1000, wins: 3, losses: 5 },
    { riotId: "BlazeKing#NA1", discordUsername: "blazeking", discordId: "100010", currentElo: 970, wins: 3, losses: 6 },
    { riotId: "FrostByte#NA1", discordUsername: "frostbyte", discordId: "100011", currentElo: 940, wins: 2, losses: 6 },
    { riotId: "DarkTide#NA1", discordUsername: "darktide", discordId: "100012", currentElo: 910, wins: 1, losses: 7 },
  ];

  const players: (typeof playersTable.$inferSelect)[] = [];
  for (const p of playerData) {
    const [row] = await db.insert(playersTable).values({
      riotId: p.riotId,
      discordUsername: p.discordUsername,
      discordId: p.discordId,
      currentElo: p.currentElo,
      peakElo: p.currentElo + 30,
      wins: p.wins,
      losses: p.losses,
      isActive: true,
    }).returning();
    players.push(row!);
  }
  console.log(`Created ${players.length} players`);

  // Events
  const [event1] = await db.insert(eventsTable).values({
    title: "VCLoL 1v1 Open — March 2026",
    slug: "vclol-1v1-open-march-2026",
    format: "1v1",
    eventDate: "2026-03-29",
    registrationStatus: "open",
    shortDescription: "Our first lightweight 1v1 test event. Open to all Vancouver / Lower Mainland players.",
    fullDescription: "Inaugural test event — lightweight 1v1 format to gather first match records. No prize pool. Competitive environment for local players to get real games and be recorded.",
    rulesSummary: "Standard Summoner's Rift 1v1. Mid lane only. First blood / first tower / 100 CS. Best of 3. Vancouver / Lower Mainland connection required.",
  }).returning();

  const [event2] = await db.insert(eventsTable).values({
    title: "VCLoL In-House — April 2026",
    slug: "vclol-in-house-april-2026",
    format: "In-house",
    eventDate: "2026-04-19",
    registrationStatus: "upcoming",
    shortDescription: "Casual in-house 5v5 for registered members. Format TBD based on player count.",
    fullDescription: "If enough interest, first in-house 5v5 event. Format confirmed based on player count.",
    rulesSummary: "TBD pending player count.",
  }).returning();
  console.log("Created 2 events");

  // Event registrations
  for (const p of players.slice(0, 8)) {
    await db.insert(eventRegistrationsTable).values({
      eventId: event1!.id,
      riotId: p.riotId,
      discordUsername: p.discordUsername,
      currentRank: "Unranked",
      city: "Vancouver",
      availabilityConfirmation: "yes",
      status: "confirmed",
      playerId: p.id,
    });
  }
  console.log("Created 8 event registrations");

  // Matches (10 matches with ELO tracking)
  const matchups = [
    { a: 0, b: 1, winner: "a", score: "2-1", title: "Quarterfinal 1" },
    { a: 2, b: 3, winner: "a", score: "2-0", title: "Quarterfinal 2" },
    { a: 4, b: 5, winner: "b", score: "1-2", title: "Quarterfinal 3" },
    { a: 6, b: 7, winner: "a", score: "2-1", title: "Quarterfinal 4" },
    { a: 0, b: 2, winner: "a", score: "2-0", title: "Semifinal 1" },
    { a: 5, b: 6, winner: "a", score: "2-1", title: "Semifinal 2" },
    { a: 0, b: 5, winner: "a", score: "2-0", title: "Grand Final" },
    { a: 1, b: 3, winner: "b", score: "0-2", title: "Ladder Match 1" },
    { a: 8, b: 9, winner: "a", score: "2-1", title: "Ladder Match 2" },
    { a: 10, b: 11, winner: "a", score: "2-0", title: "Ladder Match 3" },
  ];

  for (const m of matchups) {
    const pA = players[m.a]!;
    const pB = players[m.b]!;
    const winnerPlayer = m.winner === "a" ? pA : pB;

    const [match] = await db.insert(matchesTable).values({
      eventId: m.title.includes("Ladder") ? null : event1!.id,
      matchTitle: m.title,
      sideAName: pA.riotId,
      sideBName: pB.riotId,
      winnerName: winnerPlayer.riotId,
      score: m.score,
      format: "1v1",
      playerAId: pA.id,
      playerBId: pB.id,
      playerAEloBefore: pA.currentElo,
      playerAEloAfter: pA.currentElo + (m.winner === "a" ? 16 : -16),
      playerBEloBefore: pB.currentElo,
      playerBEloAfter: pB.currentElo + (m.winner === "b" ? 16 : -16),
      seasonId: season!.id,
      isPlayoff: m.title.includes("Final"),
    }).returning();

    // ELO history
    await db.insert(eloHistoryTable).values({
      playerId: pA.id,
      elo: pA.currentElo + (m.winner === "a" ? 16 : -16),
      delta: m.winner === "a" ? 16 : -16,
      matchId: match!.id,
      reason: "match",
    });
    await db.insert(eloHistoryTable).values({
      playerId: pB.id,
      elo: pB.currentElo + (m.winner === "b" ? 16 : -16),
      delta: m.winner === "b" ? 16 : -16,
      matchId: match!.id,
      reason: "match",
    });

    // VOD for first 4 matches
    if (matchups.indexOf(m) < 4) {
      await db.insert(vodEntriesTable).values({
        eventId: event1!.id,
        matchId: match!.id,
        title: `${pA.riotId} vs ${pB.riotId} — ${m.title}`,
        format: "1v1",
        playerNames: `${pA.riotId}, ${pB.riotId}`,
        roleTag: "Mid",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        playerId: pA.id,
        champion: "Zed",
        opponentChampion: "Yasuo",
        position: "Mid",
        patch: "14.5",
        playerEloAtTime: pA.currentElo,
      });
      await db.insert(vodEntriesTable).values({
        eventId: event1!.id,
        matchId: match!.id,
        title: `${pB.riotId} vs ${pA.riotId} — ${m.title} (POV B)`,
        format: "1v1",
        playerNames: `${pA.riotId}, ${pB.riotId}`,
        roleTag: "Mid",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        playerId: pB.id,
        champion: "Yasuo",
        opponentChampion: "Zed",
        position: "Mid",
        patch: "14.5",
        playerEloAtTime: pB.currentElo,
      });
    }
  }
  console.log("Created 10 matches + ELO history + 8 VODs");

  // Badges
  await db.insert(playerBadgesTable).values({ playerId: players[0]!.id, badgeType: "season_champion", seasonId: season!.id });
  await db.insert(playerBadgesTable).values({ playerId: players[0]!.id, badgeType: "win_streak" });
  await db.insert(playerBadgesTable).values({ playerId: players[1]!.id, badgeType: "first_blood" });
  await db.insert(playerBadgesTable).values({ playerId: players[2]!.id, badgeType: "veteran" });
  console.log("Created badges");

  // Challenges
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const expiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await db.insert(challengesTable).values({
    challengerId: players[1]!.id,
    challengedId: players[0]!.id,
    status: "pending",
    scheduledTime: tomorrow,
    expiresAt: expiry,
    seasonId: season!.id,
  });
  await db.insert(challengesTable).values({
    challengerId: players[3]!.id,
    challengedId: players[2]!.id,
    status: "accepted",
    scheduledTime: tomorrow,
    expiresAt: expiry,
    seasonId: season!.id,
  });
  console.log("Created 2 challenges");

  console.log("Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
