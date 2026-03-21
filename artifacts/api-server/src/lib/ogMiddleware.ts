/**
 * OG Tag Injection Middleware (#56)
 *
 * Injects Open Graph meta tags into the SPA's index.html for specific
 * routes before serving them. This enables rich Discord/Twitter/Slack
 * link previews for match, team, and player pages.
 *
 * The Express server must serve the Vite build output (dist/public) for
 * this to work. See DEPLOYMENT.md for the consolidated serving setup.
 *
 * Supported routes:
 *   /matches/:id   → "TeamA vs TeamB — 2-1 | VCLoL"
 *   /teams/:id     → "VancouverStorm [VST] — 1243 ELO | VCLoL"
 *   /players/:riotId → "xiNe#NA1 — Mid | VCLoL"
 */

import { Request, Response, NextFunction } from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "@workspace/db";
import {
  matchesTable,
  teamsTable,
  playersTable,
  matchPlayersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

// ── Cache index.html at module load ──────────────────────────────────────────

let indexHtmlCache: string | null = null;

function getIndexHtml(staticDir: string): string | null {
  if (indexHtmlCache) return indexHtmlCache;
  try {
    indexHtmlCache = readFileSync(join(staticDir, "index.html"), "utf8");
    return indexHtmlCache;
  } catch {
    return null;
  }
}

// ── OG data fetchers ──────────────────────────────────────────────────────────

async function getMatchOg(id: number): Promise<OgData | null> {
  try {
    const [match] = await db
      .select()
      .from(matchesTable)
      .where(eq(matchesTable.id, id));
    if (!match) return null;

    const title = `${match.sideAName} vs ${match.sideBName}${match.score ? ` — ${match.score}` : ""}`;
    const winner = match.winnerName ? `${match.winnerName} won` : "Result pending";
    const duration = match.gameDuration
      ? ` · ${Math.floor(match.gameDuration / 60000)}m`
      : "";
    const description = `${winner}${duration} · VCLoL verified scrim result`;

    return { title, description };
  } catch {
    return null;
  }
}

async function getTeamOg(id: number): Promise<OgData | null> {
  try {
    const [team] = await db
      .select()
      .from(teamsTable)
      .where(eq(teamsTable.id, id));
    if (!team) return null;

    const title = `${team.name} [${team.tag}]`;
    const wl = `${team.wins}W / ${team.losses}L`;
    const description = `${team.teamElo} ELO · ${wl} · VCLoL competitive team`;

    return { title, description };
  } catch {
    return null;
  }
}

async function getPlayerOg(riotId: string): Promise<OgData | null> {
  try {
    const [player] = await db
      .select()
      .from(playersTable)
      .where(eq(playersTable.riotId, riotId));
    if (!player) return null;

    const role = player.primaryRole ? ` · ${player.primaryRole}` : "";
    const title = `${player.riotId}${role}`;
    const description = `VCLoL competitive player profile — verified 5v5 scrim record`;

    return { title, description };
  } catch {
    return null;
  }
}

// ── HTML injection ────────────────────────────────────────────────────────────

interface OgData {
  title: string;
  description: string;
  image?: string;
}

const SITE_NAME = "VCLoL";
const DEFAULT_IMAGE = "/opengraph.jpg"; // already exists in public/
const BASE_URL = process.env.VITE_SITE_URL || "https://vclol.gg";

function injectOgTags(html: string, og: OgData, canonicalPath: string): string {
  const fullTitle = `${og.title} | ${SITE_NAME}`;
  const imageUrl = `${BASE_URL}${og.image ?? DEFAULT_IMAGE}`;
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  const tags = [
    `<title>${escapeHtml(fullTitle)}</title>`,
    `<meta name="description" content="${escapeHtml(og.description)}" />`,
    // Open Graph
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta property="og:description" content="${escapeHtml(og.description)}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    // Twitter Card
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escapeHtml(fullTitle)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(og.description)}" />`,
    `<meta name="twitter:image" content="${imageUrl}" />`,
  ].join("\n    ");

  // Replace the existing <title> tag and inject all OG tags before </head>
  return html
    .replace(/<title>.*?<\/title>/s, "")
    .replace("</head>", `  ${tags}\n  </head>`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── Middleware factory ────────────────────────────────────────────────────────

export function createOgMiddleware(staticDir: string) {
  // Patterns that need OG injection
  const MATCH_RE = /^\/matches\/(\d+)$/;
  const TEAM_RE = /^\/teams\/(\d+)(?:\/.*)?$/;
  const PLAYER_RE = /^\/players\/([^/]+)$/;

  return async (req: Request, res: Response, next: NextFunction) => {
    const path = req.path;

    // Only process GET requests for SPA routes (not /api/*)
    if (req.method !== "GET" || path.startsWith("/api/")) {
      return next();
    }

    let ogData: OgData | null = null;

    const matchMatch = path.match(MATCH_RE);
    const teamMatch = path.match(TEAM_RE);
    const playerMatch = path.match(PLAYER_RE);

    if (matchMatch) {
      ogData = await getMatchOg(parseInt(matchMatch[1]));
    } else if (teamMatch && !path.includes("/manage")) {
      ogData = await getTeamOg(parseInt(teamMatch[1]));
    } else if (playerMatch) {
      ogData = await getPlayerOg(decodeURIComponent(playerMatch[1]));
    }

    // No OG data needed — let static middleware handle it
    if (!ogData) return next();

    const html = getIndexHtml(staticDir);
    if (!html) return next();

    const injected = injectOgTags(html, ogData, path);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=60"); // 1 min cache for OG pages
    res.send(injected);
  };
}
