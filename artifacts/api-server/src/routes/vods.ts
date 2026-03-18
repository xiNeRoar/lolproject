import { Router } from "express";
import { db } from "@workspace/db";
import { vodEntriesTable, eventsTable, vodTimestampsTable, playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { getRelatedVods } from "../lib/vodRecommendations";

const router = Router();

function formatVodEntry(
  v: typeof vodEntriesTable.$inferSelect,
  extra: { eventTitle?: string | null; playerRiotId?: string | null } = {}
) {
  return {
    id: v.id,
    eventId: v.eventId,
    eventTitle: extra.eventTitle ?? null,
    title: v.title,
    format: v.format,
    playerNames: v.playerNames,
    roleTag: v.roleTag,
    notes: v.notes,
    videoUrl: v.videoUrl,
    playerId: v.playerId,
    playerRiotId: extra.playerRiotId ?? null,
    champion: v.champion,
    opponentChampion: v.opponentChampion,
    position: v.position,
    patch: v.patch,
    playerEloAtTime: v.playerEloAtTime,
    createdAt: v.createdAt.toISOString(),
    updatedAt: v.updatedAt.toISOString(),
  };
}

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

router.get("/", async (req, res) => {
  const eventId = req.query.eventId ? parseInt(req.query.eventId as string) : null;
  const format = req.query.format as string | undefined;
  const roleTag = req.query.roleTag as string | undefined;
  const search = req.query.search as string | undefined;
  const champion = req.query.champion as string | undefined;
  const opponentChampion = req.query.opponentChampion as string | undefined;
  const position = req.query.position as string | undefined;
  const patch = req.query.patch as string | undefined;
  const eloMin = req.query.eloMin ? parseInt(req.query.eloMin as string) : null;
  const eloMax = req.query.eloMax ? parseInt(req.query.eloMax as string) : null;
  const playerId = req.query.playerId ? parseInt(req.query.playerId as string) : null;

  let rows = await db
    .select({
      id: vodEntriesTable.id,
      eventId: vodEntriesTable.eventId,
      title: vodEntriesTable.title,
      format: vodEntriesTable.format,
      playerNames: vodEntriesTable.playerNames,
      roleTag: vodEntriesTable.roleTag,
      notes: vodEntriesTable.notes,
      videoUrl: vodEntriesTable.videoUrl,
      playerId: vodEntriesTable.playerId,
      champion: vodEntriesTable.champion,
      opponentChampion: vodEntriesTable.opponentChampion,
      position: vodEntriesTable.position,
      patch: vodEntriesTable.patch,
      playerEloAtTime: vodEntriesTable.playerEloAtTime,
      createdAt: vodEntriesTable.createdAt,
      updatedAt: vodEntriesTable.updatedAt,
      eventTitle: eventsTable.title,
      playerRiotId: playersTable.riotId,
    })
    .from(vodEntriesTable)
    .leftJoin(eventsTable, eq(vodEntriesTable.eventId, eventsTable.id))
    .leftJoin(playersTable, eq(vodEntriesTable.playerId, playersTable.id))
    .orderBy(vodEntriesTable.createdAt);

  if (eventId) rows = rows.filter((r) => r.eventId === eventId);
  if (format) rows = rows.filter((r) => r.format === format);
  if (roleTag) rows = rows.filter((r) => r.roleTag === roleTag);
  if (champion) rows = rows.filter((r) => r.champion?.toLowerCase() === champion.toLowerCase());
  if (opponentChampion) rows = rows.filter((r) => r.opponentChampion?.toLowerCase() === opponentChampion.toLowerCase());
  if (position) rows = rows.filter((r) => r.position?.toLowerCase() === position.toLowerCase());
  if (patch) rows = rows.filter((r) => r.patch === patch);
  if (eloMin !== null) rows = rows.filter((r) => r.playerEloAtTime !== null && r.playerEloAtTime >= eloMin);
  if (eloMax !== null) rows = rows.filter((r) => r.playerEloAtTime !== null && r.playerEloAtTime <= eloMax);
  if (playerId) rows = rows.filter((r) => r.playerId === playerId);
  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(s) ||
        (r.playerNames ?? "").toLowerCase().includes(s)
    );
  }

  res.json(
    rows.map((r) => ({
      id: r.id,
      eventId: r.eventId,
      eventTitle: r.eventTitle ?? null,
      title: r.title,
      format: r.format,
      playerNames: r.playerNames,
      roleTag: r.roleTag,
      notes: r.notes,
      videoUrl: r.videoUrl,
      playerId: r.playerId,
      playerRiotId: r.playerRiotId ?? null,
      champion: r.champion,
      opponentChampion: r.opponentChampion,
      position: r.position,
      patch: r.patch,
      playerEloAtTime: r.playerEloAtTime,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    }))
  );
});

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [vod] = await db
    .select()
    .from(vodEntriesTable)
    .where(eq(vodEntriesTable.id, id));

  if (!vod) { res.status(404).json({ error: "VOD not found" }); return; }

  const event = vod.eventId
    ? (await db.select().from(eventsTable).where(eq(eventsTable.id, vod.eventId)))[0]
    : null;

  const player = vod.playerId
    ? (await db.select().from(playersTable).where(eq(playersTable.id, vod.playerId)))[0]
    : null;

  const timestamps = await db
    .select()
    .from(vodTimestampsTable)
    .where(eq(vodTimestampsTable.vodId, id))
    .orderBy(vodTimestampsTable.seconds);

  const relatedRaw = await getRelatedVods({
    vodId: id,
    champion: vod.champion,
    opponentChampion: vod.opponentChampion,
    position: vod.position,
    playerEloAtTime: vod.playerEloAtTime,
  });

  res.json({
    ...formatVodEntry(vod, {
      eventTitle: event?.title ?? null,
      playerRiotId: player?.riotId ?? null,
    }),
    timestamps: timestamps.map(formatTimestamp),
    relatedVods: relatedRaw.map((v) => formatVodEntry(v)),
  });
});

