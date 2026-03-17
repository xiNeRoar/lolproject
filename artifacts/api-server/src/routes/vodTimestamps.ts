import { Router } from "express";
import { db } from "@workspace/db";
import { vodTimestampsTable, vodEntriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

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

// GET /vods/:id/timestamps — public: list timestamps ordered by seconds asc
router.get("/:id/timestamps", async (req, res) => {
  const vodId = parseInt(req.params.id as string);
  if (isNaN(vodId)) { res.status(400).json({ error: "Invalid vod id" }); return; }

  const rows = await db
    .select()
    .from(vodTimestampsTable)
    .where(eq(vodTimestampsTable.vodId, vodId))
    .orderBy(vodTimestampsTable.seconds);

  res.json(rows.map(formatTimestamp));
});

// POST /vods/:id/timestamps — admin: add a timestamp to a VOD
router.post("/:id/timestamps", requireAdmin, async (req, res) => {
  const vodId = parseInt(req.params.id as string);
  if (isNaN(vodId)) { res.status(400).json({ error: "Invalid vod id" }); return; }

  const [vod] = await db.select().from(vodEntriesTable).where(eq(vodEntriesTable.id, vodId));
  if (!vod) { res.status(404).json({ error: "VOD not found" }); return; }

  const { label, seconds, type } = req.body as {
    label?: string;
    seconds?: number;
    type?: string;
  };

  if (!label || seconds === undefined || seconds === null) {
    res.status(400).json({ error: "label and seconds are required" });
    return;
  }

  const [row] = await db
    .insert(vodTimestampsTable)
    .values({ vodId, label, seconds: Number(seconds), type: type || "manual" })
    .returning();

  res.status(201).json(formatTimestamp(row!));
});

// DELETE /vods/timestamps/:id — admin: delete a timestamp by its own ID
router.delete("/timestamps/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  await db.delete(vodTimestampsTable).where(eq(vodTimestampsTable.id, id));
  res.json({ success: true });
});

export default router;
