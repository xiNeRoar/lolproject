import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminUsersTable,
  teamsTable,
  eventsTable,
  eventRegistrationsTable,
  matchesTable,
  vodEntriesTable,
  playersTable,
  seasonsTable,
  adminActionsTable,
} from "@workspace/db";
import { count, eq, desc } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../lib/auth";
import { isAdminAuthenticated } from "../lib/session";
import { requireAdmin } from "../middlewares/requireAdmin";
import "../lib/session";

const router = Router();

// POST /admin/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }

  const [admin] = await db
    .select()
    .from(adminUsersTable)
    .where(eq(adminUsersTable.email, email));

  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.adminId = admin.id;
  req.session.adminEmail = admin.email;
  res.json({ success: true, message: "Logged in" });
});

// POST /admin/logout
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /admin/me
router.get("/me", (req, res) => {
  if (isAdminAuthenticated(req)) {
    res.json({ authenticated: true, email: req.session.adminEmail });
  } else {
    res.status(401).json({ authenticated: false, error: "Not authenticated" });
  }
});

// GET /admin/stats — dashboard counters
router.get("/stats", requireAdmin, async (_req, res) => {
  const [teams] = await db.select({ count: count() }).from(teamsTable);
  const [players] = await db.select({ count: count() }).from(playersTable);
  const [events] = await db.select({ count: count() }).from(eventsTable);
  const [registrations] = await db.select({ count: count() }).from(eventRegistrationsTable);
  const [matches] = await db.select({ count: count() }).from(matchesTable);
  const [vods] = await db.select({ count: count() }).from(vodEntriesTable);
  const [seasons] = await db.select({ count: count() }).from(seasonsTable);

  res.json({
    teams: teams?.count ?? 0,
    players: players?.count ?? 0,
    events: events?.count ?? 0,
    registrations: registrations?.count ?? 0,
    matches: matches?.count ?? 0,
    vods: vods?.count ?? 0,
    seasons: seasons?.count ?? 0,
  });
});

export { hashPassword };

// GET /admin/actions — last 10 admin actions (Issue #35 / R10)
router.get("/actions", requireAdmin, async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(adminActionsTable)
      .orderBy(desc(adminActionsTable.createdAt))
      .limit(10);
    res.json(rows.map((r) => ({
      id: r.id,
      adminId: r.adminId,
      actionType: r.actionType,
      entityType: r.entityType,
      entityId: r.entityId ?? null,
      detail: r.detail ?? null,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    console.error("[admin]", err);
    res.status(500).json({ error: "Failed to fetch admin actions" });
  }
});

export default router;
