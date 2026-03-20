import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { botHeartbeatsTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// GET /bot-status — check if the Discord bot is online (public)
router.get("/bot-status", async (_req, res) => {
  try {
    const [latest] = await db
      .select()
      .from(botHeartbeatsTable)
      .orderBy(desc(botHeartbeatsTable.timestamp))
      .limit(1);

    if (!latest) {
      res.json({ online: false, lastSeen: null });
      return;
    }

    const tenMinutesMs = 10 * 60 * 1000;
    const online = Date.now() - latest.timestamp.getTime() < tenMinutesMs;

    res.json({ online, lastSeen: latest.timestamp.toISOString() });
  } catch (err) {
    res.status(500).json({ error: "Failed to check bot status" });
  }
});

export default router;
