import { Router } from "express";
import { db } from "@workspace/db";
import { teamsTable, teamMembersTable, playersTable, matchesTable, eloHistoryTable } from "@workspace/db";
import { eq, desc, and, inArray, or, ilike, count, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

// ── Formatters ───────────────────────────────────────────────

function formatTeam(t: typeof teamsTable.$inferSelect) {
  return {
    id: t.id,
    name: t.name,
    tag: t.tag,
    captainPlayerId: t.captainPlayerId,
    discordServerId: t.discordServerId ?? null,
    teamElo: t.teamElo,
    peakElo: t.peakElo,
    wins: t.wins,
    losses: t.losses,
    isActive: t.isActive,
    defaultMatchVisibility: t.defaultMatchVisibility ?? "participants",
    lastMatchAt: t.lastMatchAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function formatMember(
  m: typeof teamMembersTable.$inferSelect,
  extra: { playerRiotId?: string | null; playerDiscordUsername?: string | null } = {}
) {
  return {
    id: m.id,
    teamId: m.teamId,
    playerId: m.playerId,
    playerRiotId: extra.playerRiotId ?? null,
    playerDiscordUsername: extra.playerDiscordUsername ?? null,
    role: m.role ?? null,
    status: m.status,
    joinedAt: m.joinedAt.toISOString(),
  };
}

function formatMatch(m: typeof matchesTable.$inferSelect) {
  return {
    id: m.id,
    teamAId: m.teamAId ?? null,
    teamBId: m.teamBId ?? null,
    sideAName: m.sideAName,
    sideBName: m.sideBName,
    matchTitle: m.matchTitle,
    winnerName: m.winnerName,
    score: m.score ?? null,
    format: m.format ?? null,
    teamAEloBefore: m.teamAEloBefore ?? null,
    teamAEloAfter: m.teamAEloAfter ?? null,
    teamBEloBefore: m.teamBEloBefore ?? null,
    teamBEloAfter: m.teamBEloAfter ?? null,
    gameId: m.gameId ?? null,
    gameDuration: m.gameDuration ?? null,
    resultSource: m.resultSource,
    seasonId: m.seasonId ?? null,
    eventId: m.eventId ?? null,
    isPlayoff: m.isPlayoff,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /teams — list all teams, optional ?active=true filter
router.get("/", async (req, res) => {
  try {
    const activeOnly = req.query.active === "true";

    const rows = activeOnly
      ? await db
          .select()
          .from(teamsTable)
          .where(eq(teamsTable.isActive, true))
          .orderBy(desc(teamsTable.teamElo))
      : await db.select().from(teamsTable).orderBy(desc(teamsTable.teamElo));

    res.json(rows.map(formatTeam));
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

// POST /teams — create team (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, tag, captainPlayerId, discordServerId, teamElo, isActive } = req.body as {
      name?: string;
      tag?: string;
      captainPlayerId?: number;
      discordServerId?: string | null;
      teamElo?: number | null;
      isActive?: boolean | null;
    };

    if (!name || !tag || !captainPlayerId) {
      res.status(400).json({ error: "name, tag, and captainPlayerId are required" });
      return;
    }

    if (!/^[A-Z0-9]{2,5}$/.test(tag.toUpperCase())) {
      res.status(400).json({ error: "tag must be 2-5 uppercase alphanumeric characters" });
      return;
    }

    const [row] = await db
      .insert(teamsTable)
      .values({
        name,
        tag: tag.toUpperCase(),
        captainPlayerId: Number(captainPlayerId),
        discordServerId: discordServerId ?? null,
        teamElo: teamElo ?? 1000,
        peakElo: teamElo ?? 1000,
        isActive: isActive ?? true,
      })
      .returning();

    // Write ELO baseline row (Issue #12) — chart starts at 1000
    await db.insert(eloHistoryTable).values({
      teamId: row!.id,
      elo: row!.teamElo,
      delta: 0,
      reason: "registration",
      matchId: null,
    });

    logAdminAction(req.session.adminId!, "create", "team", row!.id, `Created team "${name}" [${tag}]`);
    res.status(201).json(formatTeam(row!));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A team with this name already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create team" });
  }
});

// GET /teams/:id — team profile with members + recent matches
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, id));
    if (!team) {
      res.status(404).json({ error: "Team not found" });
      return;
    }

    // Fetch members with player info
    const memberRows = await db
      .select({
        member: teamMembersTable,
        playerRiotId: playersTable.riotId,
        playerDiscordUsername: playersTable.discordUsername,
      })
      .from(teamMembersTable)
      .leftJoin(playersTable, eq(teamMembersTable.playerId, playersTable.id))
      .where(eq(teamMembersTable.teamId, id))
      .orderBy(teamMembersTable.joinedAt);

    // Fetch recent matches (last 10) — both as teamA and teamB
    // Use two queries + union via JS (Drizzle doesn't support OR across two FK columns cleanly)
    const [matchesAsA, matchesAsB] = await Promise.all([
      db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.teamAId, id))
        .orderBy(desc(matchesTable.createdAt))
        .limit(10),
      db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.teamBId, id))
        .orderBy(desc(matchesTable.createdAt))
        .limit(10),
    ]);

    // Merge, deduplicate, sort, take top 10
    const seen = new Set<number>();
    const teamMatches = [...matchesAsA, ...matchesAsB]
      .filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    res.json({
      ...formatTeam(team),
      members: memberRows.map((r) =>
        formatMember(r.member, {
          playerRiotId: r.playerRiotId ?? null,
          playerDiscordUsername: r.playerDiscordUsername ?? null,
        })
      ),
      recentMatches: teamMatches.map(formatMatch),
    });
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

