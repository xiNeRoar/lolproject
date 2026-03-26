# Codebase Concerns

**Analysis Date:** 2026-03-26

## Tech Debt

**Hardcoded session secret fallback:**
- Issue: `artifacts/api-server/src/app.ts` line 37 falls back to `"vclol-admin-secret-2024"` when `SESSION_SECRET` env var is missing. If the env var is ever unset in production, all sessions are signed with a known, committed secret.
- Files: `artifacts/api-server/src/app.ts`
- Impact: Any attacker who reads the source can forge session cookies in production if the env var is missing.
- Fix approach: Remove the fallback. Throw on startup if `SESSION_SECRET` is not set when `NODE_ENV=production`.

**RSO tokens stored as plaintext in DB:**
- Issue: Schema comments say `rso_access_token` and `rso_refresh_token` are "encrypted, nullable" but no encryption/decryption logic exists anywhere in the codebase. Tokens are stored as raw text in `players.rso_access_token` and `players.rso_refresh_token`.
- Files: `lib/db/src/schema/players.ts` (lines 16-17), `artifacts/api-server/src/routes/auth.ts` (lines 261-262, 281-282)
- Impact: A database breach exposes all Riot OAuth tokens. Attackers can impersonate players on Riot APIs.
- Fix approach: Add AES-256-GCM encryption using a `RSO_ENCRYPTION_KEY` env var. Encrypt before insert, decrypt on read. Update `auth.ts` RSO callback and any code that reads these columns.

**CORS allows all origins:**
- Issue: `cors({ origin: true, credentials: true })` in `artifacts/api-server/src/app.ts` line 31 reflects any origin back, combined with `credentials: true`. This allows any website to make authenticated requests on behalf of logged-in users.
- Files: `artifacts/api-server/src/app.ts`
- Impact: Any malicious site can call admin or player API endpoints using the victim's session cookie.
- Fix approach: Restrict `origin` to `PLATFORM_URL` and localhost in development. Use an allowlist.

**submitRofl ELO applied to all match types (scrims included):**
- Issue: `artifacts/api-server/src/routes/submitRofl.ts` always calculates and applies ELO when both teams are identified (lines 233-240), regardless of `matchType`. The match is inserted with `matchType: "scrim"` (the default) but ELO is still computed. This violates the PRD rule: "Scrim (.rofl) does NOT count ELO."
- Files: `artifacts/api-server/src/routes/submitRofl.ts` (lines 233-240, 310-335)
- Impact: Every .rofl submitted via the HTTP fallback endpoint incorrectly adjusts team ELO ratings.
- Fix approach: Add an `eloEligible` guard matching the pattern in `artifacts/api-server/src/routes/matches.ts` line 403: only apply ELO when `matchType === "ranked_tournament" || matchType === "event"`. Since all submit-rofl matches are `resultSource: "rofl_parse"` and default to `matchType: "scrim"`, ELO should never be applied here.

**Bot matchRecorder also lacks FOR UPDATE locking:**
- Issue: The bot's `recordMatch()` in `artifacts/discord-bot/src/lib/matchRecorder.ts` reads then writes team W/L counters (lines 121-136) without row-level locking. The API-server `matches.ts` uses `FOR UPDATE` (line 209) for ELO but the bot path does not.
- Files: `artifacts/discord-bot/src/lib/matchRecorder.ts` (lines 119-137)
- Impact: Concurrent match submissions for the same team through the bot can lose W/L increments (read-compute-write race condition).
- Fix approach: Use `sql` template or `.for("update")` on the team SELECT inside the transaction, matching the pattern in `artifacts/api-server/src/routes/matches.ts` lines 205-214.

**GET /matches loads all matches into memory:**
- Issue: `artifacts/api-server/src/routes/matches.ts` line 271 does `SELECT *` from matches with no LIMIT, then applies filters in JavaScript (lines 283-307). As the match count grows, this loads the entire table on every request.
- Files: `artifacts/api-server/src/routes/matches.ts` (lines 263-349)
- Impact: Unbounded memory usage and query time. At hundreds of matches this is fine; at thousands it degrades.
- Fix approach: Push filters into SQL WHERE clauses. Add pagination (LIMIT/OFFSET or cursor-based). The teamB filter requires a self-join or subquery but is straightforward with Drizzle.

