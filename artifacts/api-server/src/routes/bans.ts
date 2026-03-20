import { Router } from "express";
import { db } from "@workspace/db";
import { playerBansTable } from "@workspace/db";
import { eq, and, desc, or, lte } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

function formatBan(b: typeof playerBansTable.$inferSelect) {
  return {
    id: b.id,
    playerId: b.playerId ?? null,
    teamId: b.teamId ?? null,
    reason: b.reason,
    bannedBy: b.bannedBy,
    banType: b.banType,
    expiresAt: b.expiresAt?.toISOString() ?? null,
    isActive: b.isActive,
    createdAt: b.createdAt.toISOString(),
  };
}

// GET /bans — list all active bans
router.get("/", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(playerBansTable)
      .where(eq(playerBansTable.isActive, true))
      .orderBy(desc(playerBansTable.createdAt));
    res.json(rows.map(formatBan));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch bans" });
  }
});

// POST /bans — create a ban
router.post("/", requireAdmin, async (req, res) => {
  try {
    const { playerId, teamId, reason, banType, expiresAt } = req.body as {
      playerId?: number | null;
      teamId?: number | null;
      reason?: string;
      banType?: string;
      expiresAt?: string | null;
    };

    if (!reason) {
      res.status(400).json({ error: "reason is required" });
      return;
    }
    if (!playerId && !teamId) {
      res.status(400).json({ error: "Either playerId or teamId is required" });
      return;
    }

    const [row] = await db
      .insert(playerBansTable)
      .values({
        playerId: playerId ?? null,
        teamId: teamId ?? null,
        reason,
        bannedBy: req.session.adminId!,
        banType: banType || "permanent",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })
      .returning();

    const target = playerId ? `player ${playerId}` : `team ${teamId}`;
    logAdminAction(req.session.adminId!, "ban", playerId ? "player" : "team", (playerId || teamId)!, `Banned ${target}: ${reason}`);

    res.status(201).json(formatBan(row!));
  } catch (err) {
    res.status(500).json({ error: "Failed to create ban" });
  }
});

// PUT /bans/:id/lift — unban
router.put("/:id/lift", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [row] = await db
      .update(playerBansTable)
      .set({ isActive: false })
      .where(eq(playerBansTable.id, id))
      .returning();

    if (!row) { res.status(404).json({ error: "Ban not found" }); return; }

    const target = row.playerId ? `player ${row.playerId}` : `team ${row.teamId}`;
    logAdminAction(req.session.adminId!, "unban", row.playerId ? "player" : "team", (row.playerId || row.teamId)!, `Unbanned ${target}`);

    res.json(formatBan(row));
  } catch (err) {
    res.status(500).json({ error: "Failed to lift ban" });
  }
});

// Utility: check if a player or team is currently banned
export async function isEntityBanned(playerId?: number | null, teamId?: number | null): Promise<{ banned: boolean; reason?: string }> {
  const conditions = [];
  if (playerId) conditions.push(eq(playerBansTable.playerId, playerId));
  if (teamId) conditions.push(eq(playerBansTable.teamId, teamId));
  if (conditions.length === 0) return { banned: false };

  const now = new Date();
  const rows = await db
    .select()
    .from(playerBansTable)
    .where(
      and(
        or(...conditions),
        eq(playerBansTable.isActive, true)
      )
    );

  // Filter out expired temporary bans
  const activeBan = rows.find((b) => {
    if (b.banType === "temporary" && b.expiresAt && b.expiresAt < now) {
      // Auto-expire: mark inactive
      db.update(playerBansTable).set({ isActive: false }).where(eq(playerBansTable.id, b.id)).catch(() => {});
      return false;
    }
    return true;
  });

  return activeBan ? { banned: true, reason: activeBan.reason } : { banned: false };
}

export default router;