// PUT /teams/:id — update team (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { name, tag, captainPlayerId, discordServerId, isActive } = req.body as {
      name?: string;
      tag?: string;
      captainPlayerId?: number;
      discordServerId?: string | null;
      isActive?: boolean | null;
    };

    const updates: Partial<typeof teamsTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (tag !== undefined) updates.tag = tag.toUpperCase();
    if (captainPlayerId !== undefined) updates.captainPlayerId = Number(captainPlayerId);
    if (discordServerId !== undefined) updates.discordServerId = discordServerId;
    if (isActive !== undefined) updates.isActive = isActive ?? true;

    const [row] = await db
      .update(teamsTable)
      .set(updates)
      .where(eq(teamsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Team not found" });
      return;
    }
    logAdminAction(req.session.adminId!, "update", "team", row.id, `Updated team "${row.name}" [${row.tag}]`);
    res.json(formatTeam(row));
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(409).json({ error: "A team with this name already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to update team" });
  }
});

// DELETE /teams/:id — delete team (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(teamsTable).where(eq(teamsTable.id, id));
    logAdminAction(req.session.adminId!, "delete", "team", id, `Deleted team id=${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to delete team" });
  }
});

// GET /teams/:id/members — team roster
router.get("/:id/members", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const rows = await db
      .select({
        member: teamMembersTable,
        playerRiotId: playersTable.riotId,
        playerDiscordUsername: playersTable.discordUsername,
      })
      .from(teamMembersTable)
      .leftJoin(playersTable, eq(teamMembersTable.playerId, playersTable.id))
      .where(and(eq(teamMembersTable.teamId, id), eq(teamMembersTable.status, "active")))
      .orderBy(teamMembersTable.joinedAt);

    res.json(
      rows.map((r) =>
        formatMember(r.member, {
          playerRiotId: r.playerRiotId ?? null,
          playerDiscordUsername: r.playerDiscordUsername ?? null,
        })
      )
    );
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to fetch team members" });
  }
});

// ── Admin Member Management ─────────────────────────────────

// POST /teams/:id/members — admin add member
router.post("/:id/members", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    if (isNaN(teamId)) { res.status(400).json({ error: "Invalid team id" }); return; }

    const { playerId, role } = req.body as { playerId?: number; role?: string | null };
    if (!playerId) { res.status(400).json({ error: "playerId is required" }); return; }

    // Check player exists
    const [player] = await db.select().from(playersTable).where(eq(playersTable.id, Number(playerId)));
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }

    // Check not already on team
    const [existing] = await db.select().from(teamMembersTable).where(
      and(eq(teamMembersTable.teamId, teamId), eq(teamMembersTable.playerId, Number(playerId)), eq(teamMembersTable.status, "active"))
    );
    if (existing) { res.status(409).json({ error: "Player is already an active member of this team" }); return; }

    const [row] = await db.insert(teamMembersTable).values({
      teamId,
      playerId: Number(playerId),
      role: role ?? null,
      status: "active",
    }).returning();

    logAdminAction(req.session.adminId!, "create", "team", teamId, `Added player ${player.riotId} (id=${playerId}) to team ${teamId}`);
    res.status(201).json(formatMember(row!, { playerRiotId: player.riotId, playerDiscordUsername: player.discordUsername }));
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to add member" });
  }
});

// PUT /teams/:id/members/:memberId — admin update member role/status
router.put("/:id/members/:memberId", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    const memberId = parseInt(req.params.memberId as string);
    if (isNaN(teamId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { role, status } = req.body as { role?: string | null; status?: string | null };
    const updates: Partial<typeof teamMembersTable.$inferInsert> = {};
    if (role !== undefined) updates.role = role;
    if (status !== undefined) updates.status = status || "active";

    const [row] = await db.update(teamMembersTable).set(updates)
      .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)))
      .returning();

    if (!row) { res.status(404).json({ error: "Member not found" }); return; }

    logAdminAction(req.session.adminId!, "update", "team", teamId, `Updated member ${memberId} on team ${teamId}: role=${role}, status=${status}`);
    res.json(formatMember(row));
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to update member" });
  }
});

// DELETE /teams/:id/members/:memberId — admin remove member (set inactive)
router.delete("/:id/members/:memberId", requireAdmin, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    const memberId = parseInt(req.params.memberId as string);
    if (isNaN(teamId) || isNaN(memberId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db.update(teamMembersTable).set({ status: "inactive" })
      .where(and(eq(teamMembersTable.id, memberId), eq(teamMembersTable.teamId, teamId)))
      .returning();

    if (!row) { res.status(404).json({ error: "Member not found" }); return; }

    logAdminAction(req.session.adminId!, "delete", "team", teamId, `Removed member ${memberId} from team ${teamId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to remove member" });
  }
});