**N+1 query in GET /players:**
- Issue: `artifacts/api-server/src/routes/players.ts` lines 212-239 loops over all players and runs 2 queries per player (team membership + stats) via `Promise.all`. With N players, this is 2N+1 queries.
- Files: `artifacts/api-server/src/routes/players.ts` (lines 205-244)
- Impact: Slow response as player count grows. Each request generates dozens of DB queries.
- Fix approach: Use a single query with LEFT JOINs and GROUP BY, or batch queries with `inArray`.

**Duplicate match formatting code:**
- Issue: `formatMatch()` is defined separately in `matches.ts`, `teams.ts`, and inline in `submitRofl.ts` with slightly different field sets. Changes to the match response shape require updating multiple files.
- Files: `artifacts/api-server/src/routes/matches.ts` (line 68), `artifacts/api-server/src/routes/teams.ts` (line 47)
- Impact: Maintenance burden, risk of inconsistent API responses.
- Fix approach: Extract a shared `formatMatch` utility into `artifacts/api-server/src/lib/formatters.ts`.

## Security Considerations

**No OAuth state parameter:**
- Risk: Neither Discord nor RSO OAuth flows include a `state` parameter. This makes the flows vulnerable to CSRF login attacks where an attacker tricks a user into linking the attacker's Riot account.
- Files: `artifacts/api-server/src/routes/auth.ts` (lines 21-27 Discord, lines 133-139 RSO)
- Current mitigation: None.
- Recommendations: Generate a random `state` value, store it in the session, and verify it in the callback. This is standard OAuth 2.0 security.

**X-Discord-Id header is trivially spoofable:**
- Risk: `POST /api/matches/submit-rofl` authenticates via `X-Discord-Id` header (line 71). Any HTTP client can set this header to impersonate any Discord user.
- Files: `artifacts/api-server/src/routes/submitRofl.ts` (lines 71-75)
- Current mitigation: The endpoint also checks team membership, so a random Discord ID will fail. But a valid team member's Discord ID is public information.
- Recommendations: Use session-based auth (require login) or add an HMAC-signed token that the bot generates. The current approach assumes only the bot calls this endpoint, but it is publicly accessible.

**POST /replays has no authentication:**
- Risk: The `POST /replays` endpoint creates replay_submissions records with no auth check (no `requireAdmin`, no session check).
- Files: `artifacts/api-server/src/routes/replays.ts` (line 31)
- Current mitigation: Rate limiting at the API level (100 req/min).
- Recommendations: Add `requireAdmin` or a bot-specific auth token. Anyone can currently spam replay submission records.

**Match visibility bypass via playerId in request body:**
- Risk: `PUT /matches/:id/visibility` at line 791 falls back to `(req.body as any).playerId` for captain check when no session exists. An unauthenticated user can pass any captain's `playerId` in the request body to change match visibility.
- Files: `artifacts/api-server/src/routes/matches.ts` (line 791)
- Current mitigation: None.
- Recommendations: Remove `(req.body as any).playerId` fallback. Only use `req.session.playerId`. Require authentication.

**Session store defaults to in-memory:**
- Risk: `express-session` with no configured store uses MemoryStore, which leaks memory in production, loses sessions on restart, and does not work across multiple server instances.
- Files: `artifacts/api-server/src/app.ts` (lines 35-46)
- Current mitigation: Single-server deployment.
- Recommendations: Use `connect-pg-simple` or `connect-redis` for production session storage.

**No input validation on most route handlers:**
- Risk: Route handlers cast `req.body` to TypeScript types but perform minimal runtime validation. Fields like `matchTitle`, `riotId`, `email` accept any string without length limits or format checks. Zod schemas exist in `lib/api-zod/` but are not used in route handlers.
- Files: All route files in `artifacts/api-server/src/routes/`
- Current mitigation: Database constraints catch some invalid data (unique violations, NOT NULL).
- Recommendations: Use the existing Zod schemas (from `@workspace/api-zod`) as middleware validators. At minimum, validate string lengths and expected enum values.

## Performance Bottlenecks

