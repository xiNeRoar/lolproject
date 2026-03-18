import { Router } from "express";
import { db } from "@workspace/db";
import { challengesTable, playersTable, ladderSettingsTable } from "@workspace/db";
import { eq, or, and, gte, count } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { notifyPlayer } from "../lib/notifications";

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
    if (!req.session.playerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { challengedId, scheduledTime } = req.body as { challengedId: number; scheduledTime: string };
    if (!challengedId || !scheduledTime) {
      return res.status(400).json({ error: "challengedId and scheduledTime are required" });
    }
    const challengerId = req.session.playerId;

    // C11: Read challenge expiry from ladderSettings
    const [settings] = await db.select().from(ladderSettingsTable).limit(1);
    const expiryHours = settings?.challengeExpiryHours ?? 48;
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
    const inserted = await db
      .insert(challengesTable)
      .values({
        challengerId,
        challengedId,
        scheduledTime: new Date(scheduledTime),
        expiresAt,
      })
      .returning();
    notifyPlayer(challengedId, "challenge_received", "New Challenge", "You have received a new challenge!").catch(() => {});
    res.status(201).json(formatChallenge(inserted[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to create challenge" });
  }
});

router.put("/:id/accept", async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, Number(req.params.id)));
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    if (challenge.challengedId !== req.session.playerId) {
      return res.status(403).json({ error: "Only the challenged player can accept" });
    }
    const updated = await db
      .update(challengesTable)
      .set({ status: "accepted", updatedAt: new Date() })
      .where(eq(challengesTable.id, challenge.id))
      .returning();
    notifyPlayer(challenge.challengerId, "challenge_accepted", "Challenge Accepted", "Your challenge has been accepted!").catch(() => {});
    res.json(formatChallenge(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to accept challenge" });
  }
});

router.put("/:id/decline", async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const challengeId = Number(req.params.id);
    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, challengeId));
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    if (challenge.challengedId !== req.session.playerId) {
      return res.status(403).json({ error: "Only the challenged player can decline" });
    }

    const challengedId = challenge.challengedId;
    const challengerId = challenge.challengerId;

    // Load decline limits from ladderSettings
    const [settings] = await db.select().from(ladderSettingsTable).limit(1);
    const maxDeclinesPerWeek = settings?.maxDeclinesPerWeek ?? 2;
    const maxDeclinesSameOpponentPerWeek = settings?.maxDeclinesSameOpponentPerWeek ?? 1;

    // Start of current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);

    // Count total declines this week by challenged player
    const [totalDeclines] = await db
      .select({ value: count() })
      .from(challengesTable)
      .where(
        and(
          eq(challengesTable.challengedId, challengedId),
          eq(challengesTable.status, "declined"),
          gte(challengesTable.updatedAt, weekStart)
        )
      );

    if ((totalDeclines?.value ?? 0) >= maxDeclinesPerWeek) {
      return res.status(403).json({ error: "Weekly decline limit reached" });
    }

    // Count declines this week vs same challenger
    const [sameOpponentDeclines] = await db
      .select({ value: count() })
      .from(challengesTable)
      .where(
        and(
          eq(challengesTable.challengedId, challengedId),
          eq(challengesTable.challengerId, challengerId),
          eq(challengesTable.status, "declined"),
          gte(challengesTable.updatedAt, weekStart)
        )
      );

    if ((sameOpponentDeclines?.value ?? 0) >= maxDeclinesSameOpponentPerWeek) {
      return res.status(403).json({ error: "Decline limit vs this opponent reached" });
    }

    const updated = await db
      .update(challengesTable)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(challengesTable.id, challengeId))
      .returning();
    notifyPlayer(challenge.challengerId, "challenge_declined", "Challenge Declined", "Your challenge has been declined.").catch(() => {});
    res.json(formatChallenge(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to decline challenge" });
  }
});

router.put("/:id/game-ready", async (req, res) => {
  try {
    if (!req.session.playerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const [challenge] = await db.select().from(challengesTable).where(eq(challengesTable.id, Number(req.params.id)));
    if (!challenge) return res.status(404).json({ error: "Challenge not found" });
    if (challenge.challengerId !== req.session.playerId && challenge.challengedId !== req.session.playerId) {
      return res.status(403).json({ error: "Only participants can submit game ID" });
    }
    const { gameId } = req.body as { gameId: string };
    const updated = await db
      .update(challengesTable)
      .set({ gameId, updatedAt: new Date() })
      .where(eq(challengesTable.id, challenge.id))
      .returning();
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
