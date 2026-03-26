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
import { eq, desc, and, count, avg, sum, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";

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
router.get("/", async (_req, res) => {
  try {
    const players = await db
      .select()
      .from(playersTable)
      .orderBy(playersTable.riotId);

    const enriched = await Promise.all(players.map(async (p) => {
      const [member] = await db
        .select({ teamId: teamMembersTable.teamId, teamName: teamsTable.name, teamTag: teamsTable.tag })
        .from(teamMembersTable)
        .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
        .where(and(eq(teamMembersTable.playerId, p.id), eq(teamMembersTable.status, "active")))
        .orderBy(desc(teamMembersTable.joinedAt))
        .limit(1);

      const [stats] = await db
        .select({
          totalGames: count(matchPlayersTable.id),
          wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} = true THEN 1 ELSE 0 END`),
        })
        .from(matchPlayersTable)
        .where(eq(matchPlayersTable.playerId, p.id));

      const totalGames = Number(stats?.totalGames ?? 0);
      const wins = Number(stats?.wins ?? 0);
      const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : null;

      return {
        ...formatPlayer(p),
        primaryTeam: member ? { teamId: member.teamId, teamName: member.teamName, teamTag: member.teamTag } : null,
        totalGames,
        winRate,
      };
    }));

    res.json(enriched);
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

    // Privacy gate: if profile is private, only the player themselves or an admin can see full data
    const isOwner = req.session.playerId === player.id;
    const isAdmin = !!req.session.adminId;
    const isPrivate = (player.profileVisibility ?? "private") === "private";

    if (isPrivate && !isOwner && !isAdmin) {
      // Return redacted profile — riotId + team affiliations only, no stats
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
    if (profileVisibility !== undefined && (profileVisibility === "public" || profileVisibility === "private")) {
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

export default router;
