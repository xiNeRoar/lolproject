import { Router } from "express";
import { db } from "@workspace/db";
import { interestSubmissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(interestSubmissionsTable).orderBy(interestSubmissionsTable.createdAt);
  const data = rows.map((r) => ({
    id: r.id,
    riotId: r.riotId,
    discordUsername: r.discordUsername,
    currentRank: r.currentRank,
    city: r.city,
    preferredFormat: r.preferredFormat,
    availability: r.availability,
    hasTeam: r.hasTeam,
    willingWithoutPrize: r.willingWithoutPrize,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));
  res.json(data);
});

router.post("/", async (req, res) => {
  const { riotId, discordUsername, currentRank, city, preferredFormat, availability, hasTeam, willingWithoutPrize, notes } = req.body;

  if (!riotId || !discordUsername || !currentRank || !city || !preferredFormat || !availability) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [row] = await db
    .insert(interestSubmissionsTable)
    .values({
      riotId,
      discordUsername,
      currentRank,
      city,
      preferredFormat,
      availability,
      hasTeam: Boolean(hasTeam),
      willingWithoutPrize: Boolean(willingWithoutPrize),
      notes: notes || null,
    })
    .returning();

  res.status(201).json({
    id: row!.id,
    riotId: row!.riotId,
    discordUsername: row!.discordUsername,
    currentRank: row!.currentRank,
    city: row!.city,
    preferredFormat: row!.preferredFormat,
    availability: row!.availability,
    hasTeam: row!.hasTeam,
    willingWithoutPrize: row!.willingWithoutPrize,
    notes: row!.notes,
    createdAt: row!.createdAt.toISOString(),
  });
});

router.delete("/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(interestSubmissionsTable).where(eq(interestSubmissionsTable.id, id));
  res.json({ success: true });
});

export default router;
