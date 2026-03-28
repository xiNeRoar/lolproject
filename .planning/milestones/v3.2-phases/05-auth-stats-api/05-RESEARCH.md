# Phase 5: Auth & Stats API - Research

**Researched:** 2026-03-28
**Domain:** Express route implementation, Drizzle ORM aggregation queries, OpenAPI 3.1 spec authoring
**Confidence:** HIGH

## Summary

This phase adds two things: (1) two boolean fields (`hasPuuid`, `rsoOptIn`) to the existing GET /auth/me response, and (2) a new GET /players/:id/team-stats endpoint returning per-team W/L records and KDA averages. The OpenAPI spec must be updated for both, but codegen is deferred to Phase 6.

All patterns needed already exist in the codebase. The /auth/me change converts a synchronous handler to async with a single DB query. The team-stats endpoint replicates the exact structure of `/players/:id/champions` and `/players/:id/events` (param validation, player lookup, privacy gate, aggregate query, JSON array response). The SQL query is the only non-trivial part -- it requires a 3-table join with a conditional team-side mapping.

**Primary recommendation:** Follow existing nested resource patterns exactly. The team-stats query must join through `match_players.teamSide` to resolve which team each player belonged to in a given match, using `matches.teamAId`/`teamBId`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** URL path is `GET /players/:id/team-stats` -- nested resource pattern consistent with existing `/players/:id/champions` and `/players/:id/events`.
- **D-02:** Response is a flat JSON array of team objects. No pagination needed.
- **D-03:** Core stats per team: teamId, teamName, teamTag, role, status, wins, losses, avgKills, avgDeaths, avgAssists, gamesPlayed, joinedAt.
- **D-04:** No champion pool, no recent matches, no win streak per team.
- **D-05:** Add `hasPuuid` (boolean) and `rsoOptIn` (boolean) to GET /auth/me response.
- **D-06:** Both fields included in authenticated AND unauthenticated responses. When unauthenticated: hasPuuid: false, rsoOptIn: false.
- **D-07:** TeamStats response uses a named schema (`PlayerTeamStats`) in components/schemas.
- **D-08:** AuthMe response stays inline in the path definition (NOTE: actual current spec already uses a named `AuthMeResponse` schema -- see Architecture Patterns below).
- **D-09:** Follow Phase 3 patterns: use existing ErrorResponse schema for error cases, standard 401/404/500 responses.

### Claude's Discretion
- SQL query structure for per-team stats aggregation (join strategy, CTE vs subquery)
- Error handling for non-existent player IDs (follow existing patterns in players.ts)
- Exact ordering of team-stats response (by gamesPlayed desc or joinedAt desc)

### Deferred Ideas (OUT OF SCOPE)
- Per-team champion pool
- Per-team recent matches
- Win streak tracking
- Codegen regeneration (Phase 6)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-06 | GET /auth/me returns `hasPuuid: boolean` field indicating whether player has linked Riot account | Current handler at auth.ts:338-350 is synchronous. Must become async + query playersTable for puuid/rsoOptIn. Session has playerId available. |
| AUTH-07 | OpenAPI spec updated for /auth/me response schema with hasPuuid field | Current spec uses named `AuthMeResponse` schema at line 2369. Add two boolean properties. |
| STAT-01 | New endpoint returns per-team W/L record and KDA averages grouped by team membership | 3-table join pattern documented below. Privacy gate pattern from /champions and /events endpoints reusable. |
| STAT-02 | OpenAPI spec documents the per-team stats endpoint with correct request/response schemas | Follow PlayerChampionStats/PlayerEventParticipation named schema pattern. Path uses integer {id} parameter. |
</phase_requirements>

## Standard Stack

No new dependencies. Everything needed is already in the project:

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Query builder for aggregation joins | Project ORM, used everywhere |
| express | ^5 | Route handler | Project HTTP framework |
| express-session | ^1.19.0 | Session access for playerId | Already configured |

### Drizzle Functions Needed
| Function | Import from | Purpose |
|----------|-------------|---------|
| `eq` | drizzle-orm | Column equality in WHERE/JOIN |
| `and` | drizzle-orm | Combine conditions |
| `or` | drizzle-orm | teamSide conditional join |
| `count` | drizzle-orm | gamesPlayed aggregation |
| `sum` | drizzle-orm | Wins calculation (CASE WHEN win THEN 1) |
| `avg` | drizzle-orm | avgKills, avgDeaths, avgAssists |
| `sql` | drizzle-orm | Raw SQL fragments (CASE expressions) |
| `desc` | drizzle-orm | Ordering by gamesPlayed |

