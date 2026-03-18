import { Router } from "express";
import { db } from "@workspace/db";
import { replaySubmissionsTable, vodEntriesTable, matchesTable, playersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function formatReplay(r: typeof replaySubmissionsTable.$inferSelect) {
  return {
    id: r.id,
    matchId: r.matchId,
    playerId: r.playerId,
    roflFilePath: r.roflFilePath,
    fileSizeBytes: r.fileSizeBytes,
    status: r.status,
    renderMode: r.renderMode,
    youtubeUrlA: r.youtubeUrlA,
    youtubeUrlB: r.youtubeUrlB,
    errorMessage: r.errorMessage,
    submittedAt: r.submittedAt.toISOString(),
    processedAt: r.processedAt?.toISOString() ?? null,
  };
}

// POST / — submit a replay
router.post("/", async (req, res) => {
  try {
    const { matchId, playerId, roflFilePath, fileSizeBytes, renderMode } = req.body as {
      matchId: number;
      playerId?: number | null;
      roflFilePath?: string | null;
      fileSizeBytes?: number | null;
      renderMode: string;
    };

    if (!matchId || !renderMode) {
      res.status(400).json({ error: "matchId and renderMode are required" });
      return;
    }

    const [row] = await db
      .insert(replaySubmissionsTable)
      .values({
        matchId,
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

// GET /queue — admin: list all queue entries
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

// GET /queue/next — render machine: get next pending job
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

// PATCH /:id — render machine: update status
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { status, youtubeUrlA, youtubeUrlB, errorMessage } = req.body as {
      status: string;
      youtubeUrlA?: string | null;
      youtubeUrlB?: string | null;
      errorMessage?: string | null;
    };

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

    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    // C18: Auto-create VOD entries when render is complete
    if (status === "done" && row.matchId && (youtubeUrlA || youtubeUrlB)) {
      const [match] = await db.select().from(matchesTable).where(eq(matchesTable.id, row.matchId));
      if (match) {
        const playerAName = match.sideAName;
        const playerBName = match.sideBName;

        if (youtubeUrlA) {
          await db.insert(vodEntriesTable).values({
            eventId: match.eventId,
            matchId: match.id,
            title: `${playerAName} vs ${playerBName} — POV A`,
            format: match.format || "1v1",
            playerNames: `${playerAName}, ${playerBName}`,
            videoUrl: youtubeUrlA,
            playerId: match.playerAId,
          });
        }
        if (youtubeUrlB) {
          await db.insert(vodEntriesTable).values({
            eventId: match.eventId,
            matchId: match.id,
            title: `${playerBName} vs ${playerAName} — POV B`,
            format: match.format || "1v1",
            playerNames: `${playerAName}, ${playerBName}`,
            videoUrl: youtubeUrlB,
            playerId: match.playerBId,
          });
        }
      }
    }

    res.json(formatReplay(row));
  } catch (err) {
    res.status(500).json({ error: "Failed to update replay" });
  }
});

export default router;
