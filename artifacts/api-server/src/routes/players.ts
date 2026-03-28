import { Router } from "express";
import { db } from "@workspace/db";
import {
  playersTable,
  teamMembersTable,
  teamsTable,
  matchPlayersTable,
  matchesTable,
  vodEntriesTable,
  eventRegistrationsTable,
  eventsTable,
} from "@workspace/db";
import { eq, desc, and, or, count, avg, sum, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";
import { isPlayerProfileVisibleTo } from "../lib/privacyGate.js";

const router = Router();

// ── Formatters ───────────────────────────────────────────────

function formatPlayer(p: typeof playersTable.$inferSelect) {
  return {
    id: p.id,
    riotId: p.riotId,
    discordUsername: p.discordUsername,
    discordId: p.discordId ?? null,
    puuid: p.puuid ?? null,
    primaryRole: p.primaryRole ?? null,
    secondaryRole: p.secondaryRole ?? null,
    isActive: p.isActive,
    profileVisibility: p.profileVisibility ?? "private",
    email: p.email ?? null,
    notificationPreference: p.notificationPreference,
    registrationStatus: p.registrationStatus,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

async function buildPlayerProfile(player: typeof playersTable.$inferSelect) {
  // Team memberships
  const memberRows = await db
    .select({
      teamId: teamMembersTable.teamId,
      role: teamMembersTable.role,
      status: teamMembersTable.status,
      teamName: teamsTable.name,
      teamTag: teamsTable.tag,
      captainPlayerId: teamsTable.captainPlayerId,
    })
    .from(teamMembersTable)
    .leftJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
    .where(eq(teamMembersTable.playerId, player.id));

  // Fetch active member counts for all teams the player belongs to
  const teamIds = [...new Set(memberRows.map((r) => r.teamId))];
  const memberCounts: Record<number, number> = {};
  if (teamIds.length > 0) {
    const countRows = await db
      .select({ teamId: teamMembersTable.teamId, cnt: count() })
      .from(teamMembersTable)
      .where(and(
        inArray(teamMembersTable.teamId, teamIds),
        eq(teamMembersTable.status, "active"),
      ))
      .groupBy(teamMembersTable.teamId);
    for (const row of countRows) {
      memberCounts[row.teamId] = Number(row.cnt);
    }
  }

  const teams = memberRows.map((r) => ({
    teamId: r.teamId,
    teamName: r.teamName ?? "",
    teamTag: r.teamTag ?? "",
    role: r.role ?? null,
    status: r.status,
    isCaptain: r.captainPlayerId === player.id,
    memberCount: memberCounts[r.teamId] ?? 0,
  }));

  // Aggregate stats from match_players
  const [stats] = await db
    .select({
      totalGames: count(),
      wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
      avgKills: avg(matchPlayersTable.kills),
      avgDeaths: avg(matchPlayersTable.deaths),
      avgAssists: avg(matchPlayersTable.assists),
      avgCs: avg(matchPlayersTable.cs),
    })
    .from(matchPlayersTable)
    .where(eq(matchPlayersTable.playerId, player.id));

  const totalGames = Number(stats?.totalGames ?? 0);
  const wins = Number(stats?.wins ?? 0);

  // Top champions (up to 5)
  const champRows = await db
    .select({
      champion: matchPlayersTable.champion,
      games: count(),
      wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
    })
    .from(matchPlayersTable)
    .where(and(eq(matchPlayersTable.playerId, player.id), sql`${matchPlayersTable.champion} IS NOT NULL`))
    .groupBy(matchPlayersTable.champion)
    .orderBy(desc(count()))
    .limit(5);

  const topChampions = champRows.map((c) => ({
    champion: c.champion!,
    games: Number(c.games),
    wins: Number(c.wins ?? 0),
    avgKda: 0, // computed below if needed, omitted for perf
  }));

  const aggregateStats = {
    totalGames,
    wins,
    losses: totalGames - wins,
    avgKills: Number(Number(stats?.avgKills ?? 0).toFixed(2)),
    avgDeaths: Number(Number(stats?.avgDeaths ?? 0).toFixed(2)),
    avgAssists: Number(Number(stats?.avgAssists ?? 0).toFixed(2)),
    avgCs: Number(Number(stats?.avgCs ?? 0).toFixed(1)),
    topChampions,
  };

  // Recent matches (last 10) — include champion played (#113)
  const recentMpRows = await db
    .select({ match: matchesTable, champion: matchPlayersTable.champion })
    .from(matchPlayersTable)
    .leftJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
    .where(eq(matchPlayersTable.playerId, player.id))
    .orderBy(desc(matchesTable.createdAt))
    .limit(10);

  const recentMatches = recentMpRows
    .filter((r) => r.match !== null)
    .map((r) => ({
      id: r.match!.id,
      teamAId: r.match!.teamAId ?? null,
      teamBId: r.match!.teamBId ?? null,
      sideAName: r.match!.sideAName,
      sideBName: r.match!.sideBName,
      matchTitle: r.match!.matchTitle,
      winnerName: r.match!.winnerName,
      score: r.match!.score ?? null,
      format: r.match!.format ?? null,
      teamAEloBefore: r.match!.teamAEloBefore ?? null,
      teamAEloAfter: r.match!.teamAEloAfter ?? null,
      teamBEloBefore: r.match!.teamBEloBefore ?? null,
      teamBEloAfter: r.match!.teamBEloAfter ?? null,
      gameId: r.match!.gameId ?? null,
      resultSource: r.match!.resultSource,
      seasonId: r.match!.seasonId ?? null,
      eventId: r.match!.eventId ?? null,
      isPlayoff: r.match!.isPlayoff,
      createdAt: r.match!.createdAt.toISOString(),
      updatedAt: r.match!.updatedAt.toISOString(),
      playerChampion: r.champion ?? null,
    }));

  // VODs linked to this player
  const vodRows = await db
    .select()
    .from(vodEntriesTable)
    .where(eq(vodEntriesTable.playerId, player.id))
    .orderBy(desc(vodEntriesTable.createdAt))
    .limit(20);

  const vods = vodRows.map((v) => ({
    id: v.id,
    matchId: v.matchId ?? null,
    eventId: v.eventId ?? null,
    title: v.title,
    videoUrl: v.videoUrl,
    champion: v.champion ?? null,
    position: v.position ?? null,
    patch: v.patch ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  }));

  return {
    id: player.id,
    riotId: player.riotId,
    discordUsername: player.discordUsername,
    puuid: player.puuid ?? null,
    primaryRole: player.primaryRole ?? null,
    secondaryRole: player.secondaryRole ?? null,
    isActive: player.isActive,
    teams,
    aggregateStats,
    recentMatches,
    vods,
    createdAt: player.createdAt.toISOString(),
    updatedAt: player.updatedAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /players — list all players, enriched with team + stats (Issue #20)
// D-01: Batch inArray queries instead of per-player loops (N+1 fix)
// D-02: LIMIT/OFFSET pagination
// D-06: Non-admin requests only see players with rsoOptIn = true
router.get("/", async (req, res) => {
  try {
    const isAdmin = !!req.session?.adminId;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const rsoFilter = isAdmin ? undefined : eq(playersTable.rsoOptIn, true);

    // Count query
    const [countResult] = await db.select({ total: count() }).from(playersTable).where(rsoFilter);
    const total = Number(countResult?.total ?? 0);

    if (total === 0) {
      res.json({ data: [], total: 0, page, totalPages: 0 });
      return;
    }

    // Paginated player query
    const players = await db
      .select()
      .from(playersTable)
      .where(rsoFilter)
      .orderBy(playersTable.riotId)
      .limit(limit)
      .offset(offset);

    const playerIds = players.map((p) => p.id);

    // Batch team memberships (1 query for all players)
    const teamRows = playerIds.length > 0
      ? await db
          .select({
            playerId: teamMembersTable.playerId,
            teamId: teamMembersTable.teamId,
            teamName: teamsTable.name,
            teamTag: teamsTable.tag,
            joinedAt: teamMembersTable.joinedAt,
          })
          .from(teamMembersTable)
          .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
          .where(and(
            inArray(teamMembersTable.playerId, playerIds),
            eq(teamMembersTable.status, "active")
          ))
          .orderBy(desc(teamMembersTable.joinedAt))
      : [];

    // Build map: playerId -> most recent active team
    const teamMap: Record<number, { teamId: number; teamName: string; teamTag: string }> = {};
    for (const row of teamRows) {
      if (!teamMap[row.playerId]) {
        teamMap[row.playerId] = { teamId: row.teamId, teamName: row.teamName, teamTag: row.teamTag };
      }
    }

    // Batch stats (1 query for all players)
    const statsRows = playerIds.length > 0
      ? await db
          .select({
            playerId: matchPlayersTable.playerId,
            totalGames: count(matchPlayersTable.id),
            wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} = true THEN 1 ELSE 0 END`),
          })
          .from(matchPlayersTable)
          .where(inArray(matchPlayersTable.playerId, playerIds))
          .groupBy(matchPlayersTable.playerId)
      : [];

    const statsMap: Record<number, { totalGames: number; wins: number }> = {};
    for (const row of statsRows) {
      if (row.playerId != null) {
        statsMap[row.playerId] = {
          totalGames: Number(row.totalGames),
          wins: Number(row.wins ?? 0),
        };
      }
    }

    // Merge results
    const data = players.map((p) => {
      const stats = statsMap[p.id] ?? { totalGames: 0, wins: 0 };
      const winRate = stats.totalGames > 0 ? Math.round((stats.wins / stats.totalGames) * 100) : null;
      return {
        ...formatPlayer(p),
        primaryTeam: teamMap[p.id] ?? null,
        totalGames: stats.totalGames,
        winRate,
      };
    });

    res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

// POST /players/register — register a new player via Discord OAuth flow only.
// Must be registered BEFORE /:riotId to avoid Express path collision.
// Requires a valid Discord OAuth session (set by GET /auth/discord/callback).
// discordId is taken from session — never from request body — to prevent forgery.
router.post("/register", async (req, res) => {
  // Auth gate: must have completed Discord OAuth (session.discordId set by auth callback)
  const sessionDiscordId = req.session.discordId;
  const sessionDiscordUsername = req.session.discordUsername;
  if (!sessionDiscordId) {
    res.status(401).json({ error: "Discord OAuth session required. Complete Discord login first." });
    return;
  }

  try {
    const { riotId, puuid, email } = req.body as {
      riotId?: string;
      puuid?: string | null;
      email?: string | null;
    };

    if (!riotId) {
      res.status(400).json({ error: "riotId is required" });
      return;
    }

    const [row] = await db
      .insert(playersTable)
      .values({
        riotId,
        discordId: sessionDiscordId,            // from session — trusted, not body
        discordUsername: sessionDiscordUsername ?? sessionDiscordId,
        puuid: puuid ?? null,
        email: email ?? null,
        registrationStatus: "active",
      })
      .returning();

    // Upgrade session: pre-registration → full player session
    req.session.playerId = row!.id;
    req.session.playerRiotId = row!.riotId;
    delete req.session.discordId; // consumed — prevents duplicate registration attempts

    res.status(201).json(formatPlayer(row!));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A player with this riotId or discordId already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to register player" });
  }
});

// POST /players — create player (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      riotId,
      discordUsername,
      discordId,
      puuid,
      primaryRole,
      secondaryRole,
      isActive,
      email,
      notificationPreference,
      registrationStatus,
    } = req.body as {
      riotId?: string;
      discordUsername?: string;
      discordId?: string | null;
      puuid?: string | null;
      primaryRole?: string | null;
      secondaryRole?: string | null;
      isActive?: boolean | null;
      email?: string | null;
      notificationPreference?: string | null;
      registrationStatus?: string | null;
    };

    if (!riotId || !discordUsername) {
      res.status(400).json({ error: "riotId and discordUsername are required" });
      return;
    }

    const [row] = await db
      .insert(playersTable)
      .values({
        riotId,
        discordUsername,
        discordId: discordId ?? null,
        puuid: puuid ?? null,
        primaryRole: primaryRole ?? null,
        secondaryRole: secondaryRole ?? null,
        isActive: isActive ?? true,
        email: email ?? null,
        notificationPreference: notificationPreference ?? "web",
        registrationStatus: registrationStatus ?? "active",
      })
      .returning();

    res.status(201).json(formatPlayer(row!));
    logAdminAction(req.session.adminId!, "create", "player", row!.id, `Created player "${riotId}"`);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A player with this riotId already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create player" });
  }
});

// GET /players/by-id/:id — get player profile by numeric ID
// Must be registered BEFORE /:riotId to avoid Express path collision
router.get("/by-id/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    // Privacy gate: check profile visibility (D-07, D-08, D-09)
    const viewerId = req.session.playerId ? Number(req.session.playerId) : null;
    const isAdmin = !!req.session.adminId;
    const { canSeeProfile } = await isPlayerProfileVisibleTo(player, viewerId, isAdmin);

    if (!canSeeProfile) {
      // Return minimal response per D-07
      const memberRows = await db
        .select({ teamId: teamMembersTable.teamId, teamName: teamsTable.name, teamTag: teamsTable.tag, status: teamMembersTable.status })
        .from(teamMembersTable)
        .leftJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
        .where(eq(teamMembersTable.playerId, player.id));

      res.json({
        id: player.id,
        riotId: player.riotId,
        isPrivate: true,
        teams: memberRows.map((r) => ({
          teamId: r.teamId,
          teamName: r.teamName ?? "",
          teamTag: r.teamTag ?? "",
          status: r.status,
        })),
      });
      return;
    }

    res.json(await buildPlayerProfile(player));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

// GET /players/:riotId — get player profile by Riot ID
router.get("/:riotId", async (req, res) => {
  try {
    const { riotId } = req.params;
    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.riotId, riotId!));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    // Privacy gate: use shared helper (D-14 — no inline visibility logic)
    const viewerId = req.session.playerId ? Number(req.session.playerId) : null;
    const isAdmin = !!req.session.adminId;
    const { canSeeProfile } = await isPlayerProfileVisibleTo(player, viewerId, isAdmin);

    if (!canSeeProfile) {
      // Return minimal response per D-07
      const memberRows = await db
        .select({ teamId: teamMembersTable.teamId, teamName: teamsTable.name, teamTag: teamsTable.tag, status: teamMembersTable.status })
        .from(teamMembersTable)
        .leftJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
        .where(eq(teamMembersTable.playerId, player.id));

      res.json({
        id: player.id,
        riotId: player.riotId,
        isPrivate: true,
        teams: memberRows.map((r) => ({
          teamId: r.teamId,
          teamName: r.teamName ?? "",
          teamTag: r.teamTag ?? "",
          status: r.status,
        })),
      });
      return;
    }

    res.json(await buildPlayerProfile(player));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player" });
  }
});

// PUT /players/:id/edit — admin update
router.put("/:id/edit", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const {
      riotId,
      discordUsername,
      discordId,
      puuid,
      primaryRole,
      secondaryRole,
      isActive,
      email,
      notificationPreference,
      registrationStatus,
    } = req.body as Partial<typeof playersTable.$inferInsert>;

    const updates: Partial<typeof playersTable.$inferInsert> = { updatedAt: new Date() };
    if (riotId !== undefined) updates.riotId = riotId;
    if (discordUsername !== undefined) updates.discordUsername = discordUsername;
    if (discordId !== undefined) updates.discordId = discordId;
    if (puuid !== undefined) updates.puuid = puuid;
    if (primaryRole !== undefined) updates.primaryRole = primaryRole;
    if (secondaryRole !== undefined) updates.secondaryRole = secondaryRole;
    if (isActive !== undefined) updates.isActive = isActive;
    if (email !== undefined) updates.email = email;
    if (notificationPreference !== undefined) updates.notificationPreference = notificationPreference;
    if (registrationStatus !== undefined) updates.registrationStatus = registrationStatus;

    const [row] = await db
      .update(playersTable)
      .set(updates)
      .where(eq(playersTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(formatPlayer(row));
    logAdminAction(req.session.adminId!, "update", "player", row.id, `Updated player "${row.riotId}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to update player" });
  }
});

// DELETE /players/:id/delete — admin delete
router.delete("/:id/delete", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(playersTable).where(eq(playersTable.id, id));
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "delete", "player", id, `Deleted player #${id}`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete player" });
  }
});

// PUT /players/:id/profile — player self-update (own account only)
router.put("/:id/profile", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    if (req.session.playerId !== id) {
      res.status(403).json({ error: "Not authorized to update this profile" });
      return;
    }

    const { email, notificationPreference, primaryRole, secondaryRole, profileVisibility } = req.body as {
      email?: string | null;
      notificationPreference?: string | null;
      primaryRole?: string | null;
      secondaryRole?: string | null;
      profileVisibility?: string | null;
    };

    const updates: Partial<typeof playersTable.$inferInsert> = { updatedAt: new Date() };
    if (email !== undefined) updates.email = email;
    if (notificationPreference !== undefined) updates.notificationPreference = notificationPreference;
    if (primaryRole !== undefined) updates.primaryRole = primaryRole;
    if (secondaryRole !== undefined) updates.secondaryRole = secondaryRole;
    if (profileVisibility !== undefined && (profileVisibility === "public" || profileVisibility === "private" || profileVisibility === "participants-only")) {
      updates.profileVisibility = profileVisibility;
    }

    const [row] = await db
      .update(playersTable)
      .set(updates)
      .where(eq(playersTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Player not found" });
      return;
    }
    res.json(formatPlayer(row));
  } catch (err) {
    res.status(500).json({ error: "Failed to update player profile" });
  }
});

// GET /players/:id/events — events a player participated in
router.get("/:id/events", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    // Privacy gate: profile sub-route follows profile visibility
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const viewerId = req.session.playerId ? Number(req.session.playerId) : null;
    const isAdmin = !!req.session.adminId;
    const { canSeeProfile } = await isPlayerProfileVisibleTo(player, viewerId, isAdmin);
    if (!canSeeProfile) {
      res.status(403).json({ error: "Player profile is private" });
      return;
    }

    // Registrations this player has
    const regRows = await db
      .select({
        eventId: eventRegistrationsTable.eventId,
        eventTitle: eventsTable.title,
        eventSlug: eventsTable.slug,
        eventDate: eventsTable.eventDate,
        eventFormat: eventsTable.format,
      })
      .from(eventRegistrationsTable)
      .leftJoin(eventsTable, eq(eventRegistrationsTable.eventId, eventsTable.id))
      .where(eq(eventRegistrationsTable.playerId, id));

    // For each event, count matches played via match_players
    const results = await Promise.all(
      regRows.map(async (r) => {
        const mpRows = await db
          .select({
            win: matchPlayersTable.win,
          })
          .from(matchPlayersTable)
          .leftJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
          .where(
            and(
              eq(matchPlayersTable.playerId, id),
              eq(matchesTable.eventId, r.eventId)
            )
          );

        const matchesPlayed = mpRows.length;
        const wins = mpRows.filter((m) => m.win).length;

        return {
          eventId: r.eventId,
          eventTitle: r.eventTitle ?? null,
          eventSlug: r.eventSlug ?? null,
          eventDate: r.eventDate ?? null,
          eventFormat: r.eventFormat ?? null,
          matchesPlayed,
          wins,
          losses: matchesPlayed - wins,
        };
      })
    );

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player events" });
  }
});

