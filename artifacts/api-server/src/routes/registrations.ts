import { Router } from "express";
import { db } from "@workspace/db";
import { eventRegistrationsTable, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/", requireAdmin, async (req, res) => {
  const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;

  let rows;
  if (eventId) {
    rows = await db
      .select({
        id: eventRegistrationsTable.id,
        eventId: eventRegistrationsTable.eventId,
        riotId: eventRegistrationsTable.riotId,
        discordUsername: eventRegistrationsTable.discordUsername,
        currentRank: eventRegistrationsTable.currentRank,
        city: eventRegistrationsTable.city,
        availabilityConfirmation: eventRegistrationsTable.availabilityConfirmation,
        notes: eventRegistrationsTable.notes,
        createdAt: eventRegistrationsTable.createdAt,
        eventTitle: eventsTable.title,
      })
      .from(eventRegistrationsTable)
      .leftJoin(eventsTable, eq(eventRegistrationsTable.eventId, eventsTable.id))
      .where(eq(eventRegistrationsTable.eventId, eventId));
  } else {
    rows = await db
      .select({
        id: eventRegistrationsTable.id,
        eventId: eventRegistrationsTable.eventId,
        riotId: eventRegistrationsTable.riotId,
        discordUsername: eventRegistrationsTable.discordUsername,
        currentRank: eventRegistrationsTable.currentRank,
        city: eventRegistrationsTable.city,
        availabilityConfirmation: eventRegistrationsTable.availabilityConfirmation,
        notes: eventRegistrationsTable.notes,
        createdAt: eventRegistrationsTable.createdAt,
        eventTitle: eventsTable.title,
      })
      .from(eventRegistrationsTable)
      .leftJoin(eventsTable, eq(eventRegistrationsTable.eventId, eventsTable.id))
      .orderBy(eventRegistrationsTable.createdAt);
  }

  res.json(rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    eventTitle: r.eventTitle ?? null,
  })));
});

router.post("/", async (req, res) => {
  const { eventId, riotId, discordUsername, currentRank, city, availabilityConfirmation, notes } = req.body;
  if (!eventId || !riotId || !discordUsername || !currentRank || !city || !availabilityConfirmation) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [row] = await db.insert(eventRegistrationsTable).values({
    eventId: Number(eventId),
    riotId,
    discordUsername,
    currentRank,
    city,
    availabilityConfirmation,
    notes: notes || null,
  }).returning();

  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, Number(eventId)));

  res.status(201).json({
    id: row!.id,
    eventId: row!.eventId,
    eventTitle: event?.title ?? null,
    riotId: row!.riotId,
    discordUsername: row!.discordUsername,
    currentRank: row!.currentRank,
    city: row!.city,
    availabilityConfirmation: row!.availabilityConfirmation,
    notes: row!.notes,
    createdAt: row!.createdAt.toISOString(),
  });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id!);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(eventRegistrationsTable).where(eq(eventRegistrationsTable.id, id));
  res.json({ success: true });
});

export default router;
