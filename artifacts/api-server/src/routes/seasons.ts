import { Router } from "express";
import { db } from "@workspace/db";
import { seasonsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { softResetElo } from "../lib/elo";

const router = Router();

function formatSeason(s: typeof seasonsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    eloResetFactor: s.eloResetFactor,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

router.get("/", async (_req, res) => {
  const rows = await db
    .select()
    .from(seasonsTable)
    .orderBy(seasonsTable.startDate);
  res.json(rows.map(formatSeason));
});

router.post("/", requireAdmin, async (req, res) => {
  const { name, status, startDate, endDate, eloResetFactor } = req.body as {
    name?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    eloResetFactor?: string;
  };

  if (!name || !startDate || !endDate) {
    res.status(400).json({ error: "name, startDate, and endDate are required" });
    return;
  }

  const [row] = await db
    .insert(seasonsTable)
    .values({
      name,
      status: status || "upcoming",
      startDate,
      endDate,
      eloResetFactor: eloResetFactor || "0.50",
    })
    .returning();

  res.status(201).json(formatSeason(row!));
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.id, id));

  if (!row) { res.status(404).json({ error: "Season not found" }); return; }
  res.json(formatSeason(row));
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { name, status, startDate, endDate, eloResetFactor } = req.body as {
    name?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    eloResetFactor?: string;
  };

  const updates: Partial<typeof seasonsTable.$inferInsert> = { updatedAt: new Date() };
  if (name !== undefined) updates.name = name;
  if (status !== undefined) updates.status = status;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;
  if (eloResetFactor !== undefined) updates.eloResetFactor = eloResetFactor;

  const [row] = await db
    .update(seasonsTable)
    .set(updates)
    .where(eq(seasonsTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Season not found" }); return; }
  res.json(formatSeason(row));
});

// Activate a season — deactivates all others (does not reset ELO; use /complete for that)
router.post("/:id/activate", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [target] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.id, id));

  if (!target) { res.status(404).json({ error: "Season not found" }); return; }

  // Move all currently-active seasons that aren't this one to 'completed'
  await db
    .update(seasonsTable)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(seasonsTable.status, "active"));

  const [activated] = await db
    .update(seasonsTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(seasonsTable.id, id))
    .returning();

  res.json(formatSeason(activated!));
});

// Complete a season — sets status to 'completed' and applies ELO soft reset to all active players
router.post("/:id/complete", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [target] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.id, id));

  if (!target) { res.status(404).json({ error: "Season not found" }); return; }
  if (target.status !== "active") {
    res.status(400).json({ error: "Only active seasons can be completed" });
    return;
  }

  const factor = parseFloat(String(target.eloResetFactor)) || 0.5;

  // Use a transaction: mark season completed then apply ELO soft reset to all active players
  await db.transaction(async (tx) => {
    await tx
      .update(seasonsTable)
      .set({ status: "completed", updatedAt: new Date() })
      .where(eq(seasonsTable.id, id));

    const activePlayers = await tx
      .select()
      .from(playersTable)
      .where(eq(playersTable.isActive, true));

    for (const player of activePlayers) {
      const newElo = softResetElo(player.currentElo, factor);
      await tx
        .update(playersTable)
        .set({ currentElo: newElo, updatedAt: new Date() })
        .where(eq(playersTable.id, player.id));
    }
  });

  const [updated] = await db
    .select()
    .from(seasonsTable)
    .where(eq(seasonsTable.id, id));

  res.json(formatSeason(updated!));
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [target] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
  if (target?.status === "active") {
    res.status(400).json({ error: "Cannot delete an active season" });
    return;
  }

  await db.delete(seasonsTable).where(eq(seasonsTable.id, id));
  res.json({ success: true });
});

export default router;
