# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---








## Request: ELO concurrent update race condition — needs FOR UPDATE lock

**Needed for:** Data integrity
**Endpoint:** POST /api/matches (and /submit-rofl)
**Why:** `applyTeamElo()` does SELECT → calculate → UPDATE inside a transaction but without row-level locking. Two concurrent match submissions for the same team could read the same ELO value, calculate independently, and one update overwrites the other (lost update).
**Fix:** Add `FOR UPDATE` to the team SELECT queries inside `applyTeamElo()`: use Drizzle's `db.execute(sql\`SELECT ... FOR UPDATE\`)` or equivalent.
**File:** `artifacts/api-server/src/routes/matches.ts` lines 152-153

---

## Request: GET /players N+1 query performance

**Needed for:** Performance / scalability
**Endpoint:** GET /api/players
**Why:** Current implementation runs 2 DB queries per player (team lookup + stats). With 100 players = 200+ queries. Should use JOINs or subqueries to batch.
**Fix:** Rewrite to use a single query with LEFT JOINs or use `inArray` batch queries for teams and stats, then map in JS.
**File:** `artifacts/api-server/src/routes/players.ts` lines 205-245

---

## Request: DB schema out of sync — match_type column missing (P0)

**Needed for:** All API routes — entire website non-functional without this
**GitHub issue:** #221
**Why:** Drizzle ORM schema references `match_type` column on `matches` table, but it doesn't exist in the actual PostgreSQL database. Every query that touches the `matches` table fails with `column "match_type" does not exist`, causing all data-serving endpoints to return 500.
**Verified existing columns (via psql):** id, event_id, match_title, side_a_name, side_b_name, winner_name, score, format, vod_url, created_at, updated_at, season_id, is_playoff, round, bracket_slot, next_match_id, is_losers_bracket, group_id, game_id, result_source, team_a_id, team_b_id, team_a_elo_before, team_a_elo_after, team_b_elo_before, team_b_elo_after, game_duration, game_version, rofl_file_path, visible_after, best_of
**Fix:** Run `pnpm --filter @workspace/db run push` to sync Drizzle schema → DB. When prompted about `match_type`, select "create column" (not rename). There may be other missing columns on other tables — the push command will surface them all.
**File:** `lib/db/drizzle.config.ts` (push command), `lib/db/src/schema/` (schema source of truth)