All are already imported in `players.ts` except `or` (import from `drizzle-orm`, already used in `matches.ts` and `bans.ts`).

## Architecture Patterns

### Pattern 1: Nested Resource Endpoint (COPY THIS)

The exact pattern used by `/players/:id/champions` (players.ts:700-758) and `/players/:id/events` (players.ts:626-698):

```typescript
// 1. Parse and validate ID
const id = parseInt(req.params.id as string);
if (isNaN(id)) {
  res.status(400).json({ error: "Invalid id" });
  return;
}

// 2. Fetch player (required for privacy gate)
const [player] = await db.select().from(playersTable).where(eq(playersTable.id, id));
if (!player) {
  res.status(404).json({ error: "Player not found" });
  return;
}

// 3. Privacy gate
const viewerId = req.session.playerId ? Number(req.session.playerId) : null;
const isAdmin = !!req.session.adminId;
const { canSeeProfile } = await isPlayerProfileVisibleTo(player, viewerId, isAdmin);
if (!canSeeProfile) {
  res.status(403).json({ error: "Player profile is private" });
  return;
}

// 4. Query
// ... aggregation query ...

// 5. Return flat JSON array
res.json(results);
```

**Source:** `artifacts/api-server/src/routes/players.ts` lines 700-758

### Pattern 2: Auth/Me Handler Modification

Current handler (auth.ts:338-350):

```typescript
// CURRENT — synchronous, no DB query
router.get("/me", (req, res) => {
  if (req.session.playerId) {
    res.json({
      authenticated: true,
      playerId: req.session.playerId,
      riotId: req.session.playerRiotId ?? null,
      discordUsername: req.session.discordUsername ?? null,
    });
  } else {
    res.json({ authenticated: false, playerId: null, riotId: null, discordUsername: null });
  }
});
```

Must become async to query `playersTable` for `puuid` and `rsoOptIn`:

```typescript
// NEEDED — async, single DB query when authenticated
router.get("/me", async (req, res) => {
  if (req.session.playerId) {
    const [player] = await db
      .select({ puuid: playersTable.puuid, rsoOptIn: playersTable.rsoOptIn })
      .from(playersTable)
      .where(eq(playersTable.id, req.session.playerId));

    res.json({
      authenticated: true,
      playerId: req.session.playerId,
      riotId: req.session.playerRiotId ?? null,
      discordUsername: req.session.discordUsername ?? null,
      hasPuuid: !!player?.puuid,
      rsoOptIn: player?.rsoOptIn ?? false,
    });
  } else {
    res.json({
      authenticated: false,
      playerId: null,
      riotId: null,
      discordUsername: null,
      hasPuuid: false,
      rsoOptIn: false,
    });
  }
});
```

### Pattern 3: SQL Aggregation with Team-Side Join (KEY COMPLEXITY)

The critical data relationship:
- `match_players.teamSide` = "A" or "B"
- `matches.teamAId` = team ID for side A
- `matches.teamBId` = team ID for side B

To find "games where player X played for team Y":

```
match_players JOIN matches ON matchId
WHERE match_players.playerId = X
  AND (
    (match_players.teamSide = 'A' AND matches.teamAId = Y)
    OR
    (match_players.teamSide = 'B' AND matches.teamBId = Y)
  )
```

Existing aggregate pattern in players.ts:83-94:

```typescript
const [stats] = await db
  .select({
    totalGames: count(),
    wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
    avgKills: avg(matchPlayersTable.kills),
    avgDeaths: avg(matchPlayersTable.deaths),
    avgAssists: avg(matchPlayersTable.assists),
  })
  .from(matchPlayersTable)
  .where(eq(matchPlayersTable.playerId, player.id));
```

For per-team stats, extend this with a computed `teamId` column using SQL CASE:

```typescript
// Derive teamId from teamSide + matches.teamAId/teamBId
const teamIdExpr = sql<number>`CASE
  WHEN ${matchPlayersTable.teamSide} = 'A' THEN ${matchesTable.teamAId}
  WHEN ${matchPlayersTable.teamSide} = 'B' THEN ${matchesTable.teamBId}
END`;

const rows = await db
  .select({
    teamId: teamIdExpr,
    gamesPlayed: count(),
    wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
    avgKills: avg(matchPlayersTable.kills),
    avgDeaths: avg(matchPlayersTable.deaths),
    avgAssists: avg(matchPlayersTable.assists),
  })
  .from(matchPlayersTable)
  .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
  .where(eq(matchPlayersTable.playerId, id))
  .groupBy(teamIdExpr)
  .orderBy(desc(count()));
```

