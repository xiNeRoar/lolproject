/**
 * Match Scoreboard Image Renderer
 *
 * Server-side renders a match result scoreboard as a PNG image
 * matching the VCLoL web design language (Dark Charcoal + Steel Blue).
 *
 * Uses @napi-rs/canvas for image generation.
 * Champion/item icons fetched from Riot Data Dragon CDN.
 */

import { createCanvas, GlobalFonts, Image } from "@napi-rs/canvas";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getChampionIcon, getItemIcon } from "./iconCache.js";

// ─── Design Tokens (from web index.css) ──────────────────────────────────────

const COLORS = {
  background: "#0E1015",    // hsl(222 15% 6%)
  card: "#151920",          // hsl(222 15% 9%)
  cardLight: "#1C2230",     // slightly lighter for alternating rows
  primary: "#2B8AEE",       // hsl(210 80% 55%)
  foreground: "#F8FAFC",    // hsl(210 20% 98%)
  muted: "#9BA3B0",         // hsl(215 15% 65%)
  border: "#272D36",        // hsl(222 15% 18%)
  green: "#4ADE80",         // win indicator
  red: "#F87171",           // loss indicator
  blue: "#3B82F6",          // blue side accent
  redSide: "#EF4444",       // red side accent
};

const WIDTH = 900;
const PADDING = 20;
const ROW_HEIGHT = 36;
const HEADER_HEIGHT = 32;
const COL_HEADER_HEIGHT = 24;
const ICON_SIZE = 28;
const ITEM_SIZE = 20;
const CORNER_RADIUS = 8;

// ─── Font Registration ───────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "fonts");

let fontsRegistered = false;

