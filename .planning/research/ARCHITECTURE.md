# Architecture Patterns

**Domain:** RSO OAuth, privacy middleware, and career aggregation for VCLoL
**Researched:** 2026-03-26

## Recommended Architecture

The milestone adds three capabilities to an existing Express + Drizzle + React stack. Each maps to a distinct architectural component that integrates at a specific layer.

```
                  React SPA (Replit owns)
                       |
              Generated React Query hooks
                       |
                  OpenAPI spec
                       |
            +----- Express API ------+
            |          |             |
     Auth Routes   Privacy MW   Career Routes
     (RSO OAuth)   (per-route)  (aggregation)
            |          |             |
            +------ Drizzle --------+
                       |
                  PostgreSQL
```

### Component Boundaries

| Component | Responsibility | Communicates With | Files |
|-----------|---------------|-------------------|-------|
| RSO Auth Routes | OAuth redirect/callback, token exchange, player linking, session upgrade | Riot Auth API, `auth_sessions` table, `players` table, Express session | `routes/auth.ts` (existing, extend) |
| Privacy Middleware | Determine viewer access level for any resource, strip fields from response | Session (playerId, adminId), `team_members` table, `match_players` table | NEW `lib/privacyGate.ts` + inline in routes |
| Career Aggregation | Per-team W/L, KDA, champion pool broken down by team tenure | `match_players` + `matches` + `team_members` tables | NEW `lib/careerStats.ts` + `routes/players.ts` (extend) |
| RSO Token Encryption | Encrypt/decrypt RSO tokens at rest | Node crypto, env-based key | NEW `lib/rsoTokens.ts` |

### Data Flow

**RSO Connect (Bot-initiated):**
```
Discord /connect -> bot generates token -> auth_sessions row
Player clicks URL -> GET /api/auth/connect/:token
  -> validate token (not expired, not used)
  -> store connectToken + connectDiscordId in Express session
  -> redirect to Riot auth.riotgames.com/authorize
Riot callback -> GET /api/auth/rso/callback
  -> exchange code for access_token via Riot token endpoint
  -> fetch PUUID from Riot Account API
  -> find-or-create player (PUUID match -> discordId match -> riotId match -> create)
  -> update player: puuid, rsoOptIn=true, encrypted tokens, rsoLinkedAt
  -> mark auth_session completed
  -> set session.playerId
  -> redirect to frontend /connect?success=true
```

**RSO Connect (Website-initiated):**
```
Player logged in via Discord OAuth (session.playerId or session.discordId exists)
  -> GET /api/auth/rso
  -> redirect to Riot auth.riotgames.com/authorize
  -> same callback flow as above, but no connectToken in session
```

**Privacy-gated match detail:**
```
GET /api/matches/:id
  -> load match from DB
  -> determine match type (scrim vs tournament/event)
  -> isVisible(match) checks visibleAfter + matchType rules
  -> if not visible:
       check session.playerId -> isMemberOfMatch() via team_members
  -> canSeeStats = admin || visible || memberAccess
  -> if canSeeStats: return full match + matchPlayers + vods
  -> else: return redacted (Team A vs B, score, _private: true, no player stats)
```

**Privacy-gated player profile:**
```
GET /api/players/:riotId
  -> load player
  -> check profileVisibility (public/private/participants-only)
  -> isOwner = session.playerId === player.id
  -> isAdmin = !!session.adminId
  -> public: full profile
  -> private + not owner + not admin: redacted (id, riotId, teams only)
  -> participants-only: check shared matches via match_players subquery
```

**Career resume aggregation:**
```
GET /api/players/:riotId (or /players/by-id/:id)
  -> buildPlayerProfile() already aggregates:
     - team memberships (join team_members + teams)
     - aggregate stats (count, wins, avgKills, etc from match_players)
     - top champions (group by champion from match_players)
     - recent matches (last 10 from match_players + matches)
     - vods
  -> MISSING: per-team breakdown (W/L + KDA scoped to each team tenure)
  -> MISSING: rsoOptIn filtering on player list endpoint
```

