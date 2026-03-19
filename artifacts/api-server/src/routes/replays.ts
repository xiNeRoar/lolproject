import { Router } from "express";
import { db } from "@workspace/db";
import { replaySubmissionsTable, vodEntriesTable, matchesTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
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

// GET /replays/queue/next — render machine: next pending job (no auth; machine token TBD)
router.get("/queue/next", async (_req, res) => {
  try {
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
    res.json(formatReplay(row));
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

export default router;
