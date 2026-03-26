# Technology Stack

**Project:** VCLoL RSO + Privacy Gates + Career Resume
**Researched:** 2026-03-26

## Current State Assessment

The RSO OAuth integration is **already implemented** in `artifacts/api-server/src/routes/auth.ts`. The existing implementation is correct and follows Riot's OAuth2 spec. This research focuses on what needs to be added, fixed, or optimized for the remaining launch blockers: privacy gates and career resume.

## RSO OAuth — Already Built, Needs Hardening

### Existing Implementation (Verified Correct)

The codebase already implements the full RSO flow:

| Endpoint | Status | Notes |
|----------|--------|-------|
| `GET /auth/connect/:token` | Done | Bot `/connect` flow, validates auth_session token, redirects to RSO |
| `GET /auth/rso` | Done | Website-only RSO initiation (requires Discord session first) |
| `GET /auth/rso/callback` | Done | Token exchange, PUUID retrieval, player record upsert |

**Scopes used:** `openid offline_access` -- correct per Riot docs.

**Token exchange:** Uses `https://auth.riotgames.com/token` with Basic auth header -- correct.

**PUUID retrieval:** Uses `https://americas.api.riotgames.com/riot/account/v1/accounts/me` with Bearer token -- correct.

### What Still Needs Work

| Gap | Priority | What to Do |
|-----|----------|------------|
| RSO token encryption at rest | P1 (launch) | `rsoAccessToken` and `rsoRefreshToken` stored as plaintext in `players` table. Encrypt with `crypto.createCipheriv` using a `TOKEN_ENCRYPTION_KEY` env var. |
| Refresh token rotation | P1 (launch) | No refresh flow exists. RSO access tokens expire in 600s. Need a utility to refresh before Riot API calls. Riot warns refresh tokens may rotate -- always store the newly issued one. |
| CSRF state parameter | P1 (launch) | Neither the RSO nor Discord OAuth flows generate a `state` parameter. Add `crypto.randomUUID()` stored in session, verify on callback. Standard OAuth2 security. |
| `cpid` scope for LoL data | P2 (post-launch) | Current scopes are `openid offline_access`. If the platform ever needs to call LoL-specific endpoints (summoner data, match history via API), add `cpid` scope. Not needed now since all data comes from `.rofl` parsing. |

### Recommended Stack for RSO Hardening

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js `crypto` (built-in) | N/A | Token encryption (AES-256-GCM) | Zero dependencies. Already used in `auth.ts` for password hashing. |
| `express-session` (existing) | ^1.19.0 | CSRF state storage | Already in the stack. Store `state` in session before redirect. |

**Do NOT add:** `passport`, `passport-oauth2`, or any OAuth middleware library. The existing hand-rolled implementation is 80 lines, correct, and transparent. Passport adds indirection with no benefit for a two-provider setup (Discord + RSO).

## Privacy Gate Pattern

### Recommended: Response-Layer Filtering (NOT Middleware Gating)

The codebase already uses the correct pattern in `GET /players/:riotId` -- check auth state in the route handler, return different response shapes based on access level. This is the right approach for VCLoL because:

1. **Same endpoint, different responses** -- a non-participant sees `{ sideAName, sideBName, score }` while a participant sees full 10-player stats. This cannot be a middleware allow/deny.
2. **Already partially implemented** -- player profile privacy gate is done. Match detail gate is not.
3. **Consistency** -- keep the same pattern everywhere rather than mixing middleware and inline checks.

### Pattern to Follow

```typescript
// In route handler:
const match = await getMatch(id);
const authLevel = resolveMatchAccess(req.session, match);
// authLevel: "public" | "participant" | "captain" | "admin"
res.json(formatMatchByAccess(match, matchPlayers, authLevel));
```

### Technology Needed

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| No new libraries | -- | Access resolution is pure logic | Adding RBAC libraries (casbin, casl, permify) is massive overkill for 3 access levels on 2 entity types. |

