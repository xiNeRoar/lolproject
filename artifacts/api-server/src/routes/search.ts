/**
 * GET /api/search?q=term
 * Global search across teams, players, events, matches. Issues #21, #57.
 */
import { Router } from "express";
import { db } from "@workspace/db";
import { teamsTable, playersTable, eventsTable, matchesTable } from "@workspace/db";
import { ilike, or, eq, and } from "drizzle-orm";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const q = ((req.query.q as string) ?? "").trim();
    if (q.length < 2) {
      res.status(400).json({ error: "Search query must be at least 2 characters" });
      return;
    }
    const p = `%${q}%`;

    const [teams, players, events, matches] = await Promise.all([
      db.select({ id: teamsTable.id, name: teamsTable.name, tag: teamsTable.tag, teamElo: teamsTable.teamElo })
        .from(teamsTable).where(or(ilike(teamsTable.name, p), ilike(teamsTable.tag, p))).limit(5),
      db.select({ id: playersTable.id, riotId: playersTable.riotId, primaryRole: playersTable.primaryRole })
        .from(playersTable)
        .where(and(eq(playersTable.isActive, true), or(ilike(playersTable.riotId, p), ilike(playersTable.discordUsername, p))))
        .limit(5),
      db.select({ id: eventsTable.id, title: eventsTable.title, slug: eventsTable.slug, format: eventsTable.format })
        .from(eventsTable).where(ilike(eventsTable.title, p)).limit(5),
      db.select({
        id: matchesTable.id,
        sideAName: matchesTable.sideAName,
        sideBName: matchesTable.sideBName,
        matchTitle: matchesTable.matchTitle,
        score: matchesTable.score,
        winnerName: matchesTable.winnerName,
        createdAt: matchesTable.createdAt,
      })
        .from(matchesTable)
        .where(or(
          ilike(matchesTable.sideAName, p),
          ilike(matchesTable.sideBName, p),
          ilike(matchesTable.matchTitle, p),
        ))
        .limit(5),
    ]);

    res.json({
      teams:   teams.map(t => ({ type: "team",   id: t.id, name: t.name, tag: t.tag, teamElo: t.teamElo })),
      players: players.map(p => ({ type: "player", id: p.id, riotId: p.riotId, primaryRole: p.primaryRole ?? null })),
      events:  events.map(e => ({ type: "event",  id: e.id, title: e.title, slug: e.slug, format: e.format ?? null })),
      matches: matches.map(m => ({
        type:        "match",
        id:          m.id,
        sideAName:   m.sideAName,
        sideBName:   m.sideBName,
        matchTitle:  m.matchTitle,
        score:       m.score ?? null,
        winnerName:  m.winnerName,
        createdAt:   m.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[search]", err);
    res.status(500).json({ error: "Search failed" });
  }
});

export default router;
