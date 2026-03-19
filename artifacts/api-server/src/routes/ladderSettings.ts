import { Router } from "express";
import { db } from "@workspace/db";
import { ladderSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

// ── Formatter ────────────────────────────────────────────────

function formatSettings(s: typeof ladderSettingsTable.$inferSelect) {
  return {
    id: s.id,
    kFactor: s.kFactor,
    minMatchesForDisplay: s.minMatchesForDisplay,
    playoffSize: s.playoffSize,
    playoffFormat: s.playoffFormat,
    defaultMatchFormat: s.defaultMatchFormat,
    updatedAt: s.updatedAt.toISOString(),
  };
}

// ── Helpers ──────────────────────────────────────────────────

async function getOrCreateSettings() {
  const rows = await db.select().from(ladderSettingsTable).limit(1);
  if (rows.length > 0) return rows[0]!;
  const [inserted] = await db.insert(ladderSettingsTable).values({}).returning();
  return inserted!;
}

// ── Routes ───────────────────────────────────────────────────

// GET /ladder-settings
router.get("/", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(formatSettings(settings));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ladder settings" });
  }
});

// PUT /ladder-settings — admin only
router.put("/", requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();

    const { kFactor, minMatchesForDisplay, playoffSize, playoffFormat, defaultMatchFormat } =
      req.body as {
        kFactor?: number;
        minMatchesForDisplay?: number;
        playoffSize?: number;
        playoffFormat?: string;
        defaultMatchFormat?: string;
      };

    const VALID_FORMATS = ["BO1", "BO3", "BO5"];
    if (defaultMatchFormat !== undefined && !VALID_FORMATS.includes(defaultMatchFormat)) {
      res.status(400).json({
        error: `Invalid defaultMatchFormat. Must be one of: ${VALID_FORMATS.join(", ")}`,
      });
      return;
    }

    const VALID_PLAYOFF_FORMATS = ["single_elimination", "double_elimination"];
    if (playoffFormat !== undefined && !VALID_PLAYOFF_FORMATS.includes(playoffFormat)) {
      res.status(400).json({
        error: `Invalid playoffFormat. Must be one of: ${VALID_PLAYOFF_FORMATS.join(", ")}`,
      });
      return;
    }

    const updates: Partial<typeof ladderSettingsTable.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (kFactor !== undefined) updates.kFactor = kFactor;
    if (minMatchesForDisplay !== undefined) updates.minMatchesForDisplay = minMatchesForDisplay;
    if (playoffSize !== undefined) updates.playoffSize = playoffSize;
    if (playoffFormat !== undefined) updates.playoffFormat = playoffFormat;
    if (defaultMatchFormat !== undefined) updates.defaultMatchFormat = defaultMatchFormat;

    const [updated] = await db
      .update(ladderSettingsTable)
      .set(updates)
      .where(eq(ladderSettingsTable.id, settings.id))
      .returning();

    res.json(formatSettings(updated!));
  } catch (err) {
    res.status(500).json({ error: "Failed to update ladder settings" });
  }
});

export default router;