### Helper Functions to Build

| Function | Purpose |
|----------|---------|
| `resolveMatchAccess(session, match)` | Returns access level enum based on session state + match type + team membership |
| `formatMatchByAccess(match, players, level)` | Strips fields based on access level. Public = team names + score. Participant = full stats. |
| `resolvePlayerAccess(session, player)` | Already exists inline in `GET /players/:riotId`. Extract to shared helper. |
| `filterPlayerInMatchList(player, requesterAccess)` | For match player lists: mask non-opted-in players for non-participants |

## Career Resume Query Optimization

### Current Problem

`buildPlayerProfile()` in `players.ts` runs **4 sequential queries** for a single player profile:
1. Team memberships (JOIN teams)
2. Active member counts per team (GROUP BY)
3. Aggregate stats from match_players (COUNT, SUM, AVG)
4. Top champions (GROUP BY champion)
5. Recent matches (JOIN matches, LIMIT 10)
6. VODs (LIMIT 20)

The `GET /players` list endpoint is worse -- runs `buildPlayerProfile`-like queries **per player** in a `Promise.all` loop (the N+1 problem from Issue #217).

### What's Missing for Career Resume

The PRD requires **per-team W/L + KDA** (career as timeline of team chapters). Current `buildPlayerProfile` only computes aggregate totals across all teams.

### Recommended Approach

| Strategy | Technology | Purpose |
|----------|-----------|---------|
| Per-team stats via single query | Drizzle ORM + raw SQL fragment | JOIN match_players -> matches -> team_members, GROUP BY team_id |
| Database index | PostgreSQL | Add composite index on `match_players(player_id, match_id)` |
| Materialized stats (deferred) | PostgreSQL materialized view OR app-level cache | Only if profile queries become slow at scale (>10k matches) |

### Recommended Stack for Career Stats

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Drizzle ORM `sql` operator (existing) | ^0.45.1 | Complex aggregation with GROUP BY | Already used throughout. No new dependency. |
| PostgreSQL composite indexes | 16 | Query performance | Add `CREATE INDEX idx_mp_player_match ON match_players(player_id, match_id)` and `CREATE INDEX idx_mp_player_win ON match_players(player_id, win)` |

**Do NOT add:** Redis, Memcached, or any caching layer. At VCLoL's scale (target: 25 teams, 200 matches in 6 months), PostgreSQL handles this trivially. Cache when you have a measured problem.

### Per-Team Career Stats Query Pattern

```typescript
// Single query: per-team W/L + KDA for a player
const perTeamStats = await db
  .select({
    teamId: teamMembersTable.teamId,
    teamName: teamsTable.name,
    teamTag: teamsTable.tag,
    totalGames: count(),
    wins: sum(sql`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
    avgKills: avg(matchPlayersTable.kills),
    avgDeaths: avg(matchPlayersTable.deaths),
    avgAssists: avg(matchPlayersTable.assists),
    joinedAt: teamMembersTable.joinedAt,
  })
  .from(matchPlayersTable)
  .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
  .innerJoin(
    teamMembersTable,
    and(
      eq(teamMembersTable.playerId, matchPlayersTable.playerId),
      or(
        eq(teamMembersTable.teamId, matchesTable.teamAId),
        eq(teamMembersTable.teamId, matchesTable.teamBId),
      )
    )
  )
  .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
  .where(eq(matchPlayersTable.playerId, targetPlayerId))
  .groupBy(teamMembersTable.teamId, teamsTable.name, teamsTable.tag, teamMembersTable.joinedAt)
  .orderBy(desc(teamMembersTable.joinedAt));