function registerFonts(): void {
  if (fontsRegistered) return;
  try {
    GlobalFonts.registerFromPath(join(fontsDir, "Inter-Regular.ttf"), "Inter");
    GlobalFonts.registerFromPath(join(fontsDir, "Inter-SemiBold.ttf"), "Inter SemiBold");
    GlobalFonts.registerFromPath(join(fontsDir, "Outfit-Bold.ttf"), "Outfit Bold");
    GlobalFonts.registerFromPath(join(fontsDir, "Outfit-SemiBold.ttf"), "Outfit SemiBold");
    fontsRegistered = true;
  } catch (err) {
    console.warn("[scoreboardRenderer] Font registration failed:", err);
    // Will fall back to system sans-serif
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoreboardPlayer {
  riotId: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  damage: number;
  vision: number;
  items: number[];
  linked: boolean;
}

export interface ScoreboardData {
  matchId: number;
  sideAName: string;
  sideBName: string;
  winnerName: string;
  blueWon: boolean;
  duration: string;
  gameVersion: string;
  bluePlayers: ScoreboardPlayer[];
  redPlayers: ScoreboardPlayer[];
  platformUrl: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGold(gold: number): string {
  return gold >= 1000 ? `${(gold / 1000).toFixed(1)}k` : String(gold);
}

function formatDmg(dmg: number): string {
  return dmg >= 1000 ? `${(dmg / 1000).toFixed(1)}k` : String(dmg);
}

async function loadImage(buf: Buffer | null): Promise<Image | null> {
  if (!buf) return null;
  try {
    const img = new Image();
    img.src = buf;
    return img;
  } catch {
    return null;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── Column Layout ────────────────────────────────────────────────────────────

const COLS = {
  icon:   { x: PADDING + 8, w: ICON_SIZE + 8 },
  name:   { x: PADDING + 44, w: 200 },
  kda:    { x: PADDING + 260, w: 90 },
  cs:     { x: PADDING + 360, w: 50 },
  gold:   { x: PADDING + 420, w: 60 },
  dmg:    { x: PADDING + 490, w: 60 },
  vision: { x: PADDING + 560, w: 50 },
  items:  { x: PADDING + 620, w: 260 },
};

// ─── Main Renderer ────────────────────────────────────────────────────────────

type CanvasRenderingContext2D = ReturnType<ReturnType<typeof createCanvas>["getContext"]>;

export async function renderScoreboard(data: ScoreboardData): Promise<Buffer> {
  registerFonts();

  // Calculate dynamic height
  const headerSection = 70;  // title + subtitle
  const sideSection = HEADER_HEIGHT + COL_HEADER_HEIGHT + (5 * ROW_HEIGHT);
  const footerSection = 36;
  const totalHeight = PADDING + headerSection + 12 + sideSection + 12 + sideSection + 12 + footerSection + PADDING;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  // ── Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, WIDTH, totalHeight);

  // Card background with rounded corners
  roundRect(ctx, 8, 8, WIDTH - 16, totalHeight - 16, CORNER_RADIUS);
  ctx.fillStyle = COLORS.card;
  ctx.fill();
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  let y = PADDING;

  // ── Title ───────────────────────────────────────────────────────────────
  ctx.font = '700 22px "Outfit Bold", sans-serif';
  ctx.fillStyle = COLORS.foreground;
  ctx.fillText(`Match #${data.matchId}`, PADDING + 8, y + 24);

  // Win indicator badge
  const titleWidth = ctx.measureText(`Match #${data.matchId}`).width;
  ctx.font = '600 13px "Inter SemiBold", sans-serif';
  ctx.fillStyle = COLORS.green;
  ctx.fillText("Recorded", PADDING + 8 + titleWidth + 12, y + 24);

  y += 36;

  // Subtitle: teams + duration + patch
  ctx.font = '400 14px "Inter", sans-serif';
  ctx.fillStyle = COLORS.muted;
  const winIcon = data.blueWon ? "WIN " : "";
  const loseIcon = data.blueWon ? "" : " WIN";
  ctx.fillText(
    `${winIcon}${data.sideAName}  vs  ${data.sideBName}${loseIcon}  ·  ${data.duration}  ·  Patch ${data.gameVersion}`,
    PADDING + 8, y + 16,
  );
  y += 32;

  // ── Blue Side ───────────────────────────────────────────────────────────
  y += 4;
  y = await drawSide(ctx, y, "BLUE", data.sideAName, data.bluePlayers, data.blueWon);

  // ── Gap ──────────────────────────────────────────────────────────────────
  y += 12;

  // ── Red Side ────────────────────────────────────────────────────────────
  y = await drawSide(ctx, y, "RED", data.sideBName, data.redPlayers, !data.blueWon);

  // ── Footer ──────────────────────────────────────────────────────────────
  y += 8;
  ctx.font = '400 12px "Inter", sans-serif';
  ctx.fillStyle = COLORS.primary;
  ctx.fillText(`${data.platformUrl}/matches/${data.matchId}`, PADDING + 8, y + 14);

  // VCLoL branding on right
  ctx.fillStyle = COLORS.muted;
  ctx.textAlign = "right";
  ctx.fillText("VCLoL", WIDTH - PADDING - 8, y + 14);
  ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}

// ─── Draw one side (5 players) ────────────────────────────────────────────────

async function drawSide(
  ctx: CanvasRenderingContext2D,
  y: number,
  side: "BLUE" | "RED",
  teamName: string,
  players: ScoreboardPlayer[],
  won: boolean,
): Promise<number> {
  const accentColor = side === "BLUE" ? COLORS.blue : COLORS.redSide;

  // Side header bar
  ctx.fillStyle = accentColor + "18"; // 10% opacity
  roundRect(ctx, PADDING, y, WIDTH - 2 * PADDING, HEADER_HEIGHT, 4);
  ctx.fill();

  // Left accent strip
  ctx.fillStyle = accentColor;
  roundRect(ctx, PADDING, y, 4, HEADER_HEIGHT, 2);
  ctx.fill();

  // Team name
  ctx.font = '600 15px "Outfit SemiBold", sans-serif';
  ctx.fillStyle = won ? COLORS.foreground : COLORS.muted;
  // Draw colored dot instead of emoji
  ctx.beginPath();
  ctx.arc(PADDING + 20, y + 16, 6, 0, Math.PI * 2);
  ctx.fillStyle = accentColor;
  ctx.fill();
  const winBadge = won ? "  WIN" : "";
  ctx.fillStyle = won ? COLORS.foreground : COLORS.muted;
  ctx.fillText(`${teamName}${winBadge}`, PADDING + 32, y + 22);

  y += HEADER_HEIGHT;

  // Column headers
  ctx.font = '400 11px "Inter", sans-serif';
  ctx.fillStyle = COLORS.muted;
  ctx.fillText("PLAYER", COLS.icon.x, y + 16);
  ctx.fillText("KDA", COLS.kda.x, y + 16);
  ctx.fillText("CS", COLS.cs.x, y + 16);
  ctx.fillText("GOLD", COLS.gold.x, y + 16);
  ctx.fillText("DMG", COLS.dmg.x, y + 16);
  ctx.fillText("VIS", COLS.vision.x, y + 16);
  ctx.fillText("ITEMS", COLS.items.x, y + 16);
  y += COL_HEADER_HEIGHT;

  // Player rows
  for (let i = 0; i < players.length; i++) {
    const p = players[i]!;
    const rowY = y + i * ROW_HEIGHT;

    // Alternating row background
    if (i % 2 === 0) {
      ctx.fillStyle = COLORS.card;
    } else {
      ctx.fillStyle = COLORS.cardLight;
    }
    ctx.fillRect(PADDING, rowY, WIDTH - 2 * PADDING, ROW_HEIGHT);

    // Champion icon
    const champIcon = await getChampionIcon(p.champion);
    if (champIcon) {
      const img = await loadImage(champIcon);
      if (img) {
        // Rounded champion icon
        ctx.save();
        roundRect(ctx, COLS.icon.x, rowY + 4, ICON_SIZE, ICON_SIZE, 4);
        ctx.clip();
        ctx.drawImage(img, COLS.icon.x, rowY + 4, ICON_SIZE, ICON_SIZE);
        ctx.restore();
      }
    }

    // Player name
    ctx.font = '600 13px "Inter SemiBold", sans-serif';
    ctx.fillStyle = p.linked ? COLORS.foreground : COLORS.muted;
    const displayName = p.riotId.length > 18 ? p.riotId.slice(0, 15) + "..." : p.riotId;
    ctx.fillText(displayName, COLS.name.x, rowY + 22);
    if (!p.linked) {
      // Unlinked indicator
      ctx.font = '400 10px "Inter", sans-serif';
      ctx.fillStyle = COLORS.muted;
      ctx.fillText("!", COLS.name.x + ctx.measureText(displayName).width + 4, rowY + 22);
    }

    // KDA
    ctx.font = '400 13px "Inter", sans-serif';
    ctx.fillStyle = COLORS.foreground;
    ctx.fillText(`${p.kills}/${p.deaths}/${p.assists}`, COLS.kda.x, rowY + 22);

    // CS
    ctx.fillStyle = COLORS.muted;
    ctx.fillText(String(p.cs), COLS.cs.x, rowY + 22);

    // Gold
    ctx.fillText(formatGold(p.gold), COLS.gold.x, rowY + 22);

    // Damage
    ctx.fillText(formatDmg(p.damage), COLS.dmg.x, rowY + 22);

    // Vision
    ctx.fillText(String(p.vision), COLS.vision.x, rowY + 22);

    // Items (up to 7)
    let itemX = COLS.items.x;
    for (const itemId of p.items) {
      if (itemId <= 0) continue;
      const itemIcon = await getItemIcon(itemId);
      if (itemIcon) {
        const img = await loadImage(itemIcon);
        if (img) {
          ctx.save();
          roundRect(ctx, itemX, rowY + 8, ITEM_SIZE, ITEM_SIZE, 2);
          ctx.clip();
          ctx.drawImage(img, itemX, rowY + 8, ITEM_SIZE, ITEM_SIZE);
          ctx.restore();
        }
      }
      itemX += ITEM_SIZE + 3;
    }
  }

  return y + players.length * ROW_HEIGHT;
}