// GET /players/:id/champions — champion pool stats from match_players
router.get("/:id/champions", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    // Privacy gate: profile sub-route follows profile visibility
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    const viewerId = req.session.playerId ? Number(req.session.playerId) : null;
    const isAdmin = !!req.session.adminId;
    const { canSeeProfile } = await isPlayerProfileVisibleTo(player, viewerId, isAdmin);
    if (!canSeeProfile) {
      res.status(403).json({ error: "Player profile is private" });
      return;
    }

    const rows = await db
      .select({
        champion: matchPlayersTable.champion,
        games: count(),
        wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
        avgKda: avg(
          sql<number>`CASE WHEN ${matchPlayersTable.deaths} = 0
            THEN (${matchPlayersTable.kills} + ${matchPlayersTable.assists})::float
            ELSE (${matchPlayersTable.kills} + ${matchPlayersTable.assists})::float / ${matchPlayersTable.deaths}
          END`
        ),
      })
      .from(matchPlayersTable)
      .where(
        and(
          eq(matchPlayersTable.playerId, id),
          sql`${matchPlayersTable.champion} IS NOT NULL`
        )
      )
      .groupBy(matchPlayersTable.champion)
      .orderBy(desc(count()))
      .limit(20);

    res.json(
      rows.map((r) => ({
        champion: r.champion!,
        games: Number(r.games),
        wins: Number(r.wins ?? 0),
        avgKda: Number(Number(r.avgKda ?? 0).toFixed(2)),
      }))
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch champion stats" });
  }
});

