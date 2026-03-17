import { Router } from "express";
import { db } from "@workspace/db";
import { challengesTable, playersTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function formatChallenge(
  c: typeof challengesTable.$inferSelect,
  challengerRiotId?: string | null,
  challengedRiotId?: string | null
) {
  return {
    id: c.id,
    challengerId: c.challengerId,
    challengedId: c.challengedId,
    challengerRiotId: challengerRiotId ?? null,
    challengedRiotId: challengedRiotId ?? null,
    status: c.status,
    scheduledTime: c.scheduledTime?.toISOString() ?? null,
    seasonId: c.seasonId,
    matchId: c.matchId,
    gameId: c.gameId,
    expiresAt: c.expiresAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select({
        challenge: challengesTable,
        challenger: { riotId: playersTable.riotId },
      })
      .from(challengesTable)
      .leftJoin(playersTable, eq(challengesTable.challengerId, playersTable.id))
      .orderBy(challengesTable.createdAt);

    const challengedIds = [...new Set(rows.map((r) => r.challenge.challengedId))];
    const challengedPlayers = challengedIds.length > 0
      ? await db.select({ id: playersTable.id, riotId: playersTable.riotId })
          .from(playersTable)
          .where(or(...challengedIds.map((id) => eq(playersTable.id, id))))
      : [];
    const challengedMap = Object.fromEntries(challengedPlayers.map((p) => [p.id, p.riotId]));

    res.json(rows.map((r) =>
      formatChallenge(r.challenge, r.challenger?.riotId ?? null, challengedMap[r.challenge.challengedId] ?? null)
    ));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch challenges" });
  }
});

router.get("/player/:playerId", async (req, res) => {
  try {
    const playerId = Number(req.params.playerId);
    const rows = await db
      .select()
      .from(challengesTable)
      .where(
        or(
          eq(challengesTable.challengerId, playerId),
          eq(challengesTable.challengedId, playerId)
        )
      )
      .orderBy(challengesTable.createdAt);

    const filtered = rows.filter((r) => r.status === "pending" || r.status === "accepted");

    const playerIds = [...new Set([
      ...filtered.map((r) => r.challengerId),
      ...filtered.map((r) => r.challengedId),
    ])];
    const players = playerIds.length > 0
      ? await db.select({ id: playersTable.id, riotId: playersTable.riotId })
          .from(playersTable)
          .where(or(...playerIds.map((id) => eq(playersTable.id, id))))
      : [];
    const playerMap = Object.fromEntries(players.map((p) => [p.id, p.riotId]));

    res.json(filtered.map((c) =>
      formatChallenge(c, playerMap[c.challengerId] ?? null, playerMap[c.challengedId] ?? null)
    ));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch player challenges" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { challengedId, scheduledTime } = req.body as { challengedId: number; scheduledTime: string };
    if (!challengedId || !scheduledTime) {
      return res.status(400).json({ error: "challengedId and scheduledTime are required" });
    }
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const inserted = await db
      .insert(challengesTable)
      .values({
        challengerId: challengedId,
        challengedId,
        scheduledTime: new Date(scheduledTime),
        expiresAt,
      })
      .returning();
    res.status(201).json(formatChallenge(inserted[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

router.put("/:id/accept", async (req, res) => {
  try {
    const updated = await db
      .update(challengesTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(challengesTable.id, Number(req.params.id)))
      .returning();
    if (!updated.length) return res.status(404).json({ error: "Challenge not found" });
    res.json(formatChallenge(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to accept challenge" });
  }
});

router.put("/:id/decline", async (req, res) => {
  try {
    const updated = await db
      .update(challengesTable)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(challengesTable.id, Number(req.params.id)))
      .returning();
    if (!updated.length) return res.status(404).json({ error: "Challenge not found" });
    res.json(formatChallenge(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to decline challenge" });
  }
});

router.put("/:id/game-ready", async (req, res) => {
  try {
    const { gameId } = req.body as { gameId: string };
    const updated = await db
      .update(challengesTable)
      .set({ gameId, updatedAt: new Date() })
      .where(eq(challengesTable.id, Number(req.params.id)))
      .returning();
    if (!updated.length) return res.status(404).json({ error: "Challenge not found" });
    res.json(formatChallenge(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to update game ID" });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await db.delete(challengesTable).where(eq(challengesTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete challenge" });
  }
});

export default router;
