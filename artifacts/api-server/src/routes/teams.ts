import { Router } from "express";
import { db } from "@workspace/db";
import { teamsTable, teamMembersTable, playersTable, matchesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
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
    res.json({ success: true });
  } catch (err) {
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
    res.status(500).json({ error: "Failed to remove member" });
  }
});

export default router;
