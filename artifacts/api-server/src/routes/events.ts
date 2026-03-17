import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, matchesTable, vodEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function formatEvent(r: typeof eventsTable.$inferSelect) {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    format: r.format,
    eventDate: r.eventDate,
    registrationStatus: r.registrationStatus,
    shortDescription: r.shortDescription,
    fullDescription: r.fullDescription,
    rulesSummary: r.rulesSummary,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const rows = await db.select().from(eventsTable).orderBy(eventsTable.eventDate);
  res.json(rows.map(formatEvent));
});

router.post("/", requireAdmin, async (req, res) => {
  const { title, slug, format, eventDate, registrationStatus, shortDescription, fullDescription, rulesSummary } = req.body;
  if (!title || !slug || !format || !eventDate || !registrationStatus || !shortDescription) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [row] = await db.insert(eventsTable).values({
    title, slug, format, eventDate, registrationStatus, shortDescription,
    fullDescription: fullDescription || null,
    rulesSummary: rulesSummary || null,
  }).returning();
  res.status(201).json(formatEvent(row!));
});

router.get("/:slug", async (req, res) => {
  const { slug } = req.params;
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.slug, slug!));
  if (!event) { res.status(404).json({ error: "Event not found" }); return; }

  const matches = await db.select().from(matchesTable).where(eq(matchesTable.eventId, event.id));
  const vods = await db.select().from(vodEntriesTable).where(eq(vodEntriesTable.eventId, event.id));

  res.json({
    ...formatEvent(event),
    matches: matches.map((m) => ({
      id: m.id,
      eventId: m.eventId,
      eventTitle: event.title,
      matchTitle: m.matchTitle,
      sideAName: m.sideAName,
      sideBName: m.sideBName,
      winnerName: m.winnerName,
      score: m.score,
      format: m.format,
      vodUrl: m.vodUrl,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    })),
    vods: vods.map((v) => ({
      id: v.id,
      eventId: v.eventId,
      eventTitle: event.title,
      title: v.title,
      format: v.format,
      playerNames: v.playerNames,
      roleTag: v.roleTag,
      notes: v.notes,
      videoUrl: v.videoUrl,
      createdAt: v.createdAt.toISOString(),
      updatedAt: v.updatedAt.toISOString(),
    })),
  });
});

router.put("/:id/edit", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { title, slug, format, eventDate, registrationStatus, shortDescription, fullDescription, rulesSummary } = req.body;
  const [row] = await db.update(eventsTable).set({
    title, slug, format, eventDate, registrationStatus, shortDescription,
    fullDescription: fullDescription || null,
    rulesSummary: rulesSummary || null,
    updatedAt: new Date(),
  }).where(eq(eventsTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(formatEvent(row));
});

router.delete("/:id/delete", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(eventsTable).where(eq(eventsTable.id, id));
  res.json({ success: true });
});

export default router;
