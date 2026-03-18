import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";

const router = Router();

// GET / — get notifications for current player
router.get("/", async (req, res) => {
  if (!req.session.playerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.playerId, req.session.playerId))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  })));
});

// PUT /:id/read — mark a notification as read
router.put("/:id/read", async (req, res) => {
  if (!req.session.playerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [row] = await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.id, id),
        eq(notificationsTable.playerId, req.session.playerId)
      )
    )
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ success: true });
});

export default router;
