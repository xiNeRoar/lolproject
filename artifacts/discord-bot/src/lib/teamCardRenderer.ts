import { createCanvas, GlobalFonts } from "@napi-rs/canvas";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const C = { bg: "#0E1015", card: "#151920", cardL: "#1C2230", pri: "#2B8AEE", fg: "#F8FAFC", mut: "#9BA3B0", bdr: "#272D36", grn: "#4ADE80", red: "#F87171", gold: "#FACC15", purp: "#A78BFA", blu: "#60A5FA" };
const __dirname = dirname(fileURLToPath(import.meta.url));
const fontsDir = join(__dirname, "..", "fonts");
let fr = false;
function rf(): void { if (fr) return; try { GlobalFonts.registerFromPath(join(fontsDir, "Inter-Regular.ttf"), "Inter"); GlobalFonts.registerFromPath(join(fontsDir, "Inter-SemiBold.ttf"), "Inter SemiBold"); GlobalFonts.registerFromPath(join(fontsDir, "Outfit-Bold.ttf"), "Outfit Bold"); fr = true; } catch {} }
function rr(ctx: any, x: number, y: number, w: number, h: number, r: number) { ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r); ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r); ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r); ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r); ctx.closePath(); }
function ebc(elo: number): string { if (elo >= 1400) return C.gold; if (elo >= 1200) return C.purp; if (elo >= 1100) return C.blu; return C.mut; }

export interface TeamCardData {
  teamName: string; teamTag: string; elo: number;
  wins: number; losses: number;
  recentResults: boolean[]; platformUrl: string;
}

export async function renderTeamCard(data: TeamCardData): Promise<Buffer> {
  rf();
  const W = 480, H = 220;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  rr(ctx, 6, 6, W-12, H-12, 8); ctx.fillStyle = C.card; ctx.fill();
  ctx.strokeStyle = C.bdr; ctx.lineWidth = 1; ctx.stroke();

  let y = 24;
  ctx.font = '700 24px "Outfit Bold", sans-serif'; ctx.fillStyle = C.fg;
  ctx.fillText(data.teamName, 24, y+20);
  const nw = ctx.measureText(data.teamName).width;
  ctx.font = '600 16px "Inter SemiBold", sans-serif'; ctx.fillStyle = C.mut;
  ctx.fillText(`[${data.teamTag}]`, 24+nw+8, y+20);
  y += 40;

  const bc = ebc(data.elo);
  rr(ctx, 24, y, 80, 28, 4); ctx.fillStyle = bc+"20"; ctx.fill();
  ctx.strokeStyle = bc+"40"; ctx.lineWidth = 1; ctx.stroke();
  ctx.font = '600 15px "Inter SemiBold", sans-serif'; ctx.fillStyle = bc;
  ctx.fillText(`${data.elo} ELO`, 34, y+19);

  const tot = data.wins + data.losses;
  const wr = tot > 0 ? Math.round((data.wins/tot)*100) : 0;
  ctx.font = '400 14px "Inter", sans-serif'; ctx.fillStyle = C.fg;
  ctx.fillText(`${data.wins}W / ${data.losses}L`, 120, y+19);
  const wlw = ctx.measureText(`${data.wins}W / ${data.losses}L`).width;
  ctx.fillStyle = C.mut; ctx.fillText(`(${wr}%)`, 120+wlw+8, y+19);
  y += 44;

  rr(ctx, 24, y, W-48, 8, 4); ctx.fillStyle = C.cardL; ctx.fill();
  if (tot > 0) { const ww = Math.max(4, (data.wins/tot)*(W-48)); rr(ctx, 24, y, ww, 8, 4); ctx.fillStyle = C.grn; ctx.fill(); }
  y += 24;

  ctx.font = '400 12px "Inter", sans-serif'; ctx.fillStyle = C.mut;
  ctx.fillText("RECENT", 24, y+12);
  let fx = 80;
  for (const won of data.recentResults.slice(-5)) {
    rr(ctx, fx, y+2, 20, 14, 3); ctx.fillStyle = won ? C.grn+"30" : C.red+"30"; ctx.fill();
    ctx.font = '600 10px "Inter SemiBold", sans-serif'; ctx.fillStyle = won ? C.grn : C.red;
    ctx.fillText(won ? "W" : "L", fx+5, y+13); fx += 26;
  }

  ctx.font = '400 11px "Inter", sans-serif'; ctx.fillStyle = C.pri;
  ctx.fillText(data.platformUrl, 24, H-20);
  ctx.fillStyle = C.mut; ctx.textAlign = "right"; ctx.fillText("VCLoL", W-24, H-20); ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}
