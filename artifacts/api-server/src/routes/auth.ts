import { Router } from "express";
import { db } from "@workspace/db";
import { playersTable, authSessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import crypto from "crypto";
import "../lib/session";

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "http://localhost:5173/auth/discord/callback";

const RSO_CLIENT_ID = process.env.RSO_CLIENT_ID || "";
const RSO_CLIENT_SECRET = process.env.RSO_CLIENT_SECRET || "";
const RSO_REDIRECT_URI = process.env.RSO_REDIRECT_URI || "http://localhost:3000/api/auth/rso/callback";
const PLATFORM_URL = (process.env.PLATFORM_URL || "http://localhost:5173").replace(/\/+$/, "");

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

// ── RSO (Riot Sign On) OAuth ────────────────────────────────────────────────

// GET /auth/connect/:token — Bot /connect flow: validate token and redirect to RSO
router.get("/connect/:token", async (req, res) => {
  const { token } = req.params;
  try {
    // Validate token: exists, not expired, not already used
    const [authSession] = await db
      .select()
      .from(authSessionsTable)
      .where(
        and(
          eq(authSessionsTable.token, token),
          gt(authSessionsTable.expiresAt, new Date())
        )
      );

    if (!authSession || authSession.completedAt) {
      res.redirect(`${PLATFORM_URL}/connect?error=invalid_token`);
      return;
    }

    // Store token and discordId in session for callback
    req.session.connectToken = token;
    req.session.connectDiscordId = authSession.discordId;

    // Save session explicitly before redirect to ensure persistence
    req.session.save(() => {
      // Generate CSRF state and redirect to RSO
      const state = crypto.randomUUID();
      req.session.oauthState = state;
      req.session.save(() => {
        const params = new URLSearchParams({
          redirect_uri: RSO_REDIRECT_URI,
          client_id: RSO_CLIENT_ID,
          response_type: "code",
          scope: "openid",
          state,
        });
        res.redirect(`https://auth.riotgames.com/authorize?${params}`);
      });
    });
  } catch (err) {
    console.error("[auth] RSO connect token validation failed:", err);
    res.redirect(`${PLATFORM_URL}/connect?error=server_error`);
  }
});

// GET /auth/rso — Website RSO flow: require session, redirect to RSO
router.get("/rso", (req, res) => {
  if (!req.session.playerId) {
    res.redirect(`${PLATFORM_URL}/login`);
    return;
  }

  const state = crypto.randomUUID();
  req.session.oauthState = state;
  req.session.save(() => {
    const params = new URLSearchParams({
      redirect_uri: RSO_REDIRECT_URI,
      client_id: RSO_CLIENT_ID,
      response_type: "code",
      scope: "openid",
      state,
    });
    res.redirect(`https://auth.riotgames.com/authorize?${params}`);
  });
});

// GET /auth/rso/callback — RSO callback: exchange code for PUUID, update player
router.get("/rso/callback", async (req, res) => {
  const code = req.query.code as string;
  const state = req.query.state as string;

  // CSRF validation
  if (!state || state !== req.session.oauthState) {
    console.error("[auth] RSO callback state mismatch");
    res.redirect(`${PLATFORM_URL}/connect?error=state_mismatch`);
    return;
  }

  // Clear oauthState after validation (one-time use)
  req.session.oauthState = undefined;

  if (!code) {
    res.redirect(`${PLATFORM_URL}/connect?error=missing_code`);
    return;
  }

  try {
    // Step A: Exchange code for access token
    const tokenRes = await fetch("https://auth.riotgames.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: RSO_CLIENT_ID,
        client_secret: RSO_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: RSO_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[auth] RSO token exchange failed:", tokenRes.status);
      res.redirect(`${PLATFORM_URL}/connect?error=token_exchange_failed`);
      return;
    }

    const tokenData = await tokenRes.json() as { access_token: string };

    // Step B: Fetch PUUID from Riot account API
    const accountRes = await fetch(
      "https://americas.api.riotgames.com/riot/account/v1/accounts/me",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!accountRes.ok) {
      console.error("[auth] RSO account fetch failed:", accountRes.status);
      res.redirect(`${PLATFORM_URL}/connect?error=account_fetch_failed`);
      return;
    }

    const account = await accountRes.json() as { puuid: string; gameName: string; tagLine: string };
    const riotId = `${account.gameName}#${account.tagLine}`;

    // Step C: Determine which player to update
    // Bot flow: connectToken in session -> look up discordId from auth_sessions
    // Web flow: playerId already in session
    let playerId = req.session.playerId;

    if (req.session.connectToken && req.session.connectDiscordId) {
      // Bot flow: find player by discordId
      const [player] = await db
        .select({ id: playersTable.id })
        .from(playersTable)
        .where(eq(playersTable.discordId, req.session.connectDiscordId));

      if (player) {
        playerId = player.id;
      }
    }

    if (!playerId) {
      console.error("[auth] RSO callback: no player to update");
      res.redirect(`${PLATFORM_URL}/connect?error=no_player`);
      return;
    }

    // Step D: Update player record with PUUID and riotId
    await db
      .update(playersTable)
      .set({
        puuid: account.puuid,
        riotId,
        rsoOptIn: true,
        updatedAt: new Date(),
      })
      .where(eq(playersTable.id, playerId));

    // Step E: Mark auth_session token as completed (if bot flow)
    if (req.session.connectToken) {
      await db
        .update(authSessionsTable)
        .set({
          completedAt: new Date(),
          puuid: account.puuid,
        })
        .where(eq(authSessionsTable.token, req.session.connectToken));

      // Clear bot-flow session data
      req.session.connectToken = undefined;
      req.session.connectDiscordId = undefined;
    }

    // Step F: Update session with player info
    req.session.playerId = playerId;
    req.session.playerRiotId = riotId;
    req.session.save(() => {
      res.redirect(`${PLATFORM_URL}/dashboard?rso=success`);
    });
  } catch (err) {
    console.error("[auth] RSO callback error:", err);
    res.redirect(`${PLATFORM_URL}/connect?error=server_error`);
  }
});

export default router;
