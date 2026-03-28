import { Router } from "express";
import { db } from "@workspace/db";
import { replaySubmissionsTable, vodEntriesTable, matchesTable } from "@workspace/db";
import { eq, asc, and, desc, count, lte, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// ── Formatter ────────────────────────────────────────────────

function formatReplay(r: typeof replaySubmissionsTable.$inferSelect) {
  return {
    id: r.id,
    matchId: r.matchId ?? null,
    playerId: r.playerId ?? null,
    roflFilePath: r.roflFilePath ?? null,
    fileSizeBytes: r.fileSizeBytes ?? null,
    status: r.status,
    renderMode: r.renderMode,
    youtubeUrlA: r.youtubeUrlA ?? null,
    youtubeUrlB: r.youtubeUrlB ?? null,
    errorMessage: r.errorMessage ?? null,
    submittedAt: r.submittedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  };
}

// ── Routes ───────────────────────────────────────────────────

// POST /replays — submit a replay reference (bot or dashboard)
router.post("/", async (req, res) => {
  try {
    const { matchId, playerId, roflFilePath, fileSizeBytes, renderMode } = req.body as {
      matchId?: number;
      playerId?: number | null;
      roflFilePath?: string | null;
      fileSizeBytes?: number | null;
      renderMode?: string;
    };

    if (!matchId || !renderMode) {
      res.status(400).json({ error: "matchId and renderMode are required" });
      return;
    }

    const [row] = await db
      .insert(replaySubmissionsTable)
      .values({
        matchId: Number(matchId),
        playerId: playerId ?? null,
        roflFilePath: roflFilePath ?? null,
        fileSizeBytes: fileSizeBytes ?? null,
        renderMode,
      })
      .returning();

    res.status(201).json(formatReplay(row!));
  } catch (err) {
    res.status(500).json({ error: "Failed to submit replay" });
  }
});

// GET /replays/status — check POV request status for a match+player (public)
router.get("/status", async (req, res) => {
  try {
    const matchId = parseInt(req.query.matchId as string);
    const playerId = parseInt(req.query.playerId as string);

    if (isNaN(matchId) || isNaN(playerId)) {
      res.status(400).json({ error: "matchId and playerId are required" });
      return;
    }

    const [row] = await db
      .select()
      .from(replaySubmissionsTable)
      .where(
        and(
          eq(replaySubmissionsTable.matchId, matchId),
          eq(replaySubmissionsTable.playerId, playerId),
          eq(replaySubmissionsTable.renderMode, "pov"),
        )
      )
      .orderBy(desc(replaySubmissionsTable.submittedAt))
      .limit(1);

    if (!row) {
      res.json({ exists: false });
      return;
    }

    res.json({
      exists: true,
      status: row.status,
      submittedAt: row.submittedAt.toISOString(),
      processedAt: row.processedAt?.toISOString() ?? null,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to check replay status" });
  }
});

// GET /replays/queue — admin: all queue entries ordered by submission time
router.get("/queue", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(replaySubmissionsTable)
      .orderBy(asc(replaySubmissionsTable.submittedAt));
    res.json(rows.map(formatReplay));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch replay queue" });
  }
});

// GET /replays/queue/next — render machine: claim next pending job (sets status=processing)
router.get("/queue/next", async (_req, res) => {
  try {
    // Reset stale processing jobs (>2 hours — render machine likely crashed)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const stale = await db
      .update(replaySubmissionsTable)
      .set({ status: "pending" })
      .where(and(eq(replaySubmissionsTable.status, "processing"), lte(replaySubmissionsTable.submittedAt, twoHoursAgo)))
      .returning({ id: replaySubmissionsTable.id });
    if (stale.length > 0)
      console.log(`[replays] Reset ${stale.length} stale job(s) to pending`);

    const [row] = await db
      .select()
      .from(replaySubmissionsTable)
      .where(eq(replaySubmissionsTable.status, "pending"))
      .orderBy(asc(replaySubmissionsTable.submittedAt))
      .limit(1);

    if (!row) {
      res.status(204).send();
      return;
    }

    // Claim the job: mark as processing
    const [claimed] = await db
      .update(replaySubmissionsTable)
      .set({ status: "processing" })
      .where(eq(replaySubmissionsTable.id, row.id))
      .returning();

    res.json(formatReplay(claimed!));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch next job" });
  }
});

// PATCH /replays/:id — render machine: update status and/or youtube URLs
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { status, youtubeUrlA, youtubeUrlB, errorMessage } = req.body as {
      status?: string;
      youtubeUrlA?: string | null;
      youtubeUrlB?: string | null;
      errorMessage?: string | null;
    };

    if (!status) {
      res.status(400).json({ error: "status is required" });
      return;
    }

    const updates: Partial<typeof replaySubmissionsTable.$inferInsert> = { status };
    if (youtubeUrlA !== undefined) updates.youtubeUrlA = youtubeUrlA;
    if (youtubeUrlB !== undefined) updates.youtubeUrlB = youtubeUrlB;
    if (errorMessage !== undefined) updates.errorMessage = errorMessage;
    if (status === "done" || status === "failed") updates.processedAt = new Date();

    const [row] = await db
      .update(replaySubmissionsTable)
      .set(updates)
      .where(eq(replaySubmissionsTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Replay not found" });
      return;
    }

    // Auto-create VOD entries when render completes with YouTube URLs
    // 5v5 model: create 2 team-perspective VODs (no per-player POV at this stage)
    if (status === "done" && row.matchId && (youtubeUrlA || youtubeUrlB)) {
      const [match] = await db
        .select()
        .from(matchesTable)
        .where(eq(matchesTable.id, row.matchId));

      if (match) {
        const vods: typeof vodEntriesTable.$inferInsert[] = [];

        if (youtubeUrlA) {
          vods.push({
            eventId: match.eventId ?? null,
            matchId: match.id,
            title: `${match.sideAName} vs ${match.sideBName} — Spectator Cam`,
            format: match.format ?? null,
            playerNames: `${match.sideAName}, ${match.sideBName}`,
            videoUrl: youtubeUrlA,
            playerId: null, // 5v5: not POV-specific
          });
        }

        if (youtubeUrlB) {
          // youtubeUrlB reserved for future per-player POV requests
          vods.push({
            eventId: match.eventId ?? null,
            matchId: match.id,
            title: `${match.sideBName} vs ${match.sideAName} — POV`,
            format: match.format ?? null,
            playerNames: `${match.sideAName}, ${match.sideBName}`,
            videoUrl: youtubeUrlB,
            playerId: null,
          });
        }

        if (vods.length > 0) {
          await db.insert(vodEntriesTable).values(vods);
        }
      }
    }

    res.json(formatReplay(row));
  } catch (err) {
    res.status(500).json({ error: "Failed to update replay" });
  }
});

