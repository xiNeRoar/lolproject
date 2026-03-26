# Domain Pitfalls

**Domain:** 5v5 LoL scrim recording platform with RSO identity, privacy gates, schema sync
**Researched:** 2026-03-26
**Focus:** RSO OAuth integration, privacy-gated APIs, schema migration, N+1 queries

---

## Critical Pitfalls

Mistakes that cause security incidents, data loss, or require rewrites.

### Pitfall 1: RSO Access Tokens Expire in 10 Minutes — No Refresh Logic Exists

**What goes wrong:** RSO access tokens expire in ~600 seconds (10 minutes), dramatically shorter than Discord or Google OAuth (which last 1-7 days). The codebase stores `rso_access_token` and `rso_refresh_token` (auth.ts lines 261-262, 281-282) but never refreshes them. Any future feature that calls Riot APIs on behalf of users (e.g., fetching updated Riot IDs, verifying account status) will fail silently after 10 minutes.

**Why it happens:** Developers assume OAuth tokens last hours/days (Discord access tokens last 7 days). RSO's 600-second expiry is unusually aggressive and not prominently documented.

**Consequences:** (1) If you ever need to re-verify a player's PUUID or fetch updated account info, the stored token is dead. (2) RSO refresh tokens are single-use — using the old refresh token after Riot rotates it invalidates the chain entirely. (3) Storing stale tokens wastes DB space and creates false confidence.

**Prevention:**
- Implement a `refreshRsoToken(playerId)` utility that: reads the stored refresh token, calls `https://auth.riotgames.com/token` with `grant_type=refresh_token`, stores BOTH the new access token AND the new refresh token (Riot rotates refresh tokens on use), handles the case where the refresh token itself is expired/invalid (force re-auth).
- If no features currently need Riot API calls post-auth, do NOT store access tokens at all — only store the PUUID (the permanent identifier). Add refresh logic only when a feature needs it.
- **Recommendation for this project:** Since VCLoL only needs the PUUID (extracted at auth time), stop storing access/refresh tokens entirely. This eliminates the token management problem AND the plaintext token security concern from CONCERNS.md.

**Detection:** Grep for any code that reads `rsoAccessToken` or `rsoRefreshToken` after the initial OAuth callback. If nothing reads them, they are dead weight.

**Confidence:** HIGH (verified via official RSO docs, Henrik-3 RSO gist, and codebase inspection)

**Phase:** RSO OAuth implementation phase

---

### Pitfall 2: Missing OAuth State Parameter Enables Account Takeover

**What goes wrong:** Neither Discord nor RSO OAuth flows include a `state` parameter (auth.ts lines 20-28 for Discord, lines 133-139 for RSO). An attacker can: (1) start an RSO OAuth flow, (2) capture the callback URL with the authorization code, (3) trick a victim into visiting that callback URL. The victim's account gets linked to the attacker's Riot identity. In VCLoL's context, this means an attacker could link their Riot PUUID to someone else's Discord account, effectively impersonating them on the platform — directly violating the "zero impersonation tolerance" principle.