// ── Captain self-service endpoints (Issue #14) ────────────────────────────

// PUT /teams/:id/transfer-captain
router.put("/:id/transfer-captain", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    if (isNaN(teamId)) { res.status(400).json({ error: "Invalid id" }); return; }
    const { newCaptainPlayerId } = req.body as { newCaptainPlayerId?: number };
    if (!newCaptainPlayerId) { res.status(400).json({ error: "newCaptainPlayerId required" }); return; }

    const playerId = req.session.playerId;
    if (!playerId && !req.session.adminId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) { res.status(404).json({ error: "Team not found" }); return; }
    if (!req.session.adminId && team.captainPlayerId !== Number(playerId)) {
      res.status(403).json({ error: "Only the current captain can transfer leadership" }); return;
    }

    const [membership] = await db.select().from(teamMembersTable).where(and(
      eq(teamMembersTable.teamId, teamId),
      eq(teamMembersTable.playerId, newCaptainPlayerId),
      eq(teamMembersTable.status, "active")
    ));
    if (!membership) { res.status(400).json({ error: "Target must be an active team member" }); return; }

    await db.update(teamsTable).set({ captainPlayerId: newCaptainPlayerId, updatedAt: new Date() }).where(eq(teamsTable.id, teamId));
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: "Failed to transfer captain" }); }
});

// PUT /teams/:id/settings — name, tag, defaultMatchVisibility (captain or admin)
router.put("/:id/settings", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    if (isNaN(teamId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const playerId = req.session.playerId;
    if (!playerId && !req.session.adminId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) { res.status(404).json({ error: "Team not found" }); return; }
    if (!req.session.adminId && team.captainPlayerId !== Number(playerId)) {
      res.status(403).json({ error: "Only captain or admin can change team settings" }); return;
    }

    const { name, tag, defaultMatchVisibility } = req.body as {
      name?: string; tag?: string; defaultMatchVisibility?: string;
    };
    const updates: Partial<typeof teamsTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (tag !== undefined) {
      const t = tag.trim().toUpperCase();
      if (!/^[A-Z0-9]{2,5}$/.test(t)) { res.status(400).json({ error: "Tag must be 2-5 uppercase alphanumeric chars" }); return; }
      updates.tag = t;
    }
    if (defaultMatchVisibility !== undefined) {
      if (!["private", "participants", "public"].includes(defaultMatchVisibility)) {
        res.status(400).json({ error: "defaultMatchVisibility must be private, participants, or public" }); return;
      }
      updates.defaultMatchVisibility = defaultMatchVisibility;
    }

    try {
      const [row] = await db.update(teamsTable).set(updates).where(eq(teamsTable.id, teamId)).returning();
      res.json(formatTeam(row!));
    } catch (err: any) {
      if (err?.code === "23505") { res.status(409).json({ error: "Team name or tag already taken" }); return; }
      throw err;
    }
  } catch (err) { res.status(500).json({ error: "Failed to update team settings" }); }
});

