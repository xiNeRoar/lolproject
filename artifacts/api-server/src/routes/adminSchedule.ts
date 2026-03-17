import { Router } from "express";
import { db } from "@workspace/db";
import { adminScheduleSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function formatSchedule(s: typeof adminScheduleSettingsTable.$inferSelect) {
  return {
    id: s.id,
    availableDays: s.availableDays,
    startTime: s.startTime,
    endTime: s.endTime,
    maxConcurrentMatches: s.maxConcurrentMatches,
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function getOrCreateSchedule() {
  const rows = await db.select().from(adminScheduleSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(adminScheduleSettingsTable).values({}).returning();
  return inserted[0];
}

router.get("/", async (_req, res) => {
  try {
    const schedule = await getOrCreateSchedule();
    res.json(formatSchedule(schedule));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin schedule" });
  }
});

router.put("/", requireAdmin, async (req, res) => {
  try {
    const schedule = await getOrCreateSchedule();
    const { availableDays, startTime, endTime, maxConcurrentMatches } = req.body as {
      availableDays?: string;
      startTime?: string;
      endTime?: string;
      maxConcurrentMatches?: number;
    };
    const { eq } = await import("drizzle-orm");
    const updated = await db
      .update(adminScheduleSettingsTable)
      .set({
        ...(availableDays !== undefined && { availableDays }),
        ...(startTime !== undefined && { startTime }),
        ...(endTime !== undefined && { endTime }),
        ...(maxConcurrentMatches !== undefined && { maxConcurrentMatches }),
        updatedAt: new Date(),
      })
      .where(eq(adminScheduleSettingsTable.id, schedule.id))
      .returning();
    res.json(formatSchedule(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to update admin schedule" });
  }
});

export default router;