// GET /players/:id/team-stats -- per-team career stats
// Returns ALL historical team memberships (active, inactive, pending) -- career resume model.
// Each team includes W/L record and per-game KDA averages from matches where player participated.
// Teams with zero match data appear with zeroed stats.
router.get("/:id/team-stats", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
    if (!player) {
      res.status(404).json({ error: "Player not found" });
      return;
    }

    // Privacy gate: returns 403 for private profiles (same pattern as /champions handler at line 700-758)
    const viewerId = req.session.playerId ? Number(req.session.playerId) : null;
    const isAdmin = !!req.session.adminId;
    const { canSeeProfile } = await isPlayerProfileVisibleTo(player, viewerId, isAdmin);
    if (!canSeeProfile) {
      res.status(403).json({ error: "Player profile is private" });
      return;
    }

    // Phase 1: Get ALL team memberships for this player (active, inactive, pending).
    // This is the "career resume" model -- every team the player has ever been on appears.
    // The `status` field in the response lets the frontend distinguish current vs past teams.
    const memberRows = await db
      .select({
        teamId: teamMembersTable.teamId,
        role: teamMembersTable.role,
        status: teamMembersTable.status,
        joinedAt: teamMembersTable.joinedAt,
        teamName: teamsTable.name,
        teamTag: teamsTable.tag,
      })
      .from(teamMembersTable)
      .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
      .where(eq(teamMembersTable.playerId, id));

    // Phase 2: Aggregate match stats grouped by resolved teamId.
    // teamSide is always "A" or "B" (set by bot matchRecorder during .rofl parsing).
    // CASE maps teamSide to the actual team FK: "A" -> matches.teamAId, "B" -> matches.teamBId.
    // If teamAId/teamBId is null (team deleted, onDelete: "set null"), CASE returns null.
    // These null teamIds are filtered out in Phase 3 via the statsMap null check.
    const teamIdExpr = sql<number>`CASE
      WHEN ${matchPlayersTable.teamSide} = 'A' THEN ${matchesTable.teamAId}
      WHEN ${matchPlayersTable.teamSide} = 'B' THEN ${matchesTable.teamBId}
    END`;

    const statsRows = await db
      .select({
        teamId: teamIdExpr,
        gamesPlayed: count(),
        wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
        avgKills: avg(matchPlayersTable.kills),
        avgDeaths: avg(matchPlayersTable.deaths),
        avgAssists: avg(matchPlayersTable.assists),
      })
      .from(matchPlayersTable)
      .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
      .where(eq(matchPlayersTable.playerId, id))
      .groupBy(teamIdExpr);

    // Phase 3: Merge memberships with stats.
    // Teams with no match data get zeroed stats (Pitfall 4 from research).
    // Null teamIds from CASE (deleted teams) are filtered here -- they would not match
    // any team_members row anyway, so this is a safety filter.
    const statsMap = new Map<number, typeof statsRows[number]>();
    for (const row of statsRows) {
      if (row.teamId != null) {
        statsMap.set(row.teamId, row);
      }
    }

    const results = memberRows.map((m) => {
      const s = statsMap.get(m.teamId);
      const gamesPlayed = Number(s?.gamesPlayed ?? 0);
      const wins = Number(s?.wins ?? 0);
      return {
        teamId: m.teamId,
        teamName: m.teamName,
        teamTag: m.teamTag,
        role: m.role ?? null,
        status: m.status,
        wins,
        losses: gamesPlayed - wins,
        // Averages are per-game for that team. SQL avg() divides by the count of rows in the group.
        // Number(Number(val).toFixed(2)) matches existing pattern in players.ts:123-126, 750-753.
        // Zero-game teams get 0 (not null/NaN) via the ?? 0 fallback.
        avgKills: Number(Number(s?.avgKills ?? 0).toFixed(2)),
        avgDeaths: Number(Number(s?.avgDeaths ?? 0).toFixed(2)),
        avgAssists: Number(Number(s?.avgAssists ?? 0).toFixed(2)),
        gamesPlayed,
        joinedAt: m.joinedAt.toISOString(),
      };
    });

    // Sort by gamesPlayed desc (most active team first)
    results.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    res.json(results);
  } catch (err) {
    console.error("[players]", err);
    res.status(500).json({ error: "Failed to fetch team stats" });
  }
});

export default router;