// GET /replays/queue/stats — render pipeline monitoring
router.get("/queue/stats", requireAdmin, async (_req, res) => {
  try {
    const [pending] = await db.select({ value: count() }).from(replaySubmissionsTable).where(eq(replaySubmissionsTable.status, "pending"));
    const [processing] = await db.select({ value: count() }).from(replaySubmissionsTable).where(eq(replaySubmissionsTable.status, "processing"));

    // Failed in last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [failed] = await db.select({ value: count() }).from(replaySubmissionsTable).where(
      and(eq(replaySubmissionsTable.status, "failed"), lte(replaySubmissionsTable.submittedAt, oneDayAgo))
    );

    // Oldest pending job age
    const [oldest] = await db.select({ submittedAt: replaySubmissionsTable.submittedAt })
      .from(replaySubmissionsTable)
      .where(eq(replaySubmissionsTable.status, "pending"))
      .orderBy(asc(replaySubmissionsTable.submittedAt))
      .limit(1);

    let oldestPendingAge: string | null = null;
    if (oldest) {
      const ageMs = Date.now() - oldest.submittedAt.getTime();
      const hours = Math.floor(ageMs / 3600000);
      const mins = Math.floor((ageMs % 3600000) / 60000);
      oldestPendingAge = `${hours}h ${mins}m`;
    }

    // Auto-reset stale processing jobs (>2 hours)
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const staleReset = await db.update(replaySubmissionsTable)
      .set({ status: "pending" })
      .where(and(eq(replaySubmissionsTable.status, "processing"), lte(replaySubmissionsTable.submittedAt, twoHoursAgo)))
      .returning();

    if (staleReset.length > 0) {
      console.log(`[replays] Reset ${staleReset.length} stale processing job(s) to pending`);
    }

    res.json({
      pending: Number(pending?.value ?? 0),
      processing: Number(processing?.value ?? 0),
      failedLast24h: Number(failed?.value ?? 0),
      oldestPendingAge,
      staleJobsReset: staleReset.length,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch queue stats" });
  }
});

export default router;