## Patterns to Follow

### Pattern 1: Route-level Privacy Gate (existing pattern)

The codebase already has two distinct privacy gate implementations inline in route handlers. This is the established pattern - do not introduce a standalone middleware that wraps all routes.

**What:** Privacy checks inline in each route handler, using `isVisible()` helper + `isMemberOfMatch()` for matches, and `profileVisibility` field check for players.

**When:** Any endpoint that returns potentially private data.

**Why this pattern (not middleware):** Each resource has different privacy rules. Matches use `visibleAfter` + `matchType`. Players use `profileVisibility` + `rsoOptIn`. A generic middleware would need to know which resource type it is protecting, making it more complex than inline checks. The existing pattern is correct.

**Example (existing, from matches.ts):**
```typescript
const isAdmin = !!req.session.adminId;
const visible = isVisible(match);
const pid = req.session.playerId ? Number(req.session.playerId) : null;
const memberAccess = (!visible && !isAdmin && pid)
  ? await isMemberOfMatch(pid, match) : false;
const canSeeStats = isAdmin || visible || memberAccess;

if (!canSeeStats) {
  res.json({ ...base, matchPlayers: [], vods: [], _private: true });
  return;
}
```

### Pattern 2: Extract Shared Privacy Helpers (new)

**What:** Move `isVisible()`, `isMemberOfMatch()`, and a new `canViewPlayerProfile()` into a shared `lib/privacyGate.ts` module. Routes import these helpers but still apply them inline.

**When:** Privacy logic is needed in more than one route file (matches.ts already uses it, players.ts has its own inline version, and the player list endpoint needs rsoOptIn filtering).

**Example:**
```typescript
// lib/privacyGate.ts
export function isMatchVisible(match: Match): boolean { /* existing logic */ }
export async function isMemberOfMatch(playerId: number, match: Match): Promise<boolean> { /* existing logic */ }
export function canViewFullProfile(player: Player, session: SessionData): boolean | "participants-only" { /* new */ }
export function redactPlayerForList(player: Player): RedactedPlayer { /* new */ }
```

### Pattern 3: Aggregation Query Module (new)

**What:** Extract career stats aggregation from `buildPlayerProfile()` into a dedicated `lib/careerStats.ts` that returns per-team breakdowns.

**When:** Career resume needs per-team W/L + KDA, which requires joining match_players with team_members to scope stats to each team's membership period.

**Example:**
```typescript
// lib/careerStats.ts
export async function getCareerByTeam(playerId: number): Promise<TeamCareerStats[]> {
  // For each team membership, aggregate match_players rows
  // where the match falls within the membership period
  // Returns: [{ teamId, teamName, wins, losses, avgKills, avgDeaths, avgAssists, topChampions }]
}
```

### Pattern 4: RSO Token Encryption at Rest

**What:** Encrypt RSO access/refresh tokens before storing in `players` table, decrypt on read.

**When:** Always. RSO tokens grant access to Riot account data. Storing plaintext is a security risk and likely violates Riot's RSO terms.

**Example:**
```typescript
// lib/rsoTokens.ts
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const KEY = Buffer.from(process.env.RSO_ENCRYPTION_KEY!, "hex"); // 32 bytes
const ALGORITHM = "aes-256-gcm";

export function encryptToken(plaintext: string): string { /* iv + ciphertext + authTag, base64 */ }
export function decryptToken(encrypted: string): string { /* reverse */ }
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Generic Privacy Middleware for All /api/* Routes

**What:** A single Express middleware that intercepts all responses and strips fields based on auth.

**Why bad:** Different resources have completely different privacy rules. Matches use time-based visibility + matchType. Players use profileVisibility + rsoOptIn. A generic approach would need a registry of "which fields to strip for which resource under which conditions" -- more complex than inline checks and harder to debug.

**Instead:** Keep privacy logic inline in route handlers, but extract shared helper functions to `lib/privacyGate.ts`.

### Anti-Pattern 2: N+1 Queries in Player List

**What:** The current `GET /players` endpoint runs 2 queries per player (team lookup + stats aggregation) inside `Promise.all(players.map(...))`.

**Why bad:** For 100 players, this fires 200+ queries. Issue #217 already tracks this.

**Instead:** Use batch queries with `inArray()` and `groupBy()`:
```typescript
// One query for all player team memberships
const allMembers = await db
  .select({ playerId, teamId, teamName, teamTag })
  .from(teamMembersTable)
  .innerJoin(teamsTable, ...)
  .where(inArray(teamMembersTable.playerId, playerIds));

