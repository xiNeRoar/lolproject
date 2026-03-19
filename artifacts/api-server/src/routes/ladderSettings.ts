import { Router } from "express";
import { db } from "@workspace/db";
import { ladderSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

function formatSettings(s: typeof ladderSettingsTable.$inferSelect) {
  return {
    id: s.id,
    kFactor: s.kFactor,
    minMatchesForDisplay: s.minMatchesForDisplay,
    maxChallengesPerWeek: s.maxChallengesPerWeek,
    maxChallengesSameOpponentPerWeek: s.maxChallengesSameOpponentPerWeek,
    challengeExpiryHours: s.challengeExpiryHours,
    maxDeclinesPerWeek: s.maxDeclinesPerWeek,
    maxDeclinesSameOpponentPerWeek: s.maxDeclinesSameOpponentPerWeek,
    noShowExpiryDays: s.noShowExpiryDays,
    playoffMinPlayers: s.playoffMinPlayers,
    playoffSize: s.playoffSize,
    playoffFormat: s.playoffFormat,
    defaultMatchFormat: s.defaultMatchFormat,
    updatedAt: s.updatedAt.toISOString(),
  };
}

async function getOrCreateSettings() {
  const rows = await db.select().from(ladderSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const inserted = await db.insert(ladderSettingsTable).values({}).returning();
  return inserted[0];
}

router.get("/", async (_req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(formatSettings(settings));
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch ladder settings" });
  }
});

router.put("/", requireAdmin, async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const {
      kFactor, minMatchesForDisplay, maxChallengesPerWeek, maxChallengesSameOpponentPerWeek,
      challengeExpiryHours, maxDeclinesPerWeek, maxDeclinesSameOpponentPerWeek,
      noShowExpiryDays, playoffMinPlayers, playoffSize, playoffFormat, defaultMatchFormat,
    } = req.body as {
      kFactor?: number;
      minMatchesForDisplay?: number;
      maxChallengesPerWeek?: number;
      maxChallengesSameOpponentPerWeek?: number;
      challengeExpiryHours?: number;
      maxDeclinesPerWeek?: number;
      maxDeclinesSameOpponentPerWeek?: number;
      noShowExpiryDays?: number;
      playoffMinPlayers?: number;
      playoffSize?: number;
      playoffFormat?: string;
      defaultMatchFormat?: string;
    };
    const VALID_FORMATS = ["BO1", "BO3", "BO5"];
    if (defaultMatchFormat !== undefined && !VALID_FORMATS.includes(defaultMatchFormat)) {
      res.status(400).json({ error: `Invalid defaultMatchFormat. Must be one of: ${VALID_FORMATS.join(", ")}` });
      return;
    }

    const { eq } = await import("drizzle-orm");
    const updated = await db
      .update(ladderSettingsTable)
      .set({
        ...(kFactor !== undefined && { kFactor }),
        ...(minMatchesForDisplay !== undefined && { minMatchesForDisplay }),
        ...(maxChallengesPerWeek !== undefined && { maxChallengesPerWeek }),
        ...(maxChallengesSameOpponentPerWeek !== undefined && { maxChallengesSameOpponentPerWeek }),
        ...(challengeExpiryHours !== undefined && { challengeExpiryHours }),
        ...(maxDeclinesPerWeek !== undefined && { maxDeclinesPerWeek }),
        ...(maxDeclinesSameOpponentPerWeek !== undefined && { maxDeclinesSameOpponentPerWeek }),
        ...(noShowExpiryDays !== undefined && { noShowExpiryDays }),
        ...(playoffMinPlayers !== undefined && { playoffMinPlayers }),
        ...(playoffSize !== undefined && { playoffSize }),
        ...(playoffFormat !== undefined && { playoffFormat }),
        ...(defaultMatchFormat !== undefined && { defaultMatchFormat }),
        updatedAt: new Date(),
      })
      .where(eq(ladderSettingsTable.id, settings.id))
      .returning();
    res.json(formatSettings(updated[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to update ladder settings" });
  }
});

export default router;