// PUT /teams/:id/matches/visibility — bulk visibility (captain or admin)
router.put("/:id/matches/visibility", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    if (isNaN(teamId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const playerId = req.session.playerId;
    if (!playerId && !req.session.adminId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) { res.status(404).json({ error: "Team not found" }); return; }
    if (!req.session.adminId && team.captainPlayerId !== Number(playerId)) {
      res.status(403).json({ error: "Only captain or admin can change match visibility" }); return;
    }

    const { visibility, matchIds } = req.body as { visibility: string; matchIds?: number[] };
    if (!visibility || !["public", "private", "default"].includes(visibility)) {
      res.status(400).json({ error: "visibility must be public, private, or default" }); return;
    }

    const visibleAfter = visibility === "public" ? new Date(0)
      : visibility === "private" ? new Date("9999-01-01") : null;

    const teamCondition = or(eq(matchesTable.teamAId, teamId), eq(matchesTable.teamBId, teamId))!;
    const where = matchIds?.length ? and(teamCondition, inArray(matchesTable.id, matchIds))! : teamCondition;

    const updated = await db.update(matchesTable)
      .set({ visibleAfter, updatedAt: new Date() })
      .where(where)
      .returning({ id: matchesTable.id });

    res.json({ success: true, updatedCount: updated.length });
  } catch (err) { res.status(500).json({ error: "Failed to update visibility" }); }
});

// GET /teams/:id/matches — paginated match list for captain hub (#127)
router.get("/:id/matches", async (req, res) => {
  try {
    const teamId = parseInt(req.params.id as string);
    if (isNaN(teamId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const playerId = req.session.playerId;
    if (!playerId && !req.session.adminId) {
      res.status(401).json({ error: "Not authenticated" }); return;
    }

    const [team] = await db.select().from(teamsTable).where(eq(teamsTable.id, teamId));
    if (!team) { res.status(404).json({ error: "Team not found" }); return; }
    if (!req.session.adminId && team.captainPlayerId !== Number(playerId)) {
      res.status(403).json({ error: "Captain access only" }); return;
    }

    const page  = Math.max(1, parseInt((req.query.page  as string) || "1"));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20")));
    const search = (req.query.search as string | undefined)?.trim().toLowerCase();
    const offset = (page - 1) * limit;

    const teamCondition = or(eq(matchesTable.teamAId, teamId), eq(matchesTable.teamBId, teamId))!;

    // Build WHERE clause: team condition + optional ILIKE search (#128 SQL-level pagination)
    const searchCondition = search
      ? and(
          teamCondition,
          or(
            ilike(matchesTable.sideAName, `%${search}%`),
            ilike(matchesTable.sideBName, `%${search}%`),
            ilike(matchesTable.matchTitle, `%${search}%`),
          )!
        )!
      : teamCondition;

    // COUNT query — one round-trip for total
    const [{ total }] = await db
      .select({ total: count() })
      .from(matchesTable)
      .where(searchCondition);

    const totalPages = Math.ceil(Number(total) / limit);

    // Data query — LIMIT + OFFSET pushed to DB
    const paginated = await db
      .select({
        id:           matchesTable.id,
        matchTitle:   matchesTable.matchTitle,
        sideAName:    matchesTable.sideAName,
        sideBName:    matchesTable.sideBName,
        teamAId:      matchesTable.teamAId,
        teamBId:      matchesTable.teamBId,
        winnerName:   matchesTable.winnerName,
        visibleAfter: matchesTable.visibleAfter,
        createdAt:    matchesTable.createdAt,
      })
      .from(matchesTable)
      .where(searchCondition)
      .orderBy(desc(matchesTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      matches: paginated.map((m) => ({
        id:           m.id,
        matchTitle:   m.matchTitle,
        sideAName:    m.sideAName,
        sideBName:    m.sideBName,
        teamAId:      m.teamAId ?? null,
        teamBId:      m.teamBId ?? null,
        winnerName:   m.winnerName,
        visibleAfter: m.visibleAfter?.toISOString() ?? null,
        createdAt:    m.createdAt.toISOString(),
      })),
      total,
      page,
      totalPages,
    });
  } catch (err) {
    console.error("[teams] get matches:", err);
    res.status(500).json({ error: "Failed to fetch team matches" });
  }
});

export default router;