// One query for all player stats
const allStats = await db
  .select({ playerId, totalGames: count(), wins: sum(...) })
  .from(matchPlayersTable)
  .where(inArray(matchPlayersTable.playerId, playerIds))
  .groupBy(matchPlayersTable.playerId);
```

### Anti-Pattern 3: Leaking RSO Status in Public Responses

**What:** Including `rsoOptIn`, `rsoLinkedAt`, or token fields in player API responses.

**Why bad:** Exposes which players have RSO linked, which is sensitive metadata. `rsoAccessToken`/`rsoRefreshToken` must never be in any API response.

**Instead:** Never include RSO token fields in `formatPlayer()`. Only expose `rsoOptIn` to the player themselves (self-profile) and admins. For public endpoints, the effect of rsoOptIn is visibility filtering (non-opted players don't appear in search), not a displayed field.

## Integration Points with Existing Code

### Where RSO Routes Fit

RSO OAuth routes **already exist** in `artifacts/api-server/src/routes/auth.ts` (lines 94-308). The implementation is complete and handles both bot-initiated (`/connect/:token`) and website-initiated (`/rso`) flows. What remains:

1. **RSO token encryption** -- currently stored plaintext. Add `lib/rsoTokens.ts` and wrap encrypt/decrypt around the token storage in the RSO callback.
2. **Frontend `/connect` page** -- Replit's responsibility. The backend redirects to `PLATFORM_URL/connect?success=true` or `?error=...` which the frontend must handle.
3. **`/auth/me` enhancement** -- add `rsoLinked: boolean` field so the frontend can prompt RSO connection.
4. **Session store upgrade** -- currently in-memory (`express-session` default). For production with RSO, consider `connect-pg-simple` to persist sessions across restarts. Not blocking but recommended.

### Privacy Middleware Placement

No new middleware to add to the Express pipeline. Instead:

1. **Extract helpers** from `routes/matches.ts` (lines 26-63) into `lib/privacyGate.ts`
2. **Update `GET /players`** to filter out players where `rsoOptIn = false` for non-admin viewers (PRD requirement: "Player search filter by rsoOptIn")
3. **Update `GET /players/:riotId`** -- privacy gate already exists (lines 391-434 of players.ts). Verify it matches PRD v3.1 Layer 2 rules exactly.
4. **Update match list** (`GET /matches`) -- currently returns ALL matches including private scrims. Should filter: non-admin non-participant viewers should only see `isVisible()` matches in the list, or see redacted entries.

### Query Optimization for Career Aggregation

The `buildPlayerProfile()` function (players.ts lines 40-199) runs 5 sequential queries. For career resume with per-team breakdown, restructure to:

1. **Batch the team membership + stats in one query** using a CTE or subquery that joins match_players with team_members on teamId matching match.teamAId or match.teamBId.
2. **Per-team career query:**
```sql
SELECT
  tm.team_id,
  t.name as team_name,
  COUNT(mp.id) as games,
  SUM(CASE WHEN mp.win THEN 1 ELSE 0 END) as wins,
  AVG(mp.kills) as avg_kills,
  AVG(mp.deaths) as avg_deaths,
  AVG(mp.assists) as avg_assists
FROM match_players mp
JOIN matches m ON mp.match_id = m.id
JOIN team_members tm ON tm.player_id = mp.player_id
  AND (tm.team_id = m.team_a_id OR tm.team_id = m.team_b_id)