Then enrich with team name/tag and membership info from a second query or by joining team_members + teams.

### Pattern 4: OpenAPI Named Schema (for PlayerTeamStats)

Follow existing pattern from PlayerChampionStats (openapi.yaml:2759-2770) and PlayerEventParticipation (openapi.yaml:2734-2757):

```yaml
# In components/schemas:
PlayerTeamStats:
  type: object
  properties:
    teamId:
      type: integer
    teamName:
      type: string
    teamTag:
      type: string
    role:
      type: string
      nullable: true
    status:
      type: string
    wins:
      type: integer
    losses:
      type: integer
    avgKills:
      type: number
    avgDeaths:
      type: number
    avgAssists:
      type: number
    gamesPlayed:
      type: integer
    joinedAt:
      type: string
      format: date-time
  required: [teamId, teamName, teamTag, status, wins, losses, avgKills, avgDeaths, avgAssists, gamesPlayed, joinedAt]

# In paths:
/players/{id}/team-stats:
  get:
    operationId: getPlayerTeamStats
    tags: [players]
    summary: Per-team career stats for a player
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: integer
    responses:
      "200":
        description: Per-team stats
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: "#/components/schemas/PlayerTeamStats"
      "400":
        description: Invalid id
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ErrorResponse"
      "403":
        description: Player profile is private
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ErrorResponse"
      "404":
        description: Player not found
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ErrorResponse"
```

### Pattern 5: AuthMeResponse Update

D-08 says "AuthMe response stays inline." However, the current spec ALREADY uses a named schema `AuthMeResponse` (openapi.yaml:2369-2383). Decision: update the existing named schema rather than breaking it into inline. This is a correction to D-08 based on actual codebase state.

```yaml
AuthMeResponse:
  type: object
  properties:
    authenticated:
      type: boolean
    playerId:
      type: integer
      nullable: true
    riotId:
      type: string
      nullable: true
    discordUsername:
      type: string
      nullable: true
    hasPuuid:
      type: boolean
    rsoOptIn:
      type: boolean
  required: [authenticated, hasPuuid, rsoOptIn]
```

### Anti-Patterns to Avoid
- **Using team_members to determine team-match association:** team_members shows roster membership, but match_players.teamSide + matches.teamAId/teamBId is the actual in-game team association. A player could be on a roster but not play a match, or play a match but not be on the roster yet (auto-added unknown players).
- **N+1 queries for team enrichment:** Do NOT query each team individually. Get all teamIds from the aggregation, then batch-fetch team names/tags in one query.
- **Skipping the privacy gate:** All player sub-routes use `isPlayerProfileVisibleTo`. The team-stats endpoint must too.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Privacy gate | Custom visibility check | `isPlayerProfileVisibleTo()` from `privacyGate.ts` | Shared helper per D-14, covers all 3 layers + admin + owner |
| Session type access | Manual type assertions | `req.session.playerId` via `lib/session.ts` augmentation | Types already declared |
| Error responses | Custom error shapes | `{ error: string }` matching `ErrorResponse` schema | Consistent with all existing routes |

## Common Pitfalls

### Pitfall 1: Null teamId in Aggregation
**What goes wrong:** Some matches may have `teamAId = null` or `teamBId = null` (e.g., matches where team matching failed or manual entries). The CASE expression returns null for these.
**Why it happens:** The `teamAId`/`teamBId` columns are nullable foreign keys with `onDelete: "set null"`.
**How to avoid:** Filter out null teamIds from the aggregation results. In SQL: `HAVING teamId IS NOT NULL`. In code: `.filter(r => r.teamId != null)` on the result set.
**Warning signs:** A "null" team appearing in the response array.

### Pitfall 2: Numeric Precision from avg()
**What goes wrong:** Drizzle's `avg()` returns a string (PostgreSQL returns numeric type), not a JavaScript number. Direct JSON serialization gives `"1.5000000"` instead of `1.5`.
**Why it happens:** PostgreSQL numeric precision preserved as string through pg driver.
**How to avoid:** Wrap with `Number(Number(value).toFixed(2))` -- exactly the pattern used in players.ts:123-126 for existing aggregate stats.
**Warning signs:** String values in JSON response where numbers are expected.

