import { Router } from "express";
import crypto from "node:crypto";
import { db } from "@workspace/db";
import { playersTable, authSessionsTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import "../lib/session";

const router = Router();

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const DISCORD_REDIRECT_URI =
  process.env.DISCORD_REDIRECT_URI || "http://localhost:5173/auth/discord/callback";

const RSO_CLIENT_ID = process.env.RSO_CLIENT_ID || "";
const RSO_CLIENT_SECRET = process.env.RSO_CLIENT_SECRET || "";
const RSO_REDIRECT_URI = process.env.RSO_REDIRECT_URI || "http://localhost:3000/auth/rso/callback";
const PLATFORM_URL = process.env.PLATFORM_URL || "http://localhost:5173";

// GET /auth/discord — initiate Discord OAuth flow
router.get("/discord", (req, res) => {
  const state = crypto.randomBytes(32).toString("hex");
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email",
    state,
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

// GET /auth/discord/callback — exchange code, set player session
router.get("/discord/callback", async (req, res) => {
  const state = req.query.state as string;
  if (!state || state !== req.session.oauthState) {
    res.status(403).json({ error: "Invalid OAuth state" });
    return;
  }
  delete req.session.oauthState;

  const code = req.query.code as string;
  if (!code) {
    res.status(400).json({ error: "Missing code parameter" });
    return;
  }

  try {
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

    const tokenData = (await tokenRes.json()) as { access_token: string };

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: "Failed to fetch Discord user" });
      return;
    }

    const discordUser = (await userRes.json()) as {
      id: string;
      username: string;
      email?: string;
    };

    const [existing] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.discordId, discordUser.id));

    if (existing) {
      req.session.playerId = existing.id;
      req.session.playerRiotId = existing.riotId;
      req.session.discordUsername = discordUser.username;
      res.redirect("/dashboard");
    } else {
      // Not registered — store Discord info in session for registration page
      req.session.discordId = discordUser.id;
      req.session.discordUsername = discordUser.username;
      res.redirect("/register");
    }
  } catch (err) {
    res.status(500).json({ error: "Discord OAuth failed" });
  }
});

// ── RSO OAuth (PRD v3.1 §5, §11 — launch requirement) ─────────────────────

