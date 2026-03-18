import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, matchesTable, vodEntriesTable } from "@workspace/db";
import { eq, desc, or } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function formatPlayer(p: typeof playersTable.$inferSelect) {
  return {
    id: p.id,
    riotId: p.riotId,
    discordUsername: p.discordUsername,
    currentElo: p.currentElo,
    peakElo: p.peakElo,
    wins: p.wins,
    losses: p.losses,
    isActive: p.isActive,
    email: p.email ?? null,
    notificationPreference: p.notificationPreference,
    discordId: p.discordId ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

function formatMatch(m: typeof matchesTable.$inferSelect) {
  return {
    id: m.id,
    eventId: m.eventId,
    eventTitle: null as string | null,
    matchTitle: m.matchTitle,
    sideAName: m.sideAName,
    sideBName: m.sideBName,
    winnerName: m.winnerName,
    score: m.score,
    format: m.format,
    vodUrl: m.vodUrl,
    playerAId: m.playerAId,
    playerBId: m.playerBId,
    playerAEloBefore: m.playerAEloBefore,
    playerAEloAfter: m.playerAEloAfter,
    playerBEloBefore: m.playerBEloBefore,
    playerBEloAfter: m.playerBEloAfter,
    seasonId: m.seasonId,
    isPlayoff: m.isPlayoff ?? false,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

function formatVod(v: typeof vodEntriesTable.$inferSelect) {
  return {
    id: v.id,
    eventId: v.eventId,
    eventTitle: null as string | null,
    title: v.title,
    format: v.format,
    playerNames: v.playerNames,
    roleTag: v.roleTag,
    notes: v.notes,
    videoUrl: v.videoUrl,
    playerId: v.playerId,
    playerRiotId: null as string | null,
    champion: v.champion,
    opponentChampion: v.opponentChampion,
    position: v.position,
    patch: v.patch,
    playerEloAtTime: v.playerEloAtTime,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

// GET / — admin: list all players ordered by currentElo desc
router.get("/", requireAdmin, async (_req, res) => {
  const rows = await db
    .select()
    .from(playersTable)
    .orderBy(desc(playersTable.currentElo));
  res.json(rows.map(formatPlayer));
});

// POST / — admin: create player, reject duplicate riotId with 409
router.post("/", requireAdmin, async (req, res) => {
  const { riotId, discordUsername, currentElo, isActive, email, notificationPreference } = req.body as {
    riotId?: string;
    discordUsername?: string;
    currentElo?: number;
    isActive?: boolean;
    email?: string;
    notificationPreference?: string;
  };

  if (!riotId || !discordUsername) {
    res.status(400).json({ error: "riotId and discordUsername are required" });
    return;
  }

  // Reject duplicate riotId — each player must have a unique Riot ID
  const [existing] = await db.select().from(playersTable).where(eq(playersTable.riotId, riotId));
  if (existing) {
    res.status(409).json({ error: "A player with this Riot ID already exists" });
    return;
  }

  const startingElo = typeof currentElo === "number" ? currentElo : 1000;

  const [row] = await db
    .insert(playersTable)
    .values({
      riotId,
      discordUsername,
      currentElo: startingElo,
      peakElo: startingElo,
      wins: 0,
      losses: 0,
      isActive: isActive !== false,
      email: email || null,
      notificationPreference: notificationPreference || "web",
    })
    .returning();

  res.status(201).json(formatPlayer(row!));
});

// GET /:riotId — public: fetch player profile by Riot ID, include recent matches + VODs
router.get("/:riotId", async (req, res) => {
  const riotId = req.params.riotId as string;

  const [player] = await db
    .select()
    .from(playersTable)
    .where(eq(playersTable.riotId, riotId));

  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  // Fetch all matches involving this player, combine and take the 10 most recent
  const matchesAsA = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.playerAId, player.id))
    .orderBy(desc(matchesTable.createdAt))
    .limit(10);

  const matchesAsB = await db
    .select()
    .from(matchesTable)
    .where(eq(matchesTable.playerBId, player.id))
    .orderBy(desc(matchesTable.createdAt))
    .limit(10);

  const recentMatches = [...matchesAsA, ...matchesAsB]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  const vods = await db
    .select()
    .from(vodEntriesTable)
    .where(eq(vodEntriesTable.playerId, player.id))
    .orderBy(desc(vodEntriesTable.createdAt))
    .limit(20);

  res.json({
    ...formatPlayer(player),
    recentMatches: recentMatches.map(formatMatch),
    vods: vods.map(formatVod),
  });
});

// PUT /:id/edit — admin: update player
router.put("/:id/edit", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { riotId, discordUsername, currentElo, peakElo, wins, losses, isActive, email, notificationPreference } = req.body as {
    riotId?: string;
    discordUsername?: string;
    currentElo?: number;
    peakElo?: number;
    wins?: number;
    losses?: number;
    isActive?: boolean;
    email?: string;
    notificationPreference?: string;
  };

  const updates: Partial<typeof playersTable.$inferInsert> = { updatedAt: new Date() };
  if (riotId !== undefined) updates.riotId = riotId;
  if (discordUsername !== undefined) updates.discordUsername = discordUsername;
  if (typeof currentElo === "number") updates.currentElo = currentElo;
  if (typeof peakElo === "number") updates.peakElo = peakElo;
  if (typeof wins === "number") updates.wins = wins;
  if (typeof losses === "number") updates.losses = losses;
  if (isActive !== undefined) updates.isActive = isActive;
  if (email !== undefined) updates.email = email || null;
  if (notificationPreference !== undefined) updates.notificationPreference = notificationPreference;

  const [row] = await db
    .update(playersTable)
    .set(updates)
    .where(eq(playersTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Player not found" }); return; }
  res.json(formatPlayer(row));
});

// DELETE /:id/delete — admin: delete player
router.delete("/:id/delete", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(playersTable).where(eq(playersTable.id, id));
  res.json({ success: true });
});

export default router;