### Pitfall 3: Auth/Me Handler Error Handling
**What goes wrong:** If the DB query fails in the now-async /auth/me handler, the response hangs or crashes without a JSON error.
**Why it happens:** Current handler is synchronous (no try/catch needed). Converting to async requires wrapping in try/catch.
**How to avoid:** Add try/catch around the DB query. On failure, fall back to the unauthenticated response shape with default false values, or return a 500 -- follow existing patterns in auth.ts (other handlers use try/catch).
**Warning signs:** Unhandled promise rejection in auth routes.

### Pitfall 4: Team-Stats for Players With No Matches
**What goes wrong:** If a player has team memberships but zero match_player records, the SQL aggregation returns empty results -- but the team membership info (role, status, joinedAt) should still appear.
**Why it happens:** The aggregation query starts from match_players, so teams with no games are invisible.
**How to avoid:** Two-phase approach: (1) get team memberships from team_members, (2) get match stats aggregated by teamId, (3) merge -- teams with no match data get zeroed stats. This ensures all teams the player belongs to appear even with 0 games.
**Warning signs:** A player with active team memberships showing an empty team-stats array.

### Pitfall 5: OpenAPI Path Parameter Collision
**What goes wrong:** The new `/players/{id}/team-stats` path could collide with `/players/{riotId}` if Express sees "team-stats" as a riotId.
**Why it happens:** Express matches paths in registration order.
**How to avoid:** This is a non-issue because the team-stats handler uses `parseInt(req.params.id)` and rejects NaN. Also, the route is registered on the same router as `/players/:id/champions` which already works. But the path should use `:id` (numeric) consistent with other sub-routes. The OpenAPI spec path `{id}` with `type: integer` documents this correctly.
**Warning signs:** None -- this pattern already works for /champions and /events.

## Code Examples

### Complete Team-Stats Query Strategy (Recommended)

Two-phase approach that handles all edge cases:

```typescript
// Phase 1: Get all team memberships for this player
const memberRows = await db
  .select({
    teamId: teamMembersTable.teamId,
    role: teamMembersTable.role,
    status: teamMembersTable.status,
    joinedAt: teamMembersTable.joinedAt,
    teamName: teamsTable.name,
    teamTag: teamsTable.tag,
  })
  .from(teamMembersTable)
  .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
  .where(eq(teamMembersTable.playerId, id));

// Phase 2: Aggregate match stats grouped by resolved teamId
const teamIdExpr = sql<number>`CASE
  WHEN ${matchPlayersTable.teamSide} = 'A' THEN ${matchesTable.teamAId}
  WHEN ${matchPlayersTable.teamSide} = 'B' THEN ${matchesTable.teamBId}
END`;

const statsRows = await db
  .select({
    teamId: teamIdExpr,
    gamesPlayed: count(),
    wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} THEN 1 ELSE 0 END`),
    avgKills: avg(matchPlayersTable.kills),
    avgDeaths: avg(matchPlayersTable.deaths),
    avgAssists: avg(matchPlayersTable.assists),
  })
  .from(matchPlayersTable)
  .innerJoin(matchesTable, eq(matchPlayersTable.matchId, matchesTable.id))
  .where(eq(matchPlayersTable.playerId, id))
  .groupBy(teamIdExpr);

// Phase 3: Merge -- map memberships, enrich with stats
const statsMap = new Map<number, typeof statsRows[number]>();
for (const row of statsRows) {
  if (row.teamId != null) {
    statsMap.set(row.teamId, row);
  }
}

const results = memberRows.map((m) => {
  const s = statsMap.get(m.teamId);
  const gamesPlayed = Number(s?.gamesPlayed ?? 0);
  const wins = Number(s?.wins ?? 0);
  return {
    teamId: m.teamId,
    teamName: m.teamName,
    teamTag: m.teamTag,
    role: m.role ?? null,
    status: m.status,
    wins,
    losses: gamesPlayed - wins,
    avgKills: Number(Number(s?.avgKills ?? 0).toFixed(2)),
    avgDeaths: Number(Number(s?.avgDeaths ?? 0).toFixed(2)),
    avgAssists: Number(Number(s?.avgAssists ?? 0).toFixed(2)),
    gamesPlayed,
    joinedAt: m.joinedAt.toISOString(),
  };
});

