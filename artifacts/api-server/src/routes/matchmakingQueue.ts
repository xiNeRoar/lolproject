import { Router } from "express";

const router = Router();

router.post("/join", (_req, res) => {
  res.json({ message: "Matchmaking coming soon" });
});

router.delete("/leave", (_req, res) => {
  res.json({ success: true });
});

export default router;
