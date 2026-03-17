import { Router } from "express";
import { db } from "@workspace/db";
import { matchesTable, eventsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/", async (req, res) => {
  const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;
  const format = req.query.format as string | undefined;
  const search = req.query.search as string | undefined;

  let rows = await db
    .select({
      id: matchesTable.id,
      eventId: matchesTable.eventId,
      matchTitle: matchesTable.matchTitle,
      sideAName: matchesTable.sideAName,
      sideBName: matchesTable.sideBName,
      winnerName: matchesTable.winnerName,
      score: matchesTable.score,
      format: matchesTable.format,
      vodUrl: matchesTable.vodUrl,
      createdAt: matchesTable.createdAt,
      updatedAt: matchesTable.updatedAt,
      eventTitle: eventsTable.title,
    })
    .from(matchesTable)
    .leftJoin(eventsTable, eq(matchesTable.eventId, eventsTable.id))
    .orderBy(matchesTable.createdAt);

  if (eventId) {
    rows = rows.filter((r) => r.eventId === eventId);
  }
  if (format) {
    rows = rows.filter((r) => r.format === format);
  }
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter((r) =>
      r.matchTitle.toLowerCase().includes(s) ||
      r.sideAName.toLowerCase().includes(s) ||
      r.sideBName.toLowerCase().includes(s) ||
      r.winnerName.toLowerCase().includes(s)
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
  const { eventId, matchTitle, sideAName, sideBName, winnerName, score, format, vodUrl } = req.body;
  if (!matchTitle || !sideAName || !sideBName || !winnerName) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [row] = await db.insert(matchesTable).values({
    eventId: eventId ? Number(eventId) : null,
    matchTitle, sideAName, sideBName, winnerName,
    score: score || null,
    format: format || null,
    vodUrl: vodUrl || null,
  }).returning();

  const event = eventId ? (await db.select().from(eventsTable).where(eq(eventsTable.id, Number(eventId))))[0] : null;

  res.status(201).json({
    id: row!.id,
    eventId: row!.eventId,
    eventTitle: event?.title ?? null,
    matchTitle: row!.matchTitle,
    sideAName: row!.sideAName,
    sideBName: row!.sideBName,
    winnerName: row!.winnerName,
    score: row!.score,
    format: row!.format,
    vodUrl: row!.vodUrl,
    createdAt: row!.createdAt.toISOString(),
    updatedAt: row!.updatedAt.toISOString(),
  });
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { eventId, matchTitle, sideAName, sideBName, winnerName, score, format, vodUrl } = req.body;
  const [row] = await db.update(matchesTable).set({
    eventId: eventId ? Number(eventId) : null,
    matchTitle, sideAName, sideBName, winnerName,
    score: score || null,
    format: format || null,
    vodUrl: vodUrl || null,
    updatedAt: new Date(),
  }).where(eq(matchesTable.id, id)).returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const event = row.eventId ? (await db.select().from(eventsTable).where(eq(eventsTable.id, row.eventId)))[0] : null;

  res.json({
    id: row.id,
    eventId: row.eventId,
    eventTitle: event?.title ?? null,
    matchTitle: row.matchTitle,
    sideAName: row.sideAName,
    sideBName: row.sideBName,
    winnerName: row.winnerName,
    score: row.score,
    format: row.format,
    vodUrl: row.vodUrl,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(matchesTable).where(eq(matchesTable.id, id));
  res.json({ success: true });
});

export default router;
