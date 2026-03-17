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
    const { kFactor, minMatchesForDisplay, maxChallengesPerWeek, maxChallengesSameOpponentPerWeek, challengeExpiryHours } = req.body as {
      kFactor?: number;
      minMatchesForDisplay?: number;
      maxChallengesPerWeek?: number;
      maxChallengesSameOpponentPerWeek?: number;
      challengeExpiryHours?: number;
    };
    const { eq } = await import("drizzle-orm");
    const updated = await db
      .update(ladderSettingsTable)
      .set({
        ...(kFactor !== undefined && { kFactor }),
        ...(minMatchesForDisplay !== undefined && { minMatchesForDisplay }),
        ...(maxChallengesPerWeek !== undefined && { maxChallengesPerWeek }),
        ...(maxChallengesSameOpponentPerWeek !== undefined && { maxChallengesSameOpponentPerWeek }),
        ...(challengeExpiryHours !== undefined && { challengeExpiryHours }),
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
