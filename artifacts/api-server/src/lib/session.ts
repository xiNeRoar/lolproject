import type { Request } from "express";
import "express-session";

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminEmail?: string;
    playerId?: number;
    playerRiotId?: string;
    discordId?: string;
    discordUsername?: string;
    connectToken?: string;       // bot /connect flow: authSession token
    connectDiscordId?: string;   // bot /connect flow: who initiated
  }
}

export function isAdminAuthenticated(req: Request): boolean {
  return !!req.session?.adminId;
}
