import { Router } from "express";
import { db } from "@workspace/db";
import {
  vodEntriesTable,
  eventsTable,
  vodTimestampsTable,
  playersTable,
  matchesTable,
  matchPlayersTable,
  teamsTable,
} from "@workspace/db";
import { eq, desc, and, inArray } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getRelatedVods } from "../lib/vodRecommendations";
import { logAdminAction } from "../lib/auditLog";
import { isMatchVisibleTo } from "../lib/privacyGate.js";

const router = Router();

// ── Formatters ───────────────────────────────────────────────

function formatVodEntry(
  v: typeof vodEntriesTable.$inferSelect,
  extra: { eventTitle?: string | null; playerRiotId?: string | null } = {}
) {
  return {
    id: v.id,
    eventId: v.eventId ?? null,
    matchId: v.matchId ?? null,
    eventTitle: extra.eventTitle ?? null,
    title: v.title,
    format: v.format ?? null,
    playerNames: v.playerNames ?? null,
    roleTag: v.roleTag ?? null,
    notes: v.notes ?? null,
    videoUrl: v.videoUrl,
    playerId: v.playerId ?? null,
    playerRiotId: extra.playerRiotId ?? null,
    champion: v.champion ?? null,
    opponentChampion: v.opponentChampion ?? null,
    position: v.position ?? null,
    patch: v.patch ?? null,
    teamEloAtTime: v.teamEloAtTime ?? null,
    gameNumber: v.gameNumber ?? null,
    vodType: v.vodType ?? null,
    teamId: v.teamId ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

function formatTimestamp(t: typeof vodTimestampsTable.$inferSelect) {
  return {
    id: t.id,
    vodId: t.vodId,
    label: t.label,
    seconds: t.seconds,
    type: t.type,
    createdAt: t.createdAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /vods — list VODs with filters; respects match visibility
router.get("/", async (req, res) => {
  try {
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;
    const format = req.query.format as string | undefined;
    const roleTag = req.query.roleTag as string | undefined;
    const search = req.query.search as string | undefined;
    const champion = req.query.champion as string | undefined;
    const position = req.query.position as string | undefined;
    const patch = req.query.patch as string | undefined;
    const teamId = req.query.teamId ? parseInt(req.query.teamId as string) : null;
    const playerId = req.query.playerId ? parseInt(req.query.playerId as string) : null;
    const vodType = req.query.type as string | undefined; // spectator | pov | all (#109)

    // Fetch all VODs with joins
    let rows = await db
      .select({
        vod: vodEntriesTable,
        eventTitle: eventsTable.title,
        playerRiotId: playersTable.riotId,
      })
      .from(vodEntriesTable)
      .leftJoin(eventsTable, eq(vodEntriesTable.eventId, eventsTable.id))
      .leftJoin(playersTable, eq(vodEntriesTable.playerId, playersTable.id))
      .orderBy(desc(vodEntriesTable.createdAt));

    // Apply filters
    if (eventId) rows = rows.filter((r) => r.vod.eventId === eventId);
    if (format) rows = rows.filter((r) => r.vod.format === format);
    if (roleTag) rows = rows.filter((r) => r.vod.roleTag === roleTag);
    if (champion)
      rows = rows.filter(
        (r) => r.vod.champion?.toLowerCase() === champion.toLowerCase()
      );
    if (position)
      rows = rows.filter(
        (r) => r.vod.position?.toLowerCase() === position.toLowerCase()
      );
    if (patch) rows = rows.filter((r) => r.vod.patch === patch);
    if (playerId) rows = rows.filter((r) => r.vod.playerId === playerId);
    if (vodType === "spectator") {
      // Prefer vodType column; fall back to playerId heuristic for legacy VODs (#120)
      rows = rows.filter((r) =>
        r.vod.vodType != null ? r.vod.vodType === "spectator" : r.vod.playerId == null
      );
    } else if (vodType === "pov") {
      rows = rows.filter((r) =>
        r.vod.vodType != null
          ? r.vod.vodType === "team-pov" || r.vod.vodType === "player-pov"
          : r.vod.playerId != null
      );
    }
    if (search) {
      const s = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.vod.title.toLowerCase().includes(s) ||
          (r.vod.playerNames ?? "").toLowerCase().includes(s)
      );
    }

    // teamId filter: keep only VODs whose linked match involved this team
    if (teamId) {
      const matchIds = rows
        .map((r) => r.vod.matchId)
        .filter((id): id is number => id !== null);

      if (matchIds.length > 0) {
        const matchRows = await db
          .select()
          .from(matchesTable)
          .where(inArray(matchesTable.id, matchIds));

        const matchMap: Record<number, typeof matchesTable.$inferSelect> = {};
        for (const m of matchRows) matchMap[m.id] = m;

        rows = rows.filter((r) => {
          if (!r.vod.matchId) return false;
          const m = matchMap[r.vod.matchId];
          return m && (m.teamAId === teamId || m.teamBId === teamId);
        });
      } else {
        rows = [];
      }
    }

    // Visibility filter: exclude VODs whose match is still private (D-10, D-11, D-12)
    // Admin sees all; public sees only visible matches
    const isAdmin = !!req.session?.adminId;
    if (!isAdmin) {
      const pid = req.session?.playerId ? Number(req.session.playerId) : null;
      const matchIdSet = new Set(rows.map((r) => r.vod.matchId).filter(Boolean) as number[]);

      if (matchIdSet.size > 0) {
        const matchRows = await db
          .select()
          .from(matchesTable)
          .where(inArray(matchesTable.id, [...matchIdSet]));

        const matchVisibility: Record<number, boolean> = {};
        for (const m of matchRows) {
          const { canSeeStats } = await isMatchVisibleTo(m, pid, false);
          matchVisibility[m.id] = canSeeStats;
        }

        rows = rows.filter((r) => {
          if (!r.vod.matchId) return true; // unlinked VODs always visible
          return matchVisibility[r.vod.matchId] !== false;
        });
      }

      // D-12: POV VODs require individual player rsoOptIn
      const povVods = rows.filter((r) =>
        r.vod.playerId != null && (r.vod.vodType === "player-pov" || r.vod.vodType === "team-pov")
      );
      if (povVods.length > 0) {
        const povPlayerIds = [...new Set(povVods.map((r) => r.vod.playerId!))];
        const playerRows = await db
          .select({ id: playersTable.id, rsoOptIn: playersTable.rsoOptIn })
          .from(playersTable)
          .where(inArray(playersTable.id, povPlayerIds));
        const optInMap = new Map(playerRows.map((p) => [p.id, p.rsoOptIn]));

        rows = rows.filter((r) => {
          // Non-POV VODs pass through
          if (r.vod.vodType !== "player-pov" && r.vod.vodType !== "team-pov") return true;
          if (!r.vod.playerId) return true;
          // POV VOD: only show if player opted in
          return optInMap.get(r.vod.playerId) === true;
        });
      }
    }

    res.json(
      rows.map((r) =>
        formatVodEntry(r.vod, {
          eventTitle: r.eventTitle ?? null,
          playerRiotId: r.playerRiotId ?? null,
        })
      )
    );
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch VODs" });
  }
});

// GET /vods/:id — VOD detail with timestamps and related VODs
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [vod] = await db.select().from(vodEntriesTable).where(eq(vodEntriesTable.id, id));
    if (!vod) {
      res.status(404).json({ error: "VOD not found" });
      return;
    }

    // Visibility gate: VOD follows match visibility (D-10)
    const isAdmin = !!req.session?.adminId;
    if (!isAdmin && vod.matchId) {
      const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, vod.matchId));
      if (match) {
        const pid = req.session?.playerId ? Number(req.session.playerId) : null;
        const { canSeeStats } = await isMatchVisibleTo(match, pid, false);
        if (!canSeeStats) {
          res.status(403).json({ error: "This VOD is not publicly visible" });
          return;
        }
      }
    }

    // D-12: POV VOD requires individual player rsoOptIn
    if (!isAdmin && vod.playerId && (vod.vodType === "player-pov" || vod.vodType === "team-pov")) {
      const [vodPlayer] = await db.select({ rsoOptIn: playersTable.rsoOptIn }).from(playersTable).where(eq(playersTable.id, vod.playerId));
      if (vodPlayer && !vodPlayer.rsoOptIn) {
        res.status(403).json({ error: "This POV VOD requires player consent" });
        return;
      }
    }

    const event = vod.eventId
      ? (await db.select().from(eventsTable).where(eq(eventsTable.id, vod.eventId)))[0]
      : null;

    const player = vod.playerId
      ? (await db.select().from(playersTable).where(eq(playersTable.id, vod.playerId)))[0]
      : null;

    const timestamps = await db
      .select()
      .from(vodTimestampsTable)
      .where(eq(vodTimestampsTable.vodId, id))
      .orderBy(vodTimestampsTable.seconds);

    const relatedRaw = await getRelatedVods({
      vodId: id,
      champion: vod.champion,
      opponentChampion: vod.opponentChampion,
      position: vod.position,
    });

    res.json({
      ...formatVodEntry(vod, {
        eventTitle: event?.title ?? null,
        playerRiotId: player?.riotId ?? null,
      }),
      timestamps: timestamps.map(formatTimestamp),
      relatedVods: relatedRaw.map((v) => formatVodEntry(v)),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch VOD" });
  }
});

