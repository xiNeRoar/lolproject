# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---




## Request: Badge thresholds don't match PRD

**Needed for:** PRD §8 Badges table
**Endpoint:** Internal — `badges.ts`
**Why:** PRD §8 says Win Streak badge = 5+ consecutive wins, Veteran badge = 50+ matches. Current code: win_streak threshold = 3 (line 87), veteran threshold = 20 (line 82).
**Fix:** Change `win_streak` check from `totalGames >= 3` + `lastThree` to `totalGames >= 5` + `lastFive.every(e => e.win)`. Change `veteran` check from `totalGames >= 20` to `totalGames >= 50`.
**File:** `artifacts/api-server/src/lib/badges.ts` lines 82-92

---


## Request: RSO OAuth routes (launch requirement)

**Needed for:** PRD §5, §11 — RSO is a launch requirement
**Endpoint:** New routes needed
**Why:** `auth.ts` only implements Discord OAuth. RSO OAuth flow is completely missing. PRD says every profile claim requires RSO verification. The `authSessions` table exists but has no corresponding routes. `/connect` bot command generates a token but there's no website endpoint to handle the RSO redirect.
**What's needed:**
1. GET /auth/rso — initiate RSO OAuth (redirect to auth.riotgames.com)
2. GET /auth/rso/callback — exchange code, verify PUUID, update player record (set puuid, rsoOptIn=true, rsoLinkedAt, rsoAccessToken, rsoRefreshToken)
3. GET /auth/connect/:token — handle bot `/connect` flow (validate authSession token, then redirect to RSO)
4. POST /auth/rso/refresh — refresh RSO tokens
**Note:** Pre-launch, these can return placeholder responses until Riot approves the application (PRD §11: "RSO button shows pending Riot approval").
**File:** `artifacts/api-server/src/routes/auth.ts` (expand existing)

---

## Request: Tournament/event matches should be public by default

**Needed for:** PRD §7 Layer 3
**Endpoint:** GET /api/matches/:id
**Why:** `isVisible()` only checks `visibleAfter` timestamp. PRD §7 Layer 3: "All tournament match data public by default." A tournament match with a future `visibleAfter` date would incorrectly be gated.
**Fix:** In `isVisible()`, also check `matchType`: if `matchType === "ranked_tournament" || matchType === "event"`, return `true` regardless of `visibleAfter` (unless captain explicitly overrode to private).
**File:** `artifacts/api-server/src/routes/matches.ts` lines 26-32

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
