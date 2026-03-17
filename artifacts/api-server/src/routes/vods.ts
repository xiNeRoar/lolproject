import { Router } from "express";
import { db } from "@workspace/db";
import { vodEntriesTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/", async (req, res) => {
  const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;
  const format = req.query.format as string | undefined;
  const roleTag = req.query.roleTag as string | undefined;
  const search = req.query.search as string | undefined;

  let rows = await db
    .select({
      id: vodEntriesTable.id,
      eventId: vodEntriesTable.eventId,
      title: vodEntriesTable.title,
      format: vodEntriesTable.format,
      playerNames: vodEntriesTable.playerNames,
      roleTag: vodEntriesTable.roleTag,
      notes: vodEntriesTable.notes,
      videoUrl: vodEntriesTable.videoUrl,
      createdAt: vodEntriesTable.createdAt,
      updatedAt: vodEntriesTable.updatedAt,
      eventTitle: eventsTable.title,
    })
    .from(vodEntriesTable)
    .leftJoin(eventsTable, eq(vodEntriesTable.eventId, eventsTable.id))
    .orderBy(vodEntriesTable.createdAt);

  if (eventId) {
    rows = rows.filter((r) => r.eventId === eventId);
  }
  if (format) {
    rows = rows.filter((r) => r.format === format);
  }
  if (roleTag) {
    rows = rows.filter((r) => r.roleTag === roleTag);
  }
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) =>
      r.title.toLowerCase().includes(s) ||
      (r.playerNames ?? "").toLowerCase().includes(s)
    );
  }

  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    eventTitle: r.eventTitle ?? null,
  })));
});

router.post("/", requireAdmin, async (req, res) => {
  const { eventId, title, format, playerNames, roleTag, notes, videoUrl } = req.body;
  if (!title || !videoUrl) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [row] = await db.insert(vodEntriesTable).values({
    eventId: eventId ? Number(eventId) : null,
    title,
    format: format || null,
    playerNames: playerNames || null,
    roleTag: roleTag || null,
    notes: notes || null,
    videoUrl,
  }).returning();

  const event = eventId ? (await db.select().from(eventsTable).where(eq(eventsTable.id, Number(eventId))))[0] : null;

  res.status(201).json({
    id: row!.id,
    eventId: row!.eventId,
    eventTitle: event?.title ?? null,
    title: row!.title,
    format: row!.format,
    playerNames: row!.playerNames,
    roleTag: row!.roleTag,
    notes: row!.notes,
    videoUrl: row!.videoUrl,
    createdAt: row!.createdAt.toISOString(),
    updatedAt: row!.updatedAt.toISOString(),
  });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { eventId, title, format, playerNames, roleTag, notes, videoUrl } = req.body;
  const [row] = await db.update(vodEntriesTable).set({
    eventId: eventId ? Number(eventId) : null,
    title,
    format: format || null,
    playerNames: playerNames || null,
    roleTag: roleTag || null,
    notes: notes || null,
    videoUrl: videoUrl || null,
    updatedAt: new Date(),
  }).where(eq(vodEntriesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const event = row.eventId ? (await db.select().from(eventsTable).where(eq(eventsTable.id, row.eventId)))[0] : null;

  res.json({
    id: row.id,
    eventId: row.eventId,
    eventTitle: event?.title ?? null,
    title: row.title,
    format: row.format,
    playerNames: row.playerNames,
    roleTag: row.roleTag,
    notes: row.notes,
    videoUrl: row.videoUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(vodEntriesTable).where(eq(vodEntriesTable.id, id));
  res.json({ success: true });
});

export default router;
