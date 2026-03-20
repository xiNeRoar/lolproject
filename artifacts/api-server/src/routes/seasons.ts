import { Router } from "express";
import { db } from "@workspace/db";
import {
  seasonsTable,
  teamsTable,
  seasonChampionsTable,
  eloHistoryTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { softResetElo } from "../lib/elo";
import { checkSeasonBadges } from "../lib/badges";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

// ── Formatter ────────────────────────────────────────────────

function formatSeason(s: typeof seasonsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    status: s.status,
    startDate: s.startDate,
    endDate: s.endDate,
    eloResetFactor: s.eloResetFactor,
    defaultMatchFormat: s.defaultMatchFormat ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

const VALID_FORMATS = ["BO1", "BO3", "BO5"] as const;

// ── Routes ───────────────────────────────────────────────────

// GET /seasons
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(seasonsTable)
      .orderBy(desc(seasonsTable.startDate));
    res.json(rows.map(formatSeason));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch seasons" });
  }
});

// POST /seasons — create (admin)
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { name, status, startDate, endDate, eloResetFactor, defaultMatchFormat } = req.body as {
      name?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      eloResetFactor?: string;
      defaultMatchFormat?: string | null;
    };

    if (!name || !startDate || !endDate) {
      res.status(400).json({ error: "name, startDate, and endDate are required" });
      return;
    }

    if (defaultMatchFormat && !VALID_FORMATS.includes(defaultMatchFormat as any)) {
      res.status(400).json({
        error: `Invalid defaultMatchFormat. Must be one of: ${VALID_FORMATS.join(", ")}`,
      });
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
        defaultMatchFormat: defaultMatchFormat || null,
      })
      .returning();

    res.status(201).json(formatSeason(row!));
    logAdminAction(req.session.adminId!, "create", "season", row!.id, `Created season "${name}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to create season" });
  }
});

// PUT /seasons/:id — update (admin)
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { name, status, startDate, endDate, eloResetFactor, defaultMatchFormat } = req.body as {
      name?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      eloResetFactor?: string;
      defaultMatchFormat?: string | null;
    };

    if (
      defaultMatchFormat !== undefined &&
      defaultMatchFormat !== null &&
      !VALID_FORMATS.includes(defaultMatchFormat as any)
    ) {
      res.status(400).json({
        error: `Invalid defaultMatchFormat. Must be one of: ${VALID_FORMATS.join(", ")}`,
      });
      return;
    }

    const updates: Partial<typeof seasonsTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (startDate !== undefined) updates.startDate = startDate;
    if (endDate !== undefined) updates.endDate = endDate;
    if (eloResetFactor !== undefined) updates.eloResetFactor = eloResetFactor;
    if (defaultMatchFormat !== undefined) updates.defaultMatchFormat = defaultMatchFormat;

    const [row] = await db
      .update(seasonsTable)
      .set(updates)
      .where(eq(seasonsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Season not found" });
      return;
    }
    res.json(formatSeason(row));
    logAdminAction(req.session.adminId!, "update", "season", row.id, `Updated season "${row.name}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to update season" });
  }
});

// DELETE /seasons/:id — delete (admin, must not be active)
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [target] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
    if (!target) {
      res.status(404).json({ error: "Season not found" });
      return;
    }
    if (target.status === "active") {
      res.status(400).json({ error: "Cannot delete an active season" });
      return;
    }

    await db.delete(seasonsTable).where(eq(seasonsTable.id, id));
    res.json({ success: true });
    logAdminAction(req.session.adminId!, "delete", "season", id, `Deleted season "${target.name}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete season" });
  }
});

// POST /seasons/:id/activate — set active, deactivate others (admin)
router.post("/:id/activate", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [target] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
    if (!target) {
      res.status(404).json({ error: "Season not found" });
      return;
    }

    // Move any currently-active seasons to completed
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
    logAdminAction(req.session.adminId!, "activate", "season", id, `Activated season "${target.name}"`);
  } catch (err) {
    res.status(500).json({ error: "Failed to activate season" });
  }
});

// POST /seasons/:id/complete — ELO soft reset for all active teams (admin)
router.post("/:id/complete", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [target] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));
    if (!target) {
      res.status(404).json({ error: "Season not found" });
      return;
    }
    if (target.status !== "active") {
      res.status(400).json({ error: "Only active seasons can be completed" });
      return;
    }

    const factor = parseFloat(String(target.eloResetFactor)) || 0.5;
    let activeTeams: typeof teamsTable.$inferSelect[] = [];

    await db.transaction(async (tx) => {
      // Mark season completed
      await tx
        .update(seasonsTable)
        .set({ status: "completed", updatedAt: new Date() })
        .where(eq(seasonsTable.id, id));

      activeTeams = await tx
        .select()
        .from(teamsTable)
        .where(eq(teamsTable.isActive, true));

      // Record season champion: team with highest ELO
      if (activeTeams.length > 0) {
        const champion = activeTeams.reduce((best, t) =>
          t.teamElo > best.teamElo ? t : best
        );
        await tx.insert(seasonChampionsTable).values({
          seasonId: id,
          teamId: champion.id,
          teamName: champion.name,
          finalElo: champion.teamElo,
        });
      }

      // Apply ELO soft reset to every active team + write elo_history
      for (const team of activeTeams) {
        const newElo = softResetElo(team.teamElo, factor);
        const delta = newElo - team.teamElo;

        await tx
          .update(teamsTable)
          .set({ teamElo: newElo, updatedAt: new Date() })
          .where(eq(teamsTable.id, team.id));

        await tx.insert(eloHistoryTable).values({
          teamId: team.id,
          elo: newElo,
          delta,
          matchId: null,
          reason: "season_reset",
        });
      }
    });

    const [updated] = await db.select().from(seasonsTable).where(eq(seasonsTable.id, id));

    // Fire badge checks async — award season_champion badge to all champion team members
    if (activeTeams.length > 0) {
      const champion = activeTeams.reduce((best, t) => t.teamElo > best.teamElo ? t : best);
      checkSeasonBadges(id, champion.id).catch((err) =>
        console.error("[badges] Error checking season badges:", err)
      );
    }

    res.json(formatSeason(updated!));
    logAdminAction(req.session.adminId!, "complete", "season", id, `Completed season "${target.name}" with ELO reset`);
  } catch (err) {
    res.status(500).json({ error: "Failed to complete season" });
  }
});

export default router;
