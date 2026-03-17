import { Router } from "express";
import { db } from "@workspace/db";
import { adminUsersTable, interestSubmissionsTable, eventsTable, eventRegistrationsTable, matchesTable, vodEntriesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import { isAdminAuthenticated } from "../lib/session";
import { requireAdmin } from "../middlewares/requireAdmin";
import "../lib/session";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [admin] = await db.select().from(adminUsersTable).where(eq(adminUsersTable.email, email));

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  res.json({ success: true, message: "Logged in" });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

router.get("/me", (req, res) => {
  if (isAdminAuthenticated(req)) {
    res.json({ authenticated: true, email: req.session.adminEmail });
  } else {
    res.status(401).json({ authenticated: false, error: "Not authenticated" });
  }
});

router.get("/stats", requireAdmin, async (_req, res) => {
  const [interests] = await db.select({ count: count() }).from(interestSubmissionsTable);
  const [events] = await db.select({ count: count() }).from(eventsTable);
  const [registrations] = await db.select({ count: count() }).from(eventRegistrationsTable);
  const [matches] = await db.select({ count: count() }).from(matchesTable);
  const [vods] = await db.select({ count: count() }).from(vodEntriesTable);

  res.json({
    interests: interests?.count ?? 0,
    events: events?.count ?? 0,
    registrations: registrations?.count ?? 0,
    matches: matches?.count ?? 0,
    vods: vods?.count ?? 0,
  });
});

export { hashPassword };
export default router;
