import { Router } from "express";
import { db } from "@workspace/db";
import { eventRegistrationsTable, eventsTable } from "@workspace/db";
import { eq, and, ne, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

// ── Formatter ────────────────────────────────────────────────

function formatRegistration(
  r: typeof eventRegistrationsTable.$inferSelect,
  eventTitle?: string | null
) {
  return {
    id: r.id,
    eventId: r.eventId,
    teamId: r.teamId ?? null,
    eventTitle: eventTitle ?? null,
    riotId: r.riotId,
    discordUsername: r.discordUsername,
    currentRank: r.currentRank,
    city: r.city,
    availabilityConfirmation: r.availabilityConfirmation,
    notes: r.notes ?? null,
    status: r.status,
    playerId: r.playerId ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

// ── Routes ───────────────────────────────────────────────────

// GET /registrations — list registrations (admin); optional ?eventId filter
router.get("/", async (req, res) => {
  try {
    const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;

    const rows = eventId
      ? await db
          .select({
            reg: eventRegistrationsTable,
            eventTitle: eventsTable.title,
          })
          .from(eventRegistrationsTable)
          .leftJoin(eventsTable, eq(eventRegistrationsTable.eventId, eventsTable.id))
          .where(
            and(
              eq(eventRegistrationsTable.eventId, eventId),
              ne(eventRegistrationsTable.status, "withdrawn")
            )
          )
          .orderBy(asc(eventRegistrationsTable.createdAt))
      : await db
          .select({
            reg: eventRegistrationsTable,
            eventTitle: eventsTable.title,
          })
          .from(eventRegistrationsTable)
          .leftJoin(eventsTable, eq(eventRegistrationsTable.eventId, eventsTable.id))
          .orderBy(asc(eventRegistrationsTable.createdAt));

    res.json(rows.map((r) => formatRegistration(r.reg, r.eventTitle ?? null)));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// POST /registrations removed (#79) — PRD v3: website is read-only display layer.
// Event registration is bot-only via /register-event → POST /api/events/:idOrSlug/register-team.

// PUT /registrations/:id/confirm — mark as confirmed (admin)
router.put("/:id/confirm", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .update(eventRegistrationsTable)
      .set({ status: "confirmed" })
      .where(eq(eventRegistrationsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "update", "registration", row.id, `Confirmed registration for "${row.riotId}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to confirm registration" });
  }
});

// PUT /registrations/:id/withdraw — mark as withdrawn (admin)
router.put("/:id/withdraw", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .update(eventRegistrationsTable)
      .set({ status: "withdrawn" })
      .where(eq(eventRegistrationsTable.id, id))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Registration not found" });
      return;
    }
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "update", "registration", row.id, `Withdrew registration for "${row.riotId}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to withdraw registration" });
  }
});

// DELETE /registrations/:id — hard delete (admin)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    await db.delete(eventRegistrationsTable).where(eq(eventRegistrationsTable.id, id));
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "delete", "registration", id, `Deleted registration #${id}`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete registration" });
  }
});

export default router;
