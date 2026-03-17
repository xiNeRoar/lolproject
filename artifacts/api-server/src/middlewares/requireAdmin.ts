import type { Request, Response, NextFunction } from "express";
import { isAdminAuthenticated } from "../lib/session";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!isAdminAuthenticated(req)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
