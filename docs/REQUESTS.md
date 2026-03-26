# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: ELO guard — POST /matches must check matchType before applying ELO

**Needed for:** PRD §8 compliance
**Endpoint:** POST /api/matches
**Why:** `applyTeamElo()` is called whenever `teamAId && teamBId`, regardless of `matchType`. PRD §8: "Scrim (.rofl) does NOT count ELO. ELO only for Tournament Code + Event matches." Admin-created scrim matches currently modify team ELO incorrectly.
**Fix:** Add guard: only call `applyTeamElo()` when `matchType === "ranked_tournament" || matchType === "event"`. Scrim matches should still update `wins/losses` but NOT `teamElo/peakElo/eloHistory`.
**File:** `artifacts/api-server/src/routes/matches.ts` line 385

---

## Request: profileVisibility null fallback must be "private" not "public"

**Needed for:** PRD §7 compliance (privacy-by-default)
**Endpoint:** GET /api/players/:riotId, GET /api/players (list)
**Why:** `formatPlayer()` line 31 uses `p.profileVisibility ?? "public"` and privacy gate line 394 uses `(player.profileVisibility ?? "public") === "private"`. Schema default is "private" per PRD v3.1, but if the column is ever null, the formatter/gate treats it as "public" — exposing player data that should be hidden.
**Fix:** Change all `?? "public"` fallbacks to `?? "private"` in `formatPlayer()` and the privacy gate in GET /:riotId.
**File:** `artifacts/api-server/src/routes/players.ts` lines 31, 394

---

## Request: participants-only visibility not accepted or handled

**Needed for:** PRD §7 Layer 2
**Endpoint:** PUT /api/players/:id/profile, GET /api/players/:riotId
**Why:** PRD defines three visibility levels: `public / private / participants-only`. But PUT profile (line 518) only accepts "public" or "private". GET /:riotId privacy gate only checks `=== "private"` — a player set to "participants-only" would be treated as public.
**Fix:** (1) Accept "participants-only" in PUT profile validation. (2) In GET /:riotId, handle "participants-only" by checking if the requesting player shares any match with the target player (via match_players table).
**File:** `artifacts/api-server/src/routes/players.ts` lines 518, 394-416

---

## Request: Badge thresholds don't match PRD

**Needed for:** PRD §8 Badges table
**Endpoint:** Internal — `badges.ts`
**Why:** PRD §8 says Win Streak badge = 5+ consecutive wins, Veteran badge = 50+ matches. Current code: win_streak threshold = 3 (line 87), veteran threshold = 20 (line 82).
**Fix:** Change `win_streak` check from `totalGames >= 3` + `lastThree` to `totalGames >= 5` + `lastFive.every(e => e.win)`. Change `veteran` check from `totalGames >= 20` to `totalGames >= 50`.
**File:** `artifacts/api-server/src/lib/badges.ts` lines 82-92

---

## Request: Player search must respect rsoOptIn gate

**Needed for:** PRD §7 Layer 2
**Endpoint:** GET /api/search?q=
**Why:** PRD says non-opted-in players should not be searchable. Current search.ts returns all active players matching the query — no `rsoOptIn` check. A player who hasn't opted in can still be found by anyone.
**Fix:** Add `eq(playersTable.rsoOptIn, true)` to the player search WHERE clause.
**File:** `artifacts/api-server/src/routes/search.ts` line 26

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