**Why it happens:** `state` is described as "RECOMMENDED" in RFC 6749, so developers skip it. Express session cookies provide CSRF protection for form submissions but NOT for OAuth redirects (the callback is a GET request initiated by the OAuth provider, not the user's browser submitting a form).

**Consequences:** Full account linking hijack. Attacker links their Riot account to victim's profile. All the victim's match history now shows attacker's identity. Violates Riot's RSO compliance requirements.

**Prevention:**
```typescript
// Before redirect to OAuth provider:
const state = crypto.randomBytes(32).toString('hex');
req.session.oauthState = state;
// Add state to OAuth URL params

// In callback:
if (req.query.state !== req.session.oauthState) {
  return res.status(403).json({ error: 'Invalid state parameter' });
}
delete req.session.oauthState;
```

**Detection:** Check if `state` appears in any OAuth redirect URL construction. Currently absent from all flows.

**Confidence:** HIGH (OWASP Top 10 2025 A01, Auth0 documentation, PortSwigger research)

**Phase:** RSO OAuth implementation phase (fix for both Discord and RSO simultaneously)

---

### Pitfall 3: Schema Push on Production Loses Data When Columns Are Renamed

**What goes wrong:** The project uses `drizzle-kit push` (not `generate` + `migrate`) for schema sync. Issue #221 documents that the `match_type` column is missing from the production database. When running `push`, Drizzle-kit will detect the schema-vs-DB mismatch and present options: "create column" vs "rename column." Selecting "rename" on the wrong column drops the existing column's data. With 21 tables and potentially multiple out-of-sync columns, one wrong selection destroys production data.

**Why it happens:** `push` is an interactive tool designed for development. It has no migration files, no version control, no rollback. The REQUESTS.md P0 issue notes "there may be other missing columns on other tables" — meaning the operator must make correct choices for an unknown number of prompts during push.

**Consequences:** Permanent data loss. No migration history means no rollback. The project has no database backups documented in DEPLOYMENT.md.

**Prevention:**
1. **Before push:** Take a `pg_dump` backup. Document this in DEPLOYMENT.md as a mandatory pre-migration step.
2. **Use `--strict --verbose` flags:** `drizzle-kit push --strict --verbose` shows all SQL before executing and requires explicit approval.
3. **Switch to `generate` + `migrate` for production:** Generate migration files, review the SQL, commit them, apply via `drizzle-kit migrate`. This creates an auditable migration history.
4. **For the immediate #221 fix:** Run push in a staging database first (clone prod, apply push, verify), then apply to production.

**Detection:** Check if `lib/db/drizzle/` contains any migration files. If empty, the project has no migration history.

**Confidence:** HIGH (Drizzle docs, codebase inspection showing push-only workflow, REQUESTS.md #221)

**Phase:** Schema sync phase (first thing to fix — everything else depends on a working schema)

---

### Pitfall 4: Visibility Logic Divergence — Active Bug Between matches.ts and vods.ts

**What goes wrong:** There are two different visibility algorithms in the codebase right now:
- `isVisible()` in matches.ts (line 26): Scrims with `visibleAfter = null` are **always private**. Tournament matches are **always public** unless explicitly privatized.
- `isMatchPublic()` in vods.ts (line 22): Matches with `visibleAfter = null` become public **after 7 days** (uses `createdAt + 7 days` fallback). Does not check `matchType` at all.

This means: a scrim match that a captain never made public will still have its VOD become publicly accessible after 7 days, violating the 3-layer privacy model (scrims default private, per PRD v3.1).

**Why it happens:** Visibility logic was implemented independently in 4+ locations (matches.ts, vods.ts, submitRofl.ts, matchRecorder.ts) without a shared function. Each developer interpreted the visibility rules slightly differently.

**Consequences:** Privacy breach. Scrim VODs leak after 7 days even when the match is supposed to be private. Violates Riot's data-sharing compliance requirements. Players who expected privacy lose trust.

**Prevention:**
1. Extract a single `resolveMatchVisibility(match): { isPublic: boolean, reason: string }` function into `artifacts/api-server/src/lib/visibility.ts`.
2. All consumers (matches.ts, vods.ts, submitRofl.ts, bot matchRecorder.ts) import and call this one function.
3. Add unit tests for visibility logic covering: scrim-null-visibleAfter (should be private), tournament-null-visibleAfter (should be public), captain-override-private, captain-override-public, time-gated scrims.

**Detection:** Search for `visibleAfter` across the codebase. Any file that implements its own date comparison is a divergence risk.

**Confidence:** HIGH (verified by reading both functions side-by-side in codebase)

**Phase:** Privacy gates phase (fix before adding any new privacy features)

---

### Pitfall 5: RSO Tokens Stored as Plaintext — DB Breach Exposes All Riot Identities

**What goes wrong:** Schema comments say `rso_access_token` and `rso_refresh_token` are "encrypted, nullable" but no encryption exists. Tokens are stored as raw text (players.ts lines 16-17, auth.ts lines 261-262). A database breach (SQL injection, leaked backup, compromised hosting) exposes every player's Riot OAuth tokens.

**Why it happens:** "Encrypt later" is a common pattern. The schema was designed with encryption in mind (the comments say so) but implementation was deferred.

**Consequences:** Attacker can impersonate any player on Riot APIs. Riot can revoke VCLoL's RSO production key for non-compliance. All linked players must be notified of the breach.

**Prevention:**
- **Best option (for this project):** Do not store tokens at all. VCLoL only needs the PUUID, which is obtained at auth time. Remove `rsoAccessToken` and `rsoRefreshToken` columns entirely. This eliminates the attack surface.
- **If tokens are needed later:** Implement AES-256-GCM encryption with a `RSO_ENCRYPTION_KEY` env var. Encrypt before DB write, decrypt on read. Never log tokens.

**Detection:** Query `SELECT count(*) FROM players WHERE rso_access_token IS NOT NULL`. If non-zero, plaintext tokens exist in production.

**Confidence:** HIGH (verified in codebase, CONCERNS.md documents this)

**Phase:** RSO OAuth implementation phase (fix during the same phase that implements RSO)

---

## Moderate Pitfalls

### Pitfall 6: N+1 Query in GET /players Will Degrade With Growth

**What goes wrong:** `GET /players` (players.ts lines 212-239) runs 2 queries per player inside `Promise.all(players.map(...))`. With 50 players = 101 queries. With 500 players = 1001 queries. PostgreSQL connection pool (default 10 connections) becomes saturated, causing timeouts for all other endpoints.

**Prevention:**
- Replace with a single query using LEFT JOINs:
```sql
SELECT p.*, tm.team_id, t.name, t.tag,
       COUNT(mp.id) as total_games,
       SUM(CASE WHEN mp.win THEN 1 ELSE 0 END) as wins
FROM players p
LEFT JOIN team_members tm ON tm.player_id = p.id AND tm.status = 'active'
LEFT JOIN teams t ON t.id = tm.team_id
LEFT JOIN match_players mp ON mp.player_id = p.id
GROUP BY p.id, tm.team_id, t.name, t.tag
ORDER BY p.riot_id
```
- Or use Drizzle's `inArray` for batch queries: fetch all players, collect IDs, fetch all team memberships and stats in 2 batch queries, then join in JS.
- Add pagination (`LIMIT 50 OFFSET 0`) regardless of approach.

**Detection:** Monitor query count per request. Any endpoint generating >10 queries per request is suspect.

**Confidence:** HIGH (verified in codebase, documented in REQUESTS.md and CONCERNS.md)

**Phase:** Performance/schema sync phase

---

### Pitfall 7: CORS Allows All Origins With Credentials — Session Hijacking

**What goes wrong:** `cors({ origin: true, credentials: true })` in app.ts line 31 reflects any origin. Combined with cookie-based sessions, any malicious website can make authenticated requests to VCLoL's API on behalf of a logged-in user.

**Prevention:**
```typescript
const allowedOrigins = [
  process.env.PLATFORM_URL || 'http://localhost:5173',
  // add other trusted origins
];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('CORS blocked'));
  },
  credentials: true,
}));
```

**Detection:** `curl -H "Origin: https://evil.com" https://your-api/auth/me -v` and check if `Access-Control-Allow-Origin: https://evil.com` appears in response.

**Confidence:** HIGH (verified in codebase, CONCERNS.md documents this)

**Phase:** RSO OAuth phase (fix alongside other auth hardening)

---

### Pitfall 8: Match Visibility Bypass via Request Body playerId

**What goes wrong:** `PUT /matches/:id/visibility` (matches.ts line 791) falls back to `(req.body as any).playerId` when no session exists. An unauthenticated attacker can pass any captain's playerId in the request body to change match visibility.

**Prevention:** Remove the `req.body.playerId` fallback. Only use `req.session.playerId`. Require authentication middleware on this route.

**Detection:** Test: send `PUT /matches/1/visibility` with `{"playerId": 1, "visibility": "public"}` and no session cookie. If it succeeds, the bypass works.

**Confidence:** HIGH (verified in codebase, CONCERNS.md documents this)

**Phase:** Privacy gates phase

---

### Pitfall 9: In-Memory Session Store Loses All Sessions on Restart

**What goes wrong:** Express-session defaults to MemoryStore. Every server restart (including Portainer container restarts, which happen on every deploy per DEPLOYMENT.md) logs out all users. MemoryStore also leaks memory over time.

**Prevention:** Add `connect-pg-simple` as the session store (PostgreSQL is already available):
```typescript
import pgSession from 'connect-pg-simple';
const PgStore = pgSession(session);
app.use(session({
  store: new PgStore({ pool: pgPool, tableName: 'sessions' }),
  // ...existing config
}));
```

**Detection:** Restart the server and check if previously logged-in users remain authenticated. If not, sessions are in-memory.

**Confidence:** HIGH (verified in codebase, CONCERNS.md documents this)

**Phase:** RSO OAuth phase (sessions must be persistent before RSO launch)

---

### Pitfall 10: Hardcoded Session Secret Fallback

**What goes wrong:** `app.ts` line 37 falls back to `"vclol-admin-secret-2024"` when `SESSION_SECRET` env var is missing. This string is committed to the repository. If the env var is ever unset in production, any attacker who reads the source code can forge valid session cookies, gaining admin access.

**Prevention:** Remove the fallback. Throw on startup if `SESSION_SECRET` is not set when `NODE_ENV=production`:
```typescript
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('SESSION_SECRET must be set in production');
}
```

**Detection:** Grep for the hardcoded string in the codebase. If it exists, this is exploitable.

**Confidence:** HIGH (verified in codebase)

**Phase:** RSO OAuth phase (security hardening)

---

## Minor Pitfalls

### Pitfall 11: RSO Redirect URI Must Exactly Match Riot's Registered URL

**What goes wrong:** Riot RSO requires exact redirect URI matching (including trailing slashes, protocol, port). The codebase defaults to `http://localhost:3000/auth/rso/callback` (auth.ts line 16). If the production URL differs by even one character from what is registered in the Riot Developer Portal, the OAuth flow silently fails.

**Prevention:** Set `RSO_REDIRECT_URI` in production env vars. Verify it matches the Riot Developer Portal registration character-for-character. Use HTTPS in production (Riot requires it).

**Confidence:** HIGH (RSO documentation)

**Phase:** RSO OAuth phase

---

### Pitfall 12: Player Deduplication During RSO Linking — Triple Lookup Race

**What goes wrong:** The RSO callback (auth.ts lines 229-251) searches for existing players in 3 steps: by PUUID, then by discordId, then by riotId. If two players share a riotId (possible if a player changed their Riot name and another took it), the wrong player gets linked. Additionally, concurrent RSO callbacks for the same player (e.g., double-clicking the connect button) can create duplicate player records.

**Prevention:**
1. Add a unique constraint on `puuid` column (it is currently nullable without a unique constraint — riotId has unique, but puuid does not).
2. Wrap the find-or-create logic in a transaction with a row lock.
3. Prefer PUUID over riotId for matching (PUUID is immutable, riotId can change).

**Detection:** `SELECT puuid, count(*) FROM players WHERE puuid IS NOT NULL GROUP BY puuid HAVING count(*) > 1` — if any rows return, duplicates exist.

**Confidence:** MEDIUM (logic analysis of auth.ts, riotId name changes are documented by Riot)

**Phase:** RSO OAuth phase

---

### Pitfall 13: OpenAPI Spec Drift From Actual Routes

**What goes wrong:** PROJECT.md notes "OpenAPI spec alignment (auth endpoints mismatch actual routes)." When the OpenAPI spec diverges from actual Express routes, the generated React hooks (`lib/api-client-react/`) make requests to non-existent endpoints. Frontend developers (Replit) get 404s and waste time debugging.

**Prevention:**
1. After any route change, update `lib/api-spec/openapi.yaml` and run `pnpm run codegen`.
2. Add a CI check that compares registered Express routes against OpenAPI paths.

**Confidence:** HIGH (documented in PROJECT.md Active requirements)

**Phase:** Schema sync phase

---

### Pitfall 14: ELO Applied to Scrims via HTTP Submit Endpoint

**What goes wrong:** `submitRofl.ts` lines 233-240 compute and apply ELO for all matches where both teams are identified, regardless of `matchType`. Since all .rofl submissions default to `matchType: "scrim"`, every scrim incorrectly adjusts team ELO ratings. The bot path has the correct guard; the HTTP path does not.

**Prevention:** Add guard: `if (matchType === "ranked_tournament" || matchType === "event")` before ELO computation in submitRofl.ts, matching the pattern in matches.ts line 403.

**Detection:** Check `elo_history` table for entries where the linked match has `match_type = 'scrim'`. Any such entries are incorrect.

**Confidence:** HIGH (verified in codebase, CONCERNS.md documents this)

**Phase:** Schema sync phase (fix alongside match_type column sync)

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Priority |
|-------------|---------------|------------|----------|
| Schema sync (#221) | Data loss from `push` rename prompt | Backup first, use `--strict --verbose`, switch to `generate`+`migrate` | P0 |
| Schema sync | ELO applied to scrims (submitRofl) | Add matchType guard before ELO computation | P0 |
| RSO OAuth | Missing state parameter = account takeover | Add cryptographic state to both Discord and RSO flows | P0 |
| RSO OAuth | 10-minute token expiry, no refresh logic | Do not store tokens — only store PUUID | P1 |
| RSO OAuth | Plaintext token storage | Remove token columns or encrypt with AES-256-GCM | P1 |
| RSO OAuth | Redirect URI mismatch with Riot portal | Verify exact match before going live | P1 |
| Privacy gates | Visibility logic divergence (matches vs vods) | Extract shared `resolveMatchVisibility()` function | P0 |
| Privacy gates | Visibility bypass via body playerId | Remove fallback, require session auth | P0 |
| Privacy gates | CORS allows all origins | Restrict to PLATFORM_URL allowlist | P1 |
| Auth infrastructure | In-memory session store | Add `connect-pg-simple` before RSO launch | P1 |
| Auth infrastructure | Hardcoded session secret | Remove fallback, throw in production | P1 |
| N+1 performance | GET /players saturates connection pool | Rewrite with JOINs or batch queries | P2 |
| OpenAPI alignment | Generated hooks hit wrong endpoints | Update spec + codegen after route changes | P2 |

---

## Sources

- [RSO OAuth Implementation Details (Henrik-3 Gist)](https://gist.github.com/Henrik-3/d6b631fb7c61821bc16b17cd347a3811) — RSO token expiry, refresh behavior, scopes
- [Riot RSO Official Page](https://support-developer.riotgames.com/hc/en-us/articles/22897607341075-OAuth-Client-Documentation) — Production requirements (403 on fetch but search confirms requirements)
- [Auth0: Prevent CSRF in OAuth](https://auth0.com/blog/prevent-csrf-attacks-in-oauth-2-implementations/) — State parameter necessity
- [OWASP Top 10 2025 A01: Broken Access Control](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/) — Authorization bypass patterns
- [Drizzle ORM Push Documentation](https://orm.drizzle.team/docs/drizzle-kit-push) — Push vs generate+migrate tradeoffs
- [Drizzle ORM Migrations Documentation](https://orm.drizzle.team/docs/migrations) — Migration best practices
- Codebase inspection: `auth.ts`, `matches.ts`, `vods.ts`, `players.ts`, `app.ts`, `submitRofl.ts`
- `.planning/codebase/CONCERNS.md` — Pre-existing concern documentation