// GET /auth/connect/:token — bot /connect flow: validate token, redirect to RSO
router.get("/connect/:token", async (req, res) => {
  const { token } = req.params;

  try {
    const [session] = await db
      .select()
      .from(authSessionsTable)
      .where(
        and(
          eq(authSessionsTable.token, token),
          gt(authSessionsTable.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!session) {
      res.redirect(`${PLATFORM_URL}/connect?error=expired`);
      return;
    }

    if (session.completedAt) {
      res.redirect(`${PLATFORM_URL}/connect?error=already_used`);
      return;
    }

    // Store token in session for callback to link discordId
    req.session.connectToken = token;
    req.session.connectDiscordId = session.discordId;

    // Redirect to RSO OAuth
    if (!RSO_CLIENT_ID) {
      // Pre-launch: RSO not yet approved by Riot
      res.redirect(`${PLATFORM_URL}/connect?error=rso_pending`);
      return;
    }

    const state = crypto.randomBytes(32).toString("hex");
    req.session.oauthState = state;
    const params = new URLSearchParams({
      client_id: RSO_CLIENT_ID,
      redirect_uri: RSO_REDIRECT_URI,
      response_type: "code",
      scope: "openid offline_access",
      state,
    });
    res.redirect(`https://auth.riotgames.com/authorize?${params}`);
  } catch (err) {
    console.error("[auth/connect] Error:", err);
    res.redirect(`${PLATFORM_URL}/connect?error=server`);
  }
});

// GET /auth/rso — initiate RSO OAuth (for website-only flow, no bot token)
router.get("/rso", (req, res) => {
  if (!RSO_CLIENT_ID) {
    res.redirect(`${PLATFORM_URL}/connect?error=rso_pending`);
    return;
  }

  if (!req.session.playerId && !req.session.discordId) {
    // Must be logged in via Discord first
    res.redirect("/auth/discord");
    return;
  }

  const state = crypto.randomBytes(32).toString("hex");
  req.session.oauthState = state;
  const params = new URLSearchParams({
    client_id: RSO_CLIENT_ID,
    redirect_uri: RSO_REDIRECT_URI,
    response_type: "code",
    scope: "openid offline_access",
    state,
  });
  res.redirect(`https://auth.riotgames.com/authorize?${params}`);
});

// GET /auth/rso/callback — exchange code for PUUID, update player record
router.get("/rso/callback", async (req, res) => {
  const state = req.query.state as string;
  if (!state || state !== req.session.oauthState) {
    res.status(403).json({ error: "Invalid OAuth state" });
    return;
  }
  delete req.session.oauthState;

  const code = req.query.code as string;
  if (!code) {
    res.redirect(`${PLATFORM_URL}/connect?error=missing_code`);
    return;
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://auth.riotgames.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${RSO_CLIENT_ID}:${RSO_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: RSO_REDIRECT_URI,
      }),
    });

    if (!tokenRes.ok) {
      console.error("[auth/rso] Token exchange failed:", await tokenRes.text());
      res.redirect(`${PLATFORM_URL}/connect?error=token_failed`);
      return;
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      id_token?: string;
    };

    // Get PUUID from Riot Account API
    const accountRes = await fetch(
      "https://americas.api.riotgames.com/riot/account/v1/accounts/me",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!accountRes.ok) {
      console.error("[auth/rso] Account fetch failed:", await accountRes.text());
      res.redirect(`${PLATFORM_URL}/connect?error=account_failed`);
      return;
    }

    const account = (await accountRes.json()) as {
      puuid: string;
      gameName: string;
      tagLine: string;
    };

    const riotId = `${account.gameName}#${account.tagLine}`;
    const now = new Date();

    // Determine discordId: from bot /connect session or from logged-in player
    const discordId = req.session.connectDiscordId ?? null;
    const existingPlayerId = req.session.playerId ?? null;

    // Find or create player by PUUID (PUUID is ground truth)
    let [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.puuid, account.puuid))
      .limit(1);

    if (!player && discordId) {
      // Try matching by discordId (player created by bot but no puuid yet)
      [player] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.discordId, discordId))
        .limit(1);
    }

    if (!player) {
      // Try matching by riotId (player created from .rofl)
      [player] = await db
        .select()
        .from(playersTable)
        .where(eq(playersTable.riotId, riotId))
        .limit(1);
    }

    if (player) {
      // Update existing player
      await db
        .update(playersTable)
        .set({
          puuid: account.puuid,
          riotId,
          rsoOptIn: true,
          // TODO: Tournament API integration requires encrypted token storage
          // See PROJECT.md Key Decisions. Columns kept for future use.
          rsoAccessToken: null,
          rsoRefreshToken: null,
          rsoLinkedAt: now,
          discordId: discordId ?? player.discordId,
          updatedAt: now,
        })
        .where(eq(playersTable.id, player.id));

      req.session.playerId = player.id;
      req.session.playerRiotId = riotId;
    } else {
      // Create new player
      const [created] = await db
        .insert(playersTable)
        .values({
          riotId,
          puuid: account.puuid,
          discordId,
          discordUsername: account.gameName,
          rsoOptIn: true,
          // TODO: Tournament API integration requires encrypted token storage
          // See PROJECT.md Key Decisions. Columns kept for future use.
          rsoAccessToken: null,
          rsoRefreshToken: null,
          rsoLinkedAt: now,
          registrationStatus: "active",
        })
        .returning();

      req.session.playerId = created!.id;
      req.session.playerRiotId = riotId;
    }

    // Mark auth_session as completed (bot /connect flow)
    if (req.session.connectToken) {
      await db
        .update(authSessionsTable)
        .set({ completedAt: now, puuid: account.puuid })
        .where(eq(authSessionsTable.token, req.session.connectToken));

      delete req.session.connectToken;
      delete req.session.connectDiscordId;
    }

    res.redirect(`${PLATFORM_URL}/connect?success=true`);
  } catch (err) {
    console.error("[auth/rso] Callback error:", err);
    res.redirect(`${PLATFORM_URL}/connect?error=server`);
  }
});

// GET /auth/me — current player session info
router.get("/me", (req, res) => {
  if (req.session.playerId) {
    res.json({
      authenticated: true,
      playerId: req.session.playerId,
      riotId: req.session.playerRiotId ?? null,
      discordUsername: req.session.discordUsername ?? null,
    });
  } else {
    res.json({ authenticated: false, playerId: null, riotId: null, discordUsername: null });
  }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

export default router;