router.post("/", requireAdmin, async (req, res) => {
  const {
    eventId, title, format, playerNames, roleTag, notes, videoUrl,
    playerId, champion, opponentChampion, position, patch, playerEloAtTime,
  } = req.body as {
    eventId?: number;
    title?: string;
    format?: string;
    playerNames?: string;
    roleTag?: string;
    notes?: string;
    videoUrl?: string;
    playerId?: number;
    champion?: string;
    opponentChampion?: string;
    position?: string;
    patch?: string;
    playerEloAtTime?: number;
  };

  if (!title || !videoUrl) {
    res.status(400).json({ error: "title and videoUrl are required" });
    return;
  }

  const [row] = await db
    .insert(vodEntriesTable)
    .values({
      eventId: eventId ? Number(eventId) : null,
      title,
      format: format || null,
      playerNames: playerNames || null,
      roleTag: roleTag || null,
      notes: notes || null,
      videoUrl,
      playerId: playerId ? Number(playerId) : null,
      champion: champion || null,
      opponentChampion: opponentChampion || null,
      position: position || null,
      patch: patch || null,
      playerEloAtTime: playerEloAtTime ? Number(playerEloAtTime) : null,
    })
    .returning();

  const event = eventId
    ? (await db.select().from(eventsTable).where(eq(eventsTable.id, Number(eventId))))[0]
    : null;

  const player = row!.playerId
    ? (await db.select().from(playersTable).where(eq(playersTable.id, row!.playerId)))[0]
    : null;

  res.status(201).json(
    formatVodEntry(row!, {
      eventTitle: event?.title ?? null,
      playerRiotId: player?.riotId ?? null,
    })
  );
});

router.put("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const {
    eventId, title, format, playerNames, roleTag, notes, videoUrl,
    playerId, champion, opponentChampion, position, patch, playerEloAtTime,
  } = req.body as {
    eventId?: number | null;
    title?: string;
    format?: string | null;
    playerNames?: string | null;
    roleTag?: string | null;
    notes?: string | null;
    videoUrl?: string;
    playerId?: number | null;
    champion?: string | null;
    opponentChampion?: string | null;
    position?: string | null;
    patch?: string | null;
    playerEloAtTime?: number | null;
  };

  const [row] = await db
    .update(vodEntriesTable)
    .set({
      eventId: eventId !== undefined ? (eventId ? Number(eventId) : null) : undefined,
      title,
      format: format !== undefined ? (format || null) : undefined,
      playerNames: playerNames !== undefined ? (playerNames || null) : undefined,
      roleTag: roleTag !== undefined ? (roleTag || null) : undefined,
      notes: notes !== undefined ? (notes || null) : undefined,
      videoUrl: videoUrl || undefined,
      playerId: playerId !== undefined ? (playerId ? Number(playerId) : null) : undefined,
      champion: champion !== undefined ? (champion || null) : undefined,
      opponentChampion: opponentChampion !== undefined ? (opponentChampion || null) : undefined,
      position: position !== undefined ? (position || null) : undefined,
      patch: patch !== undefined ? (patch || null) : undefined,
      playerEloAtTime: playerEloAtTime !== undefined ? (playerEloAtTime ? Number(playerEloAtTime) : null) : undefined,
      updatedAt: new Date(),
    })
    .where(eq(vodEntriesTable.id, id))
    .returning();

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  const event = row.eventId
    ? (await db.select().from(eventsTable).where(eq(eventsTable.id, row.eventId)))[0]
    : null;

  const player = row.playerId
    ? (await db.select().from(playersTable).where(eq(playersTable.id, row.playerId)))[0]
    : null;

  res.json(
    formatVodEntry(row, {
      eventTitle: event?.title ?? null,
      playerRiotId: player?.riotId ?? null,
    })
  );
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(vodEntriesTable).where(eq(vodEntriesTable.id, id));
  res.json({ success: true });
});

export default router;
