import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import "../lib/session";

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "http://localhost:5173/auth/discord/callback";

// GET /auth/discord — redirect to Discord OAuth
router.get("/discord", (_req, res) => {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// GET /auth/discord/callback — exchange code for token, set session
router.get("/discord/callback", async (req, res) => {
  const code = req.query.code as string;
  if (!code) {
    res.status(400).json({ error: "Missing code parameter" });
    return;
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      res.status(401).json({ error: "Failed to exchange Discord code" });
      return;
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Get Discord user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: "Failed to fetch Discord user" });
      return;
    }

    const discordUser = await userRes.json() as { id: string; username: string; email?: string };

    // Check if player exists with this discordId
    const [existing] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.discordId, discordUser.id));

    if (existing) {
      // Player exists — log them in
      req.session.playerId = existing.id;
      req.session.playerRiotId = existing.riotId;
      res.redirect("/dashboard");
    } else {
      // Player not registered yet — redirect to register with Discord info in session
      req.session.discordId = discordUser.id;
      req.session.discordUsername = discordUser.username;
      res.redirect("/register");
    }
  } catch (err) {
    res.status(500).json({ error: "Discord OAuth failed" });
  }
});

// GET /auth/me — current player session info
router.get("/me", async (req, res) => {
  try {
    if (req.session.playerId) {
      const [player] = await db
        .select({ puuid: playersTable.puuid, rsoOptIn: playersTable.rsoOptIn })
        .from(playersTable)
        .where(eq(playersTable.id, req.session.playerId));

      res.json({
        authenticated: true,
        playerId: req.session.playerId,
        riotId: req.session.playerRiotId ?? null,
        discordUsername: req.session.discordUsername ?? null,
        hasPuuid: !!player?.puuid,
        rsoOptIn: player?.rsoOptIn ?? false,
      });
    } else {
      res.json({
        authenticated: false,
        playerId: null,
        riotId: null,
        discordUsername: null,
        hasPuuid: false,
        rsoOptIn: false,
      });
    }
  } catch (err) {
    console.error("[auth]", err);
    res.json({
      authenticated: false,
      playerId: null,
      riotId: null,
      discordUsername: null,
      hasPuuid: false,
      rsoOptIn: false,
    });
  }
});

// POST /auth/logout — destroy player session
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
