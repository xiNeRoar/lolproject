import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, matchesTable, vodEntriesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

// ── Formatters ───────────────────────────────────────────────

function formatEvent(e: typeof eventsTable.$inferSelect) {
  return {
    id: e.id,
    title: e.title,
    slug: e.slug,
    format: e.format,
    eventDate: e.eventDate,
    registrationStatus: e.registrationStatus,
    shortDescription: e.shortDescription,
    fullDescription: e.fullDescription ?? null,
    rulesSummary: e.rulesSummary ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  };
}

function formatMatchForEvent(
  m: typeof matchesTable.$inferSelect,
  eventTitle: string
) {
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
    gameVersion: m.gameVersion ?? null,
    resultSource: m.resultSource,
    seasonId: m.seasonId ?? null,
    eventId: m.eventId ?? null,
    eventTitle,
    isPlayoff: m.isPlayoff,
    round: m.round ?? null,
    bracketSlot: m.bracketSlot ?? null,
    nextMatchId: m.nextMatchId ?? null,
    isLosersBracket: m.isLosersBracket ?? null,
    groupId: m.groupId ?? null,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function formatVodForEvent(v: typeof vodEntriesTable.$inferSelect, eventTitle: string) {
  return {
    id: v.id,
    matchId: v.matchId ?? null,
    eventId: v.eventId ?? null,
    eventTitle,
    title: v.title,
    format: v.format ?? null,
    playerNames: v.playerNames ?? null,
    roleTag: v.roleTag ?? null,
    notes: v.notes ?? null,
    videoUrl: v.videoUrl,
    playerId: v.playerId ?? null,
    champion: v.champion ?? null,
    position: v.position ?? null,
    patch: v.patch ?? null,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /events — list all events ordered by date
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(eventsTable)
      .orderBy(asc(eventsTable.eventDate));
    res.json(rows.map(formatEvent));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// POST /events — create (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      slug,
      format,
      eventDate,
      registrationStatus,
      shortDescription,
      fullDescription,
      rulesSummary,
    } = req.body as {
      title?: string;
      slug?: string;
      format?: string;
      eventDate?: string;
      registrationStatus?: string;
      shortDescription?: string;
      fullDescription?: string | null;
      rulesSummary?: string | null;
    };

    if (!title || !slug || !format || !eventDate || !registrationStatus || !shortDescription) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [row] = await db
      .insert(eventsTable)
      .values({
        title,
        slug,
        format,
        eventDate,
        registrationStatus,
        shortDescription,
        fullDescription: fullDescription || null,
        rulesSummary: rulesSummary || null,
      })
      .returning();

    res.status(201).json(formatEvent(row!));
    logAdminAction(req.session.adminId!, "create", "event", row!.id, `Created event "${title}"`);
  } catch (err: any) {
    if (err?.code === "23505") {
      res.status(400).json({ error: "An event with this slug already exists" });
      return;
    }
    res.status(500).json({ error: "Failed to create event" });
  }
});

// GET /events/:slug — event detail with matches and vods
router.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.slug, slug!));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const matches = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.eventId, event.id))
      .orderBy(asc(matchesTable.createdAt));

    const vods = await db
      .select()
      .from(vodEntriesTable)
      .where(eq(vodEntriesTable.eventId, event.id))
      .orderBy(asc(vodEntriesTable.createdAt));

    res.json({
      ...formatEvent(event),
      matches: matches.map((m) => formatMatchForEvent(m, event.title)),
      vods: vods.map((v) => formatVodForEvent(v, event.title)),
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// PUT /events/:id/edit — update (admin)
router.put("/:id/edit", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const {
      title,
      slug,
      format,
      eventDate,
      registrationStatus,
      shortDescription,
      fullDescription,
      rulesSummary,
    } = req.body as Partial<typeof eventsTable.$inferInsert>;

    const [row] = await db
      .update(eventsTable)
      .set({
        title,
        slug,
        format,
        eventDate,
        registrationStatus,
        shortDescription,
        fullDescription: fullDescription || null,
        rulesSummary: rulesSummary || null,
        updatedAt: new Date(),
      })
      .where(eq(eventsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    res.json(formatEvent(row));
    logAdminAction(req.session.adminId!, "update", "event", row.id, `Updated event "${row.title}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to update event" });
  }
});

// DELETE /events/:id/delete — delete (admin)
router.delete("/:id/delete", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(eventsTable).where(eq(eventsTable.id, id));
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "delete", "event", id, `Deleted event #${id}`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