JOIN teams t ON t.id = tm.team_id
WHERE mp.player_id = $1
GROUP BY tm.team_id, t.name
```
3. **Index recommendation:** Add composite index on `match_players(player_id, match_id)` if not already present, and `team_members(player_id, team_id)` for the career join.

## Build Order (Dependencies Between Components)

Components should be built in this order due to dependencies:

```
1. RSO Token Encryption (lib/rsoTokens.ts)
   |-- no dependencies, pure utility
   |
2. Privacy Gate Helpers (lib/privacyGate.ts)
   |-- extracts from existing code, no new dependencies
   |
3. RSO Auth Hardening (update routes/auth.ts)
   |-- depends on: RSO Token Encryption
   |-- update /auth/me to expose rsoLinked status
   |
4. Player List Privacy (update routes/players.ts GET /)
   |-- depends on: Privacy Gate Helpers
   |-- filter by rsoOptIn for non-admin
   |-- fix N+1 query (#217) at the same time
   |
5. Match List Privacy (update routes/matches.ts GET /)
   |-- depends on: Privacy Gate Helpers
   |-- filter or redact private scrims for non-participants
   |
6. Career Stats Module (lib/careerStats.ts)
   |-- depends on: nothing new, but benefits from batch query patterns
   |
7. Player Profile Career Resume (update routes/players.ts buildPlayerProfile)
   |-- depends on: Career Stats Module, Privacy Gate Helpers
   |-- per-team W/L + KDA breakdown
   |-- remove ELO trajectory (players have no individual ELO)
   |
8. OpenAPI Spec Update (lib/api-spec/openapi.yaml)
   |-- depends on: all route changes finalized
   |-- update response schemas for privacy-gated responses
   |-- add rsoLinked to /auth/me response
   |-- run codegen to regenerate frontend hooks
```

**Parallel tracks:** Steps 1-2 are independent and can be done simultaneously. Steps 3-5 can proceed in parallel after 1-2. Steps 6-7 are a separate track. Step 8 must come last.

**Critical path:** 1 -> 3 -> 8 (RSO hardening blocks spec update). 2 -> 4+5 -> 8 (privacy gates block spec update). 6 -> 7 -> 8 (career stats block spec update).

## Scalability Considerations

| Concern | Current (< 100 players) | At 1K players | At 10K players |
|---------|------------------------|---------------|----------------|
| Player list N+1 | Slow but tolerable (~200 queries) | Unacceptable (2K queries) | Broken |
| Career aggregation | Inline in profile, fast | Add per-team query, still fast | Need materialized view or cache |
| Session store | In-memory, fine | In-memory, risk of memory leak | Must use connect-pg-simple |
| Privacy checks | Inline, negligible cost | Inline, negligible cost | Inline, negligible cost |
| Match list filtering | In-memory filter, loads all matches | Pagination needed | Must push filters to SQL WHERE |

**Immediate action items (this milestone):**
- Fix N+1 on player list (Issue #217 already tracked)
- Add pagination to match list (not tracked, but needed soon)
- Session store can stay in-memory for now (< 100 users at launch)

## Sources

- Existing codebase: `artifacts/api-server/src/routes/auth.ts` (RSO OAuth implementation, 331 lines)
- Existing codebase: `artifacts/api-server/src/routes/matches.ts` (visibility gate implementation)
- Existing codebase: `artifacts/api-server/src/routes/players.ts` (privacy gate + profile aggregation)
- Existing codebase: `artifacts/api-server/src/lib/session.ts` (session type augmentation)
- Existing codebase: `artifacts/api-server/src/middlewares/requireAdmin.ts` (admin auth pattern)
- PRD v3.1 referenced via CLAUDE.md and docs/SCHEMA_CONTRACT.md
- Confidence: HIGH -- all findings based on direct codebase analysis, no external sources needed

---

*Architecture analysis: 2026-03-26*