**Player profile builds multiple sequential queries:**
- Problem: `buildPlayerProfile()` runs 5+ sequential queries (team memberships, member counts, aggregate stats, top champions, recent matches, VODs).
- Files: `artifacts/api-server/src/routes/players.ts` (lines 40-200)
- Cause: Each data section is fetched independently with separate round-trips.
- Improvement path: Use `Promise.all()` for independent queries (team memberships + aggregate stats + recent matches can run in parallel). Consider materialized views for aggregate stats.

**roflCleanup scheduler queries all matches with roflFilePath:**
- Problem: Daily cleanup scans all matches with a non-null `roflFilePath`, including already-cleaned ones.
- Files: `artifacts/api-server/src/schedulers/roflCleanup.ts` (lines 19-22)
- Cause: The WHERE clause checks `isNotNull(roflFilePath)` and `lt(createdAt, cutoff)`, but after cleanup sets `roflFilePath = null`, the match is excluded from future scans. This is actually fine.
- Improvement path: No action needed. The query is self-correcting.

## Fragile Areas

**Visibility logic duplicated across multiple locations:**
- Files: `artifacts/api-server/src/routes/matches.ts` (line 26 `isVisible()`), `artifacts/api-server/src/routes/vods.ts` (line 22 `isMatchPublic()`), `artifacts/api-server/src/routes/submitRofl.ts` (lines 243-248), `artifacts/discord-bot/src/lib/matchRecorder.ts` (lines 52-56)
- Why fragile: Visibility determination is implemented differently in each location. The `isVisible()` in matches.ts handles tournament/event defaults differently than `isMatchPublic()` in vods.ts. Changing visibility rules requires updating 4+ files.
- Safe modification: Extract a single `resolveVisibility(match)` function into a shared lib. All consumers should call the same function.
- Test coverage: No tests exist for visibility logic.

**submitRofl duplicates the bot's submit pipeline:**
- Files: `artifacts/api-server/src/routes/submitRofl.ts` (377 lines), `artifacts/discord-bot/src/commands/submit.ts` (337 lines), `artifacts/discord-bot/src/lib/matchRecorder.ts` (163 lines)
- Why fragile: The HTTP submit-rofl endpoint reimplements the same parse-match-record pipeline as the bot, including team matching, ban checks, ELO computation, and notifications. Changes to business logic must be applied in both places.
- Safe modification: The bot already extracted `matchRecorder.ts`. The API submitRofl should import and reuse the same shared logic from `@workspace/rofl-parse` and a shared recorder.
- Test coverage: Only `artifacts/discord-bot/src/lib/rofl-parser.test.ts` exists. No integration tests for the full pipeline.

## Test Coverage Gaps

**Only 1 test file in entire codebase:**
- What's not tested: All API routes, all bot commands, team matching, ELO calculation, badge system, notification poller, schedulers, OAuth flows, visibility logic, match recording pipeline.
- Files: Only `artifacts/discord-bot/src/lib/rofl-parser.test.ts` (254 lines) exists.
- Risk: Any refactor or feature change can silently break core functionality. The ELO bug in submitRofl (applying ELO to scrims) would have been caught by a test.
- Priority: High. At minimum, add tests for: ELO calculation (`lib/rofl-parse` calculateElo), match visibility logic, team matching, and the match recording transaction.

## Dependencies at Risk

**In-memory session store:**
- Risk: `express-session` default MemoryStore is explicitly documented as "not for production." Memory leaks over time.
- Impact: Server restarts lose all sessions. Memory grows unbounded.
- Migration plan: Add `connect-pg-simple` (already have PostgreSQL) as the session store.

## Missing Critical Features

**No RSO token refresh mechanism:**
- Problem: RSO access tokens and refresh tokens are stored but never refreshed. Access tokens expire (typically 2 hours). No background job or on-demand refresh exists.
- Blocks: Any feature that needs to call Riot APIs on behalf of players will fail after token expiry.

**No CSRF protection on state-mutating endpoints:**
- Problem: No CSRF tokens are used anywhere. Combined with `cors: { origin: true, credentials: true }`, any site can submit forms or XHR requests to admin/player endpoints.
- Blocks: Safe deployment of the admin panel and player self-service features.

---

*Concerns audit: 2026-03-26*