// Sort by gamesPlayed desc (most active team first)
results.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
res.json(results);
```

**Source:** Derived from existing patterns in `artifacts/api-server/src/routes/players.ts` (buildPlayerProfile function, lines 41-201)

### Design Guide Alignment Check

The DESIGN_GUIDE.md Per-Team Career Card data shape (docs/DESIGN_GUIDE.md:178-191) requires:
- `teamId`, `teamName`, `teamTag`, `role`, `status`, `wins`, `losses`, `avgKills`, `avgDeaths`, `avgAssists`

D-03 adds: `gamesPlayed`, `joinedAt` (superset of design guide -- compatible).

The response shape fully covers the design guide contract.

## State of the Art

No external changes relevant. This phase uses only project-internal patterns with stable dependencies (Express 5, Drizzle ORM 0.45.x).

| Aspect | Current State | Impact |
|--------|---------------|--------|
| AuthMeResponse schema | Already named in OpenAPI (contradicts D-08 "inline") | Update existing named schema instead of converting to inline |
| Privacy gate helper | Centralized in privacyGate.ts per D-14 | Reuse for team-stats, do not duplicate |
| Drizzle groupBy with sql expressions | Supported, used in champion stats | Same pattern for team grouping |

## Open Questions

1. **D-08 vs actual spec state:**
   - What we know: D-08 says "AuthMe response stays inline," but the spec already has a named `AuthMeResponse` schema at components/schemas (line 2369).
   - What's unclear: Whether to convert to inline (matching D-08) or update the existing named schema (less churn).
   - Recommendation: Update the existing named `AuthMeResponse` schema. Converting to inline would break the current codegen output (which expects a named type). The intent of D-08 was "don't create a new named schema" -- the schema already exists, so we just add fields to it.

2. **Ordering of team-stats response:**
   - What we know: Claude's discretion per CONTEXT.md. Options: gamesPlayed desc, joinedAt desc.
   - Recommendation: gamesPlayed descending. Most active/relevant team first. This matches user expectations -- the team they played with most is most important in their career view.

## Project Constraints (from CLAUDE.md)

- **Schema -> OpenAPI -> codegen -> route -> page.** This phase does schema (n/a) + OpenAPI + route. Codegen is Phase 6.
- **No codegen in this phase** (explicitly deferred to Phase 6, STAT-03).
- **After OpenAPI change:** `cd lib/api-spec && pnpm run codegen` -- DO NOT RUN. Phase 6 handles this.
- **Error format:** `res.status(N).json({ error: "message" })` -- project standard.
- **Import pattern:** `.js` extension for relative imports, bare specifiers for workspace packages.
- **File naming:** kebab-case for source files. The team-stats route goes in existing `players.ts` (not a new file).
- **Logging:** `console.error("[players]", err)` for the catch block -- matches existing players.ts pattern.
- **Privacy model:** 3-layer visibility. Player sub-routes use `isPlayerProfileVisibleTo()`.
- **Doc updates:** Update SCHEMA_CONTRACT.md if schema changes (n/a for this phase). OpenAPI spec IS the doc for API endpoints.

## Sources

### Primary (HIGH confidence)
- `artifacts/api-server/src/routes/auth.ts` - Lines 338-350: current GET /auth/me handler (read directly)
- `artifacts/api-server/src/routes/players.ts` - Full file: nested resource patterns, aggregation queries, privacy gate usage (read directly)
- `lib/api-spec/openapi.yaml` - Lines 237-248, 2369-2383: current AuthMeResponse spec (read directly)
- `lib/api-spec/openapi.yaml` - Lines 893-933, 2734-2770: existing nested resource path + schema patterns (read directly)
- `lib/db/src/schema/matchPlayers.ts` - teamSide column ("A"/"B") is the key to team resolution (read directly)
- `lib/db/src/schema/matches.ts` - teamAId/teamBId nullable FKs (read directly)
- `lib/db/src/schema/teamMembers.ts` - role, status, joinedAt fields (read directly)
- `lib/db/src/schema/players.ts` - puuid, rsoOptIn fields (read directly)
- `artifacts/api-server/src/lib/privacyGate.ts` - Full file: privacy gate implementation (read directly)
- `artifacts/api-server/src/lib/session.ts` - Session type augmentation (read directly)
- `docs/DESIGN_GUIDE.md` - Lines 170-191: Per-Team Career Card data contract (read directly)

### Secondary (MEDIUM confidence)
- None needed. All findings from direct codebase inspection.

### Tertiary (LOW confidence)
- None.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all functions already used in codebase
- Architecture: HIGH - All patterns directly observed in existing code
- Pitfalls: HIGH - Identified from actual schema constraints and existing code patterns
- SQL strategy: HIGH - Derived from existing aggregation patterns in players.ts + schema column analysis

**Research date:** 2026-03-28
**Valid until:** Indefinite (internal codebase patterns, no external dependency changes)
