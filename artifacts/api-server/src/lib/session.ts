import type { Request } from "express";
import "express-session";

declare module "express-session" {
  interface SessionData {
    adminId?: number;
    adminEmail?: string;
  }
}

export function isAdminAuthenticated(req: Request): boolean {
  return !!req.session?.adminId;
}
