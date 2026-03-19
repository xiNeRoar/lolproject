import { db, pool } from "@workspace/db";
import {
  adminUsersTable,
  eventsTable,
  matchesTable,
  matchPlayersTable,
  vodEntriesTable,
  playersTable,
  teamsTable,
  teamMembersTable,
  seasonsTable,
  ladderSettingsTable,
  eloHistoryTable,
  seasonChampionsTable,
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
  console.log("Seeding database (5v5 model — full reset)...");

  // Truncate all tables in FK-safe order (most dependent first)
  await db.execute(sql`TRUNCATE
    elo_history, season_champions, player_badges,
    match_players, vod_entries, vod_timestamps,
    event_registrations, matches,
    team_members, teams,
    replay_submissions, notifications,
    players, seasons, events,
    ladder_settings, admin_users
    CASCADE`);

  // ── Admin ──────────────────────────────────────────────────
  await db.insert(adminUsersTable).values({
    email: "admin@vclol.gg",
    passwordHash: hashPassword("admin123"),
  });
  console.log("Created admin: admin@vclol.gg / admin123");

  // ── Ladder Settings ────────────────────────────────────────
  await db.insert(ladderSettingsTable).values({});
  console.log("Created default ladder settings");

  // ── Season ─────────────────────────────────────────────────
  const [season] = await db.insert(seasonsTable).values({
    name: "Season 1 — Spring 2026",
    status: "active",
    startDate: "2026-03-01",
    endDate: "2026-05-31",
    eloResetFactor: "0.50",
  }).returning();
  console.log("Created Season 1");

  // ── Players (10 — enough for 2 full teams + extras) ────────
  const playerData = [
    // Team Alpha members
    { riotId: "xiNe#NA1",         discordUsername: "xine",         discordId: "100001", primaryRole: "mid" },
    { riotId: "TwitchArcher#NA1", discordUsername: "twitcharcher", discordId: "100002", primaryRole: "adc" },
    { riotId: "VoidWalker#NA1",   discordUsername: "voidwalker",   discordId: "100003", primaryRole: "jg" },
    { riotId: "SteelMind#NA1",    discordUsername: "steelmind",    discordId: "100004", primaryRole: "top" },
    { riotId: "CloudRift#NA1",    discordUsername: "cloudrift",    discordId: "100005", primaryRole: "sup" },
    // Team Beta members
    { riotId: "NightBlade#NA1",   discordUsername: "nightblade",   discordId: "100006", primaryRole: "mid" },
    { riotId: "IronFlux#NA1",     discordUsername: "ironflux",     discordId: "100007", primaryRole: "adc" },
    { riotId: "PhantomGap#NA1",   discordUsername: "phantomgap",   discordId: "100008", primaryRole: "jg" },
    { riotId: "ZenithPulse#NA1",  discordUsername: "zenithpulse",  discordId: "100009", primaryRole: "top" },
    { riotId: "BlazeKing#NA1",    discordUsername: "blazeking",    discordId: "100010", primaryRole: "sup" },
  ];

  const players: (typeof playersTable.$inferSelect)[] = [];
  for (const p of playerData) {
    const [row] = await db.insert(playersTable).values({
      riotId: p.riotId,
      discordUsername: p.discordUsername,
      discordId: p.discordId,
      primaryRole: p.primaryRole,
      isActive: true,
    }).returning();
    players.push(row!);
  }
  console.log(`Created ${players.length} players`);

  // ── Teams ──────────────────────────────────────────────────
  const [teamAlpha] = await db.insert(teamsTable).values({
    name: "Team Alpha",
    tag: "ALPH",
    captainPlayerId: players[0]!.id,
    teamElo: 1120,
    peakElo: 1150,
    wins: 3,
    losses: 1,
    isActive: true,
  }).returning();

  const [teamBeta] = await db.insert(teamsTable).values({
    name: "Team Beta",
    tag: "BETA",
    captainPlayerId: players[5]!.id,
    teamElo: 980,
    peakElo: 1010,
    wins: 1,
    losses: 3,
    isActive: true,
  }).returning();

  console.log("Created 2 teams: Team Alpha, Team Beta");

  // ── Team Members ───────────────────────────────────────────
  const roleOrder = ["top", "jg", "mid", "adc", "sup"] as const;
  for (let i = 0; i < 5; i++) {
    await db.insert(teamMembersTable).values({
      teamId: teamAlpha!.id,
      playerId: players[i]!.id,
      role: roleOrder[i],
      status: "active",
    });
    await db.insert(teamMembersTable).values({
      teamId: teamBeta!.id,
      playerId: players[i + 5]!.id,
      role: roleOrder[i],
      status: "active",
    });
  }
  console.log("Created 10 team memberships");

  // ── Events ─────────────────────────────────────────────────
  const [event1] = await db.insert(eventsTable).values({
    title: "VCLoL 5v5 Spring Open — March 2026",
    slug: "vclol-5v5-spring-open-march-2026",
    format: "Single Elimination",
    eventDate: "2026-03-29",
    registrationStatus: "open",
    shortDescription: "First 5v5 team scrim tournament. Open to all registered teams.",
    fullDescription: "Inaugural 5v5 team tournament. Teams play best-of-1 in bracket format.",
    rulesSummary: "Standard Summoner's Rift 5v5. Draft pick. Best of 1. All matches recorded.",
  }).returning();

  console.log("Created 1 event");

  // Event registrations (team-based)
  await db.insert(eventRegistrationsTable).values({
    eventId: event1!.id,
    teamId: teamAlpha!.id,
    riotId: players[0]!.riotId,
    discordUsername: players[0]!.discordUsername,
    currentRank: "Unranked",
    city: "Vancouver",
    availabilityConfirmation: "yes",
    status: "confirmed",
    playerId: players[0]!.id,
  });
  await db.insert(eventRegistrationsTable).values({
    eventId: event1!.id,
    teamId: teamBeta!.id,
    riotId: players[5]!.riotId,
    discordUsername: players[5]!.discordUsername,
    currentRank: "Unranked",
    city: "Vancouver",
    availabilityConfirmation: "yes",
    status: "confirmed",
    playerId: players[5]!.id,
  });
  console.log("Created 2 event registrations");

  // ── Matches (4 matches: Alpha wins 3, Beta wins 1) ─────────
  type MatchSeed = { winnerTeam: "A" | "B"; title: string; isEvent: boolean };
  const matchSeeds: MatchSeed[] = [
    { winnerTeam: "A", title: "Scrim #1",    isEvent: false },
    { winnerTeam: "A", title: "Scrim #2",    isEvent: false },
    { winnerTeam: "B", title: "Scrim #3",    isEvent: false },
    { winnerTeam: "A", title: "Grand Final", isEvent: true },
  ];

  const CHAMPS_A = ["Zed", "Jinx", "LeeSin", "Garen", "Lulu"] as const;
  const CHAMPS_B = ["Yasuo", "Caitlyn", "Vi", "Darius", "Thresh"] as const;

  for (const ms of matchSeeds) {
    const alphaEloBefore = teamAlpha!.teamElo;
    const betaEloBefore  = teamBeta!.teamElo;
    const eloDelta = 20;
    const alphaEloAfter = ms.winnerTeam === "A" ? alphaEloBefore + eloDelta : alphaEloBefore - eloDelta;
    const betaEloAfter  = ms.winnerTeam === "B" ? betaEloBefore  + eloDelta : betaEloBefore  - eloDelta;

    const [match] = await db.insert(matchesTable).values({
      teamAId:       teamAlpha!.id,
      teamBId:       teamBeta!.id,
      sideAName:     "Team Alpha",
      sideBName:     "Team Beta",
      matchTitle:    ms.title,
      winnerName:    ms.winnerTeam === "A" ? "Team Alpha" : "Team Beta",
      score:         "1-0",
      format:        "BO1",
      teamAEloBefore: alphaEloBefore,
      teamAEloAfter:  alphaEloAfter,
      teamBEloBefore: betaEloBefore,
      teamBEloAfter:  betaEloAfter,
      resultSource:  "admin_manual",
      seasonId:      season!.id,
      eventId:       ms.isEvent ? event1!.id : null,
      isPlayoff:     ms.isEvent,
    }).returning();

    // match_players: 5 per side = 10 total
    for (let i = 0; i < 5; i++) {
      const sideAWin = ms.winnerTeam === "A";
      await db.insert(matchPlayersTable).values({
        matchId:          match!.id,
        playerId:         players[i]!.id,
        teamSide:         "A",
        champion:         CHAMPS_A[i],
        teamPosition:     roleOrder[i],
        kills:            sideAWin ? 4 + i : 1 + i,
        deaths:           sideAWin ? 1 : 3,
        assists:          sideAWin ? 5 : 2,
        cs:               200 + i * 10,
        neutralCs:        20,
        gold:             12000 + i * 500,
        damageToChampions: 25000 + i * 1000,
        visionScore:      25,
        win:              sideAWin,
      });
      await db.insert(matchPlayersTable).values({
        matchId:          match!.id,
        playerId:         players[i + 5]!.id,
        teamSide:         "B",
        champion:         CHAMPS_B[i],
        teamPosition:     roleOrder[i],
        kills:            sideAWin ? 1 + i : 4 + i,
        deaths:           sideAWin ? 3 : 1,
        assists:          sideAWin ? 2 : 5,
        cs:               180 + i * 10,
        neutralCs:        15,
        gold:             10000 + i * 400,
        damageToChampions: 20000 + i * 800,
        visionScore:      20,
        win:              !sideAWin,
      });
    }

    // ELO history for both teams
    await db.insert(eloHistoryTable).values([
      { teamId: teamAlpha!.id, elo: alphaEloAfter, delta: alphaEloAfter - alphaEloBefore, matchId: match!.id, reason: "match" },
      { teamId: teamBeta!.id,  elo: betaEloAfter,  delta: betaEloAfter  - betaEloBefore,  matchId: match!.id, reason: "match" },
    ]);

    // VOD for the grand final
    if (ms.isEvent) {
      await db.insert(vodEntriesTable).values({
        eventId: event1!.id,
        matchId: match!.id,
        title: "Team Alpha vs Team Beta — Grand Final",
        format: "BO1",
        playerNames: "Team Alpha, Team Beta",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      });
    }
  }

  console.log(`Created ${matchSeeds.length} matches + match_players + ELO history + 1 VOD`);

  // ── Season Champion ────────────────────────────────────────
  await db.insert(seasonChampionsTable).values({
    seasonId: season!.id,
    teamId:   teamAlpha!.id,
    teamName: "Team Alpha",
    finalElo: 1120,
  });
  console.log("Created season champion: Team Alpha");

  // ── Badges (player-level) ──────────────────────────────────
  await db.insert(playerBadgesTable).values({ playerId: players[0]!.id, badgeType: "season_champion", seasonId: season!.id });
  await db.insert(playerBadgesTable).values({ playerId: players[0]!.id, badgeType: "win_streak" });
  await db.insert(playerBadgesTable).values({ playerId: players[1]!.id, badgeType: "first_blood" });
  console.log("Created badges");

  console.log("\n✅ Seed complete (5v5 model).");
  console.log("   Teams:   Team Alpha (ELO 1120, 3W/1L), Team Beta (ELO 980, 1W/3L)");
  console.log("   Players: 10 total, 5 per team");
  console.log("   Matches: 4 (3 scrims + 1 event final)");
  console.log("   Admin:   admin@vclol.gg / admin123");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