// POST /vods — create VOD (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      eventId,
      matchId,
      title,
      format,
      playerNames,
      roleTag,
      notes,
      videoUrl,
      playerId,
      champion,
      opponentChampion,
      position,
      patch,
      teamEloAtTime,
      gameNumber,
      vodType,
      teamId,
    } = req.body as {
      eventId?: number | null;
      matchId?: number | null;
      title?: string;
      format?: string | null;
      playerNames?: string | null;
      roleTag?: string | null;
      notes?: string | null;
      videoUrl?: string;
      playerId?: number | null;
      champion?: string | null;
      opponentChampion?: string | null;
      position?: string | null;
      patch?: string | null;
      teamEloAtTime?: number | null;
      gameNumber?: number | null;
      vodType?: string | null;
      teamId?: number | null;
    };

    if (!title || !videoUrl) {
      res.status(400).json({ error: "title and videoUrl are required" });
      return;
    }

    const [row] = await db
      .insert(vodEntriesTable)
      .values({
        eventId: eventId ? Number(eventId) : null,
        matchId: matchId ? Number(matchId) : null,
        title,
        format: format || null,
        playerNames: playerNames || null,
        roleTag: roleTag || null,
        notes: notes || null,
        videoUrl,
        playerId: playerId ? Number(playerId) : null,
        champion: champion || null,
        opponentChampion: opponentChampion || null,
        position: position || null,
        patch: patch || null,
        teamEloAtTime: teamEloAtTime ? Number(teamEloAtTime) : null,
        gameNumber: gameNumber ? Number(gameNumber) : null,
        vodType: vodType || null,
        teamId: teamId ? Number(teamId) : null,
      })
      .returning();

    const event = eventId
      ? (await db.select().from(eventsTable).where(eq(eventsTable.id, Number(eventId))))[0]
      : null;

    const player = row!.playerId
      ? (await db.select().from(playersTable).where(eq(playersTable.id, row!.playerId)))[0]
      : null;

    res.status(201).json(
      formatVodEntry(row!, {
        eventTitle: event?.title ?? null,
        playerRiotId: player?.riotId ?? null,
      })
    );
    logAdminAction(req.session.adminId!, "create", "vod", row!.id, `Created VOD "${title}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to create VOD" });
  }
});

// PUT /vods/:id — update VOD (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const {
      eventId,
      matchId,
      title,
      format,
      playerNames,
      roleTag,
      notes,
      videoUrl,
      playerId,
      champion,
      opponentChampion,
      position,
      patch,
      teamEloAtTime,
      gameNumber,
      vodType,
      teamId,
    } = req.body as {
      eventId?: number | null;
      matchId?: number | null;
      title?: string;
      format?: string | null;
      playerNames?: string | null;
      roleTag?: string | null;
      notes?: string | null;
      videoUrl?: string;
      playerId?: number | null;
      champion?: string | null;
      opponentChampion?: string | null;
      position?: string | null;
      patch?: string | null;
      teamEloAtTime?: number | null;
    };

    const updates: Partial<typeof vodEntriesTable.$inferInsert> = { updatedAt: new Date() };
    if (eventId !== undefined) updates.eventId = eventId ? Number(eventId) : null;
    if (matchId !== undefined) updates.matchId = matchId ? Number(matchId) : null;
    if (title !== undefined) updates.title = title;
    if (format !== undefined) updates.format = format || null;
    if (playerNames !== undefined) updates.playerNames = playerNames || null;
    if (roleTag !== undefined) updates.roleTag = roleTag || null;
    if (notes !== undefined) updates.notes = notes || null;
    if (videoUrl !== undefined) updates.videoUrl = videoUrl;
    if (playerId !== undefined) updates.playerId = playerId ? Number(playerId) : null;
    if (champion !== undefined) updates.champion = champion || null;
    if (opponentChampion !== undefined) updates.opponentChampion = opponentChampion || null;
    if (position !== undefined) updates.position = position || null;
    if (patch !== undefined) updates.patch = patch || null;
    if (teamEloAtTime !== undefined)
      updates.teamEloAtTime = teamEloAtTime ? Number(teamEloAtTime) : null;
    if (gameNumber !== undefined) updates.gameNumber = gameNumber ? Number(gameNumber) : null;
    if (vodType !== undefined) updates.vodType = vodType || null;
    if (teamId !== undefined) updates.teamId = teamId ? Number(teamId) : null;

    const [row] = await db
      .update(vodEntriesTable)
      .set(updates)
      .where(eq(vodEntriesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "VOD not found" });
      return;
    }

    const event = row.eventId
      ? (await db.select().from(eventsTable).where(eq(eventsTable.id, row.eventId)))[0]
      : null;

    const player = row.playerId
      ? (await db.select().from(playersTable).where(eq(playersTable.id, row.playerId)))[0]
      : null;

    res.json(
      formatVodEntry(row, {
        eventTitle: event?.title ?? null,
        playerRiotId: player?.riotId ?? null,
      })
    );
    logAdminAction(req.session.adminId!, "update", "vod", row.id, `Updated VOD "${row.title}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to update VOD" });
  }
});

// DELETE /vods/:id — delete VOD (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(vodEntriesTable).where(eq(vodEntriesTable.id, id));
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "delete", "vod", id, `Deleted VOD #${id}`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete VOD" });
  }
});

export default router;