```

### N+1 Fix for GET /players (Issue #217)

Replace the per-player `Promise.all` loop with a single query using lateral joins or subqueries:

```typescript
// Batch: all players with their primary team + aggregate stats in one query
const playersWithStats = await db
  .select({
    player: playersTable,
    teamName: teamsTable.name,
    teamTag: teamsTable.tag,
    totalGames: count(matchPlayersTable.id),
    wins: sum(sql`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
  })
  .from(playersTable)
  .leftJoin(
    teamMembersTable,
    and(
      eq(teamMembersTable.playerId, playersTable.id),
      eq(teamMembersTable.status, "active"),
    )
  )
  .leftJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
  .leftJoin(matchPlayersTable, eq(matchPlayersTable.playerId, playersTable.id))
  .groupBy(playersTable.id, teamsTable.name, teamsTable.tag)
  .orderBy(playersTable.riotId);
```

## Full Stack Summary

### No New Dependencies Required

Every remaining feature uses existing libraries:

| Feature | Library | Already In Stack |
|---------|---------|-----------------|
| RSO token encryption | Node.js `crypto` | Yes (built-in) |
| CSRF state parameter | `express-session` | Yes |
| Privacy gate logic | Pure TypeScript functions | Yes |
| Career stats queries | `drizzle-orm` + `sql` operator | Yes |
| Database indexes | PostgreSQL DDL via Drizzle migration | Yes |

### New Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TOKEN_ENCRYPTION_KEY` | Yes (launch) | AES-256 key for encrypting RSO tokens at rest. Generate with `crypto.randomBytes(32).toString('hex')` |

### Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| OAuth library | Hand-rolled (existing) | Passport.js + passport-oauth2 | Adds 3 dependencies, session serialization complexity, and indirection for a 2-provider setup. Current code is 80 lines and correct. |
| RBAC library | Inline access checks | casl, casbin, permify | Overkill. VCLoL has 3 access levels (public, participant, admin) on 2 entity types (match, player). A 20-line helper function covers this. |
| Caching layer | None (PostgreSQL direct) | Redis | At target scale (200 matches/6mo), PostgreSQL handles career stats in <10ms. Add caching only if measured latency exceeds 200ms. |
| Token storage | AES-256-GCM encryption | Vault, AWS KMS | Single-server deployment on Oracle ARM64. Key management services are for multi-service architectures. |
| Session store | express-session (memory/default) | connect-pg-simple, connect-redis | Single-server. Memory store is fine until you need horizontal scaling (not in scope). |

## Database Indexes to Add

```sql
-- Career stats: fast per-player aggregation
CREATE INDEX IF NOT EXISTS idx_match_players_player_id ON match_players(player_id);
CREATE INDEX IF NOT EXISTS idx_match_players_player_win ON match_players(player_id, win);
CREATE INDEX IF NOT EXISTS idx_match_players_player_match ON match_players(player_id, match_id);

-- Privacy gate: fast team membership check for match access
CREATE INDEX IF NOT EXISTS idx_team_members_player_status ON team_members(player_id, status);

-- Player search: filter by RSO opt-in
CREATE INDEX IF NOT EXISTS idx_players_rso_optin ON players(rso_opt_in) WHERE rso_opt_in = true;
```

## Sources

- [Riot OAuth Client Documentation](https://support-developer.riotgames.com/hc/en-us/articles/22897607341075-OAuth-Client-Documentation) -- Official RSO endpoints and scopes
- [Riot RSO Overview](https://support-developer.riotgames.com/hc/en-us/articles/22801670382739-RSO-Riot-Sign-On) -- RSO client requirements and approval process
- [RSO Implementation Gist (Henrik-3)](https://gist.github.com/Henrik-3/d6b631fb7c61821bc16b17cd347a3811) -- Community reference for endpoints, scopes, and gotchas
- [Drizzle ORM Select Documentation](https://orm.drizzle.team/docs/select) -- Aggregation and GROUP BY patterns
- [Drizzle ORM SQL Operator](https://orm.drizzle.team/docs/sql) -- Raw SQL fragments for complex queries

---

*Stack analysis: 2026-03-26*
