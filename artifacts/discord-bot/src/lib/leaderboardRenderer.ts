import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const C = { bg: "#0E1015", card: "#151920", cardL: "#1C2230", pri: "#2B8AEE", fg: "#F8FAFC", mut: "#9BA3B0", bdr: "#272D36", gold: "#FACC15", silver: "#C0C0C0", bronze: "#CD7F32" };
const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "fonts");
let fr = false;
function rf(): void { if (fr) return; try { GlobalFonts.registerFromPath(join(fontsDir, "Inter-Regular.ttf"), "Inter"); GlobalFonts.registerFromPath(join(fontsDir, "Inter-SemiBold.ttf"), "Inter SemiBold"); GlobalFonts.registerFromPath(join(fontsDir, "Outfit-Bold.ttf"), "Outfit Bold"); GlobalFonts.registerFromPath(join(fontsDir, "Outfit-SemiBold.ttf"), "Outfit SemiBold"); fr = true; } catch {} }
function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }

export interface LeaderboardEntry { position: number; teamName: string; teamTag: string; elo: number; wins: number; losses: number; }
export interface LeaderboardData { seasonName: string; daysRemaining: number | null; entries: LeaderboardEntry[]; platformUrl: string; }

function pc(pos: number): string { if (pos === 1) return C.gold; if (pos === 2) return C.silver; if (pos === 3) return C.bronze; return C.mut; }

export async function renderLeaderboard(data: LeaderboardData): Promise<Buffer> {
  rf();
  const ec = Math.min(data.entries.length, 10); const RH = 36;
  const W = 520, H = 90 + ec*RH + 30;
  const canvas = createCanvas(W, H); const ctx = canvas.getContext("2d");

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  rr(ctx, 6, 6, W-12, H-12, 8); ctx.fillStyle = C.card; ctx.fill();
  ctx.strokeStyle = C.bdr; ctx.lineWidth = 1; ctx.stroke();

  let y = 24;
  ctx.font = '700 20px "Outfit Bold", sans-serif'; ctx.fillStyle = C.fg;
  ctx.fillText(data.seasonName, 24, y+18); y += 28;
  ctx.font = '400 13px "Inter", sans-serif'; ctx.fillStyle = C.mut;
  if (data.daysRemaining != null && data.daysRemaining > 0) ctx.fillText(`Ends in ${data.daysRemaining} day${data.daysRemaining===1?"":"s"}`, 24, y+14);
  else ctx.fillText("Season complete", 24, y+14);
  y += 26;

  ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.mut;
  ctx.fillText("#", 28, y+14); ctx.fillText("TEAM", 56, y+14); ctx.fillText("RECORD", 300, y+14); ctx.fillText("WIN%", 420, y+14);
  y += 22;

  for (let i = 0; i < ec; i++) {
    const e = data.entries[i]!; const ry = y + i*RH;
    ctx.fillStyle = i%2===0 ? C.card : C.cardL; ctx.fillRect(20, ry, W-40, RH);
    ctx.font = '700 16px "Outfit Bold", sans-serif'; ctx.fillStyle = pc(e.position); ctx.fillText(String(e.position), 32, ry+24);
    ctx.font = '600 14px "Inter SemiBold", sans-serif'; ctx.fillStyle = C.fg; ctx.fillText(e.teamName, 56, ry+22);
    const tw = ctx.measureText(e.teamName).width;
    ctx.font = '400 12px "Inter", sans-serif'; ctx.fillStyle = C.mut; ctx.fillText(`[${e.teamTag}]`, 56+tw+6, ry+22);
    ctx.font = '600 14px "Inter SemiBold", sans-serif'; ctx.fillStyle = C.fg; ctx.fillText(`${e.wins}W-${e.losses}L`, 300, ry+22);
    ctx.font = '400 13px "Inter", sans-serif'; ctx.fillStyle = C.mut; const wr = e.wins+e.losses > 0 ? Math.round(e.wins/(e.wins+e.losses)*100) : 0; ctx.fillText(`${wr}%`, 420, ry+22);
  }

  ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.pri; ctx.fillText(data.platformUrl, 24, H-18);
  ctx.fillStyle = C.mut; ctx.textAlign = "right"; ctx.fillText("VCLoL", W-24, H-18); ctx.textAlign = "left";
  return canvas.toBuffer("image/png");
}
