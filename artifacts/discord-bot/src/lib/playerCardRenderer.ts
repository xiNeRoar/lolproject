import { createCanvas, GlobalFonts, Image } from "@napi-rs/canvas";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { getChampionIcon } from "./iconCache.js";
const C = { bg: "#0E1015", card: "#151920", cardL: "#1C2230", pri: "#2B8AEE", fg: "#F8FAFC", mut: "#9BA3B0", bdr: "#272D36" };
const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "fonts");
let fr = false;
function rf(): void { if (fr) return; try { GlobalFonts.registerFromPath(join(fontsDir, "Inter-Regular.ttf"), "Inter"); GlobalFonts.registerFromPath(join(fontsDir, "Inter-SemiBold.ttf"), "Inter SemiBold"); GlobalFonts.registerFromPath(join(fontsDir, "Outfit-Bold.ttf"), "Outfit Bold"); fr = true; } catch {} }
function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }

export interface PlayerCardChampion { name: string; games: number; }
export interface PlayerCardTeam { name: string; tag: string; active: boolean; }
export interface PlayerCardData {
  riotId: string; totalGames: number; winRate: number | null;
  avgKills: number; avgDeaths: number; avgAssists: number;
  champions: PlayerCardChampion[]; teams: PlayerCardTeam[]; platformUrl: string;
}

export async function renderPlayerCard(data: PlayerCardData): Promise<Buffer> {
  rf();
  const W = 480;
  const cc = Math.min(data.champions.length, 3);
  const tc = Math.min(data.teams.length, 3);
  const H = 170 + (cc > 0 ? 52 : 0) + (tc > 0 ? 22 + tc*18 : 0);
  const canvas = createCanvas(W, H); const ctx = canvas.getContext("2d");

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  rr(ctx, 6, 6, W-12, H-12, 8); ctx.fillStyle = C.card; ctx.fill();
  ctx.strokeStyle = C.bdr; ctx.lineWidth = 1; ctx.stroke();

  let y = 24;
  ctx.font = '700 22px "Outfit Bold", sans-serif'; ctx.fillStyle = C.fg;
  ctx.fillText(data.riotId, 24, y+18); y += 36;

  const stats = [
    { label: "Games", value: String(data.totalGames) },
    { label: "Win Rate", value: data.winRate != null ? `${data.winRate}%` : "—" },
    { label: "Avg KDA", value: data.totalGames > 0 ? `${data.avgKills.toFixed(1)}/${data.avgDeaths.toFixed(1)}/${data.avgAssists.toFixed(1)}` : "—" },
  ];
  const sw = (W-48)/3;
  for (let i = 0; i < stats.length; i++) {
    const sx = 24+i*sw;
    rr(ctx, sx, y, sw-8, 44, 4); ctx.fillStyle = C.cardL; ctx.fill();
    ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.mut; ctx.fillText(stats[i]!.label, sx+10, y+16);
    ctx.font = '600 16px "Inter SemiBold", sans-serif'; ctx.fillStyle = C.fg; ctx.fillText(stats[i]!.value, sx+10, y+36);
  }
  y += 58;

  if (cc > 0) {
    ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.mut; ctx.fillText("CHAMPION POOL", 24, y+12); y += 18;
    let cx = 24;
    for (let i = 0; i < cc; i++) {
      const ch = data.champions[i]!;
      const icon = await getChampionIcon(ch.name);
      if (icon) { try { const img = new Image(); img.src = icon; ctx.save(); rr(ctx, cx, y, 28, 28, 4); ctx.clip(); ctx.drawImage(img, cx, y, 28, 28); ctx.restore(); } catch {} }
      ctx.font = '600 12px "Inter SemiBold", sans-serif'; ctx.fillStyle = C.fg; ctx.fillText(ch.name, cx+34, y+14);
      ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.mut; ctx.fillText(`${ch.games}g`, cx+34, y+26);
      cx += 140;
    }
    y += 36;
  }

  if (tc > 0) {
    ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.mut; ctx.fillText("TEAMS", 24, y+12); y += 18;
    for (let i = 0; i < tc; i++) {
      const t = data.teams[i]!;
      ctx.font = '400 13px "Inter", sans-serif'; ctx.fillStyle = t.active ? C.fg : C.mut;
      ctx.fillText(`${t.name} [${t.tag}]${t.active ? "" : " (inactive)"}`, 24, y+13); y += 18;
    }
  }

  ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.pri; ctx.fillText(data.platformUrl, 24, H-20);
  ctx.fillStyle = C.mut; ctx.textAlign = "right"; ctx.fillText("VCLoL", W-24, H-20); ctx.textAlign = "left";
  return canvas.toBuffer("image/png");
}
