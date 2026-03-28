# Phase 03: API Contract & Performance - Research

**Researched:** 2026-03-27
**Domain:** OpenAPI spec alignment, SQL query optimization, Orval codegen
**Confidence:** HIGH

## Summary

This phase has three clear deliverables: (1) fix the N+1 query in GET /players using batch `inArray` queries with pagination, (2) align the OpenAPI spec with all actual route signatures including auth endpoints and Phase 2 response shapes, and (3) run Orval codegen to update frontend hooks. Additionally, four CONCERNS.md fixes (ELO bug, shared formatter, matches pagination, FOR UPDATE locking) are in scope per CONTEXT.md decisions.

The codebase already establishes the patterns needed -- `inArray` batch queries are used in `privacyGate.ts`, `.for("update")` locking is used in `matches.ts` `applyTeamElo()`, and the Orval codegen pipeline is fully configured. The OpenAPI spec has significant drift: auth endpoints are incorrectly documented or missing, Phase 2 privacy fields (`isRedacted`, `_masked`, `isPrivate`) are absent, and the `listPlayers` response schema does not reflect the actual enriched response shape.

**Primary recommendation:** Fix all route code first (N+1, ELO guard, formatter extraction, FOR UPDATE, matches pagination), then do a single comprehensive OpenAPI spec update pass, then run codegen once at the end (per D-05).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Use batch `inArray` queries to fix GET /players N+1. Two batch queries (team memberships + stats) replace per-player loops. Merge results in JavaScript.
- **D-02:** Add LIMIT/OFFSET pagination to GET /players in the same fix. Default page size and query params for page/limit.
- **D-03:** Full alignment -- not just auth endpoints. Capture ALL response shape changes from Phases 1-2 (isRedacted, isPrivate, _masked fields, privacy gate behavior) plus auth endpoints (/auth/discord, /auth/rso, /auth/connect).
- **D-04:** Define unified ErrorResponse schema in spec: `{ error: string }` with common HTTP status codes (400/401/403/404/409/500). Codegen will produce typed error handling.
- **D-05:** Complete all OpenAPI spec updates first, then run codegen once at the end. Avoids intermediate type errors from partial spec updates.
- **D-06:** Fix submitRofl.ts ELO bug -- add `matchType` guard so scrims never compute ELO. Match pattern from matches.ts: only `ranked_tournament` or `event` triggers ELO.
- **D-07:** Extract shared `formatMatch()` utility into `artifacts/api-server/src/lib/formatters.ts`. Replace duplicates in matches.ts, teams.ts, and submitRofl.ts.
- **D-08:** Add LIMIT/OFFSET pagination to GET /matches. Push JavaScript filters into SQL WHERE clauses.
- **D-09:** Add FOR UPDATE locking to bot matchRecorder.ts team W/L counter reads inside transaction. Match pattern from matches.ts lines 205-214.

### Claude's Discretion
- Pagination default page size and parameter naming
- formatMatch field selection and typing approach
- OpenAPI spec organizational structure (grouping by resource vs by feature)
- Specific SQL optimization approach for GET /matches WHERE clauses

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PERF-01 | GET /players N+1 query eliminated -- batch JOINs or subqueries instead of per-player lookups | D-01/D-02: Batch `inArray` pattern already used in privacyGate.ts; pagination pattern to be introduced |
| SPEC-01 | OpenAPI spec updated for auth endpoints (/auth/discord, /auth/rso, /auth/connect actual signatures) | D-03: Full audit completed -- 7 auth route mismatches identified, plus Phase 2 privacy field gaps |
| SPEC-02 | OpenAPI codegen run after all route changes -- frontend hooks updated | D-05: Orval 8.5.2 with existing config; run once at end after all spec changes |
</phase_requirements>

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| drizzle-orm | ^0.45.1 | Database queries including `inArray`, `.for("update")` | Already used throughout; batch query + locking patterns established |
| Orval | ^8.5.2 | OpenAPI-to-React-Query + Zod codegen | Already configured in `lib/api-spec/orval.config.ts` |
| express | ^5 | API server routing | Already the HTTP framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| drizzle-orm `sql` template | ^0.45.1 | Raw SQL expressions in queries (CASE WHEN, aggregations) | Already used for stats aggregation in players.ts |
| drizzle-orm `inArray` | ^0.45.1 | Batch WHERE IN clauses | Already used in privacyGate.ts; use for N+1 fix |

### Alternatives Considered
None -- all tooling is locked by existing project infrastructure.

## Architecture Patterns

### Pattern 1: Batch Query N+1 Elimination (D-01)
**What:** Replace per-row loops with batch `inArray` queries, merge in JavaScript.
**When to use:** Any list endpoint that enriches items with related data.
**Example (existing pattern from privacyGate.ts lines 138-153):**
```typescript
// Batch: collect all IDs, single query, build lookup map
const playerIds = matchPlayers.map(mp => mp.playerId).filter(Boolean);
const players = await db.select({ id: playersTable.id, rsoOptIn: playersTable.rsoOptIn })
  .from(playersTable)
  .where(inArray(playersTable.id, playerIds));
const optInMap = new Map<number, boolean>();
for (const p of players) optInMap.set(p.id, p.rsoOptIn);
```

### Pattern 2: LIMIT/OFFSET Pagination (D-02, D-08)
**What:** SQL-level pagination with page/limit query params, returning total count.
**When to use:** Any list endpoint that could grow unbounded.
**Example (already used in teams.ts GET /teams/{id}/matches):**
```typescript
const page = Math.max(1, parseInt(req.query.page as string) || 1);
const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
const offset = (page - 1) * limit;

const [countResult] = await db.select({ total: count() }).from(table).where(conditions);
const total = Number(countResult?.total ?? 0);

const rows = await db.select().from(table)
  .where(conditions)
  .orderBy(desc(table.createdAt))
  .limit(limit)
  .offset(offset);

res.json({ data: rows, total, page, totalPages: Math.ceil(total / limit) });
```

### Pattern 3: FOR UPDATE Row Locking (D-09)
**What:** Pessimistic locking on read-compute-write operations inside transactions.
**When to use:** Concurrent writes to the same row (team W/L counters).
**Example (already in matches.ts lines 166-175):**
```typescript
const [teamA] = await tx.select().from(teamsTable)
  .where(eq(teamsTable.id, teamAId)).for("update");
const [teamB] = await tx.select().from(teamsTable)
  .where(eq(teamsTable.id, teamBId)).for("update");
```

### Pattern 4: Shared Formatter Extraction (D-07)
**What:** Single source of truth for response shape formatting.
**When to use:** When the same data type is formatted in 2+ route files.
**Location:** `artifacts/api-server/src/lib/formatters.ts`
**Approach:**
```typescript
// Export typed formatMatch that all route files import
export function formatMatch(
  m: typeof matchesTable.$inferSelect,
  extra?: { teamAName?: string | null; teamBName?: string | null; /* ... */ }
): FormattedMatch { /* ... */ }
```

### Anti-Patterns to Avoid
- **In-memory filtering after unbounded SELECT:** GET /matches currently loads all rows then filters in JS. Push filters into SQL WHERE clauses.
- **Per-item queries in loops:** The N+1 pattern in GET /players. Always batch with `inArray`.
- **Duplicating formatter functions:** Three copies of `formatMatch` exist (matches.ts, teams.ts, submitRofl inline). Extract once.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API codegen | Manual TypeScript types for frontend | Orval codegen from OpenAPI spec | Automatic type safety, zero drift |
| Batch queries | Manual SQL string concatenation | Drizzle `inArray` operator | Type-safe, injection-proof |
| Row locking | Manual advisory locks | Drizzle `.for("update")` | Standard PostgreSQL FOR UPDATE semantics |
| Pagination math | Custom offset calculation | `(page - 1) * limit` with validation | Already established in teams.ts |

## Common Pitfalls

### Pitfall 1: OpenAPI Spec Drift from Actual Routes
**What goes wrong:** Spec documents endpoints that don't exist or has wrong signatures, causing codegen to produce broken hooks.
**Why it happens:** Auth routes were documented speculatively before implementation. Phase 2 added response fields without spec updates.
**How to avoid:** Read every route handler's actual Express path and response shape before writing spec. Cross-reference `routes/index.ts` mount paths.
**Warning signs:** Codegen produces hooks for endpoints that return 404; TypeScript errors on generated types.

**Specific findings from audit:**

| Spec Path | Spec Method | Actual Route | Issue |
|-----------|-------------|-------------|-------|
| `/auth/rso/authorize` | GET | `/auth/rso` | Path mismatch -- spec says `/authorize`, code says `/rso` |
| `/auth/connect` | POST | `/auth/connect/:token` | Method + path mismatch -- actual is GET with `:token` param |
| (missing) | - | `/auth/discord` | Not in spec at all |
| (missing) | - | `/auth/discord/callback` | Not in spec at all |
| (missing) | - | `/auth/logout` | Not in spec at all |
| MatchDetail | - | response body | Missing `isRedacted` field for redacted scrim responses |
| MatchPlayerEntry | - | response body | Missing `_masked` field for non-opted player masking |
| PlayerProfile | - | response body | Missing `isPrivate` variant for private profiles |
| Player (list) | - | response body | Pagination wrapper not documented |

### Pitfall 2: Forgetting `inArray` Empty Array Guard
**What goes wrong:** `inArray(column, [])` generates invalid SQL (`WHERE column IN ()`) which crashes PostgreSQL.
**Why it happens:** Edge case when there are zero matching IDs.
**How to avoid:** Always check `if (ids.length > 0)` before using `inArray`. This pattern is already used correctly in the codebase (players.ts line 59, matches.ts line 277).
**Warning signs:** "syntax error at or near ')'".

### Pitfall 3: submitRofl ELO Bug Scope
**What goes wrong:** The fix must ONLY add a matchType guard. submitRofl always creates matches with `resultSource: "rofl_parse"` and no explicit `matchType` (defaults to `"scrim"`). ELO should never trigger.
**Why it happens:** The submitRofl endpoint copied logic from matches.ts (which handles admin-created tournament matches) without the type guard.
**How to avoid:** Pattern match from matches.ts line 373: `const eloEligible = resolvedMatchType === "ranked_tournament" || resolvedMatchType === "event"`. Since submitRofl has no matchType param, eloEligible is always false -- just wrap the ELO block in the guard.
**Warning signs:** Team ELO changes on scrim submissions.

### Pitfall 4: Pagination Response Shape Must Match Spec
**What goes wrong:** Frontend hooks expect a specific response shape from codegen. If the pagination wrapper (`{ data, total, page, totalPages }`) shape doesn't match the spec, generated types break.
**Why it happens:** Adding pagination changes the response from `array` to `object-with-array`.
**How to avoid:** Update the OpenAPI spec for GET /players and GET /matches to document the paginated response wrapper BEFORE running codegen.
**Warning signs:** Frontend TypeScript errors on `.data` property access.

### Pitfall 5: formatMatch Superset vs Subset Fields
**What goes wrong:** matches.ts formatMatch has extra fields (teamAName, teamBName, eventTitle, eventSlug, gameVersion, round, bracketSlot, nextMatchId, isLosersBracket, groupId) that teams.ts formatMatch does not. Extracting a shared function must handle the superset.
**Why it happens:** Different route files evolved independently.
**How to avoid:** The shared `formatMatch` should accept optional `extra` params (like the matches.ts version already does). The teams.ts version is a strict subset -- it just doesn't pass the extras.

## Code Examples

### N+1 Fix for GET /players (D-01, D-02)
```typescript
// Current: 2N+1 queries (lines 216-243)
// Fix: 3 queries total regardless of player count

// Query 1: All players (with pagination)
const [countResult] = await db.select({ total: count() }).from(playersTable)
  .where(isAdmin ? undefined : eq(playersTable.rsoOptIn, true));
const total = Number(countResult?.total ?? 0);

const players = await db.select().from(playersTable)
  .where(isAdmin ? undefined : eq(playersTable.rsoOptIn, true))
  .orderBy(playersTable.riotId)
  .limit(limit).offset(offset);

const playerIds = players.map(p => p.id);
if (playerIds.length === 0) return res.json({ data: [], total, page, totalPages: 0 });

// Query 2: Batch team memberships
const memberRows = await db.select({
  playerId: teamMembersTable.playerId,
  teamId: teamMembersTable.teamId,
  teamName: teamsTable.name,
  teamTag: teamsTable.tag,
}).from(teamMembersTable)
  .innerJoin(teamsTable, eq(teamMembersTable.teamId, teamsTable.id))
  .where(and(
    inArray(teamMembersTable.playerId, playerIds),
    eq(teamMembersTable.status, "active"),
  ))
  .orderBy(desc(teamMembersTable.joinedAt));

// Build primary team map (first active team per player)
const primaryTeamMap = new Map<number, { teamId: number; teamName: string; teamTag: string }>();
for (const r of memberRows) {
  if (!primaryTeamMap.has(r.playerId)) {
    primaryTeamMap.set(r.playerId, { teamId: r.teamId, teamName: r.teamName, teamTag: r.teamTag });
  }
}

// Query 3: Batch stats
const statsRows = await db.select({
  playerId: matchPlayersTable.playerId,
  totalGames: count(matchPlayersTable.id),
  wins: sum(sql<number>`CASE WHEN ${matchPlayersTable.win} = true THEN 1 ELSE 0 END`),
}).from(matchPlayersTable)
  .where(inArray(matchPlayersTable.playerId, playerIds))
  .groupBy(matchPlayersTable.playerId);

const statsMap = new Map<number, { totalGames: number; wins: number }>();
for (const s of statsRows) {
  if (s.playerId != null) {
    statsMap.set(s.playerId, { totalGames: Number(s.totalGames), wins: Number(s.wins ?? 0) });
  }
}

// Merge in JavaScript
const enriched = players.map(p => {
  const stats = statsMap.get(p.id);
  const totalGames = stats?.totalGames ?? 0;
  const wins = stats?.wins ?? 0;
  return {
    ...formatPlayer(p),
    primaryTeam: primaryTeamMap.get(p.id) ?? null,
    totalGames,
    winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : null,
  };
});

res.json({ data: enriched, total, page, totalPages: Math.ceil(total / limit) });
```

### submitRofl ELO Guard (D-06)
```typescript
// In submitRofl.ts, wrap the ELO block:
// The match is always resultSource: "rofl_parse" with default matchType "scrim"
// So eloEligible will always be false -- but the guard is required for correctness
if (sideA.teamId && sideB.teamId) {
  // W/L update always runs (all match types)
  // ... existing W/L update code ...

  // ELO only for tournament/event (PRD v3.1 S8)
  // Note: submitRofl matches are always matchType "scrim" so this never triggers
  const resolvedMatchType = "scrim"; // hardcoded -- submit-rofl is always scrim
  const eloEligible = resolvedMatchType === "ranked_tournament" || resolvedMatchType === "event";
  if (eloEligible && eloDeltas) {
    // ... ELO insert code (never reached for submit-rofl) ...
  }
}
```

### FOR UPDATE in matchRecorder.ts (D-09)
```typescript
// Replace lines 121-124 in matchRecorder.ts:
// FROM:
const [teamARow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
  .from(teamsTable).where(eq(teamsTable.id, sideA.teamId));

// TO:
const [teamARow] = await tx.select({ wins: teamsTable.wins, losses: teamsTable.losses })
  .from(teamsTable).where(eq(teamsTable.id, sideA.teamId)).for("update");
```

### Auth Endpoint OpenAPI Spec Corrections
```yaml
# Actual auth routes (from auth.ts):
/auth/discord:
  get:
    operationId: authDiscord
    tags: [auth]
    summary: Initiate Discord OAuth flow
    responses:
      "302":
        description: Redirect to discord.com/api/oauth2/authorize

/auth/discord/callback:
  get:
    operationId: authDiscordCallback
    tags: [auth]
    summary: Discord OAuth callback -- exchanges code, sets session
    parameters:
      - name: code
        in: query
        required: true
        schema:
          type: string
      - name: state
        in: query
        required: true
        schema:
          type: string
    responses:
      "302":
        description: Redirect to /dashboard (existing player) or /register (new)
      "403":
        description: Invalid OAuth state
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ErrorResponse"

/auth/connect/{token}:
  get:
    operationId: authConnectToken
    tags: [auth]
    summary: Bot /connect flow -- validate token, redirect to RSO
    parameters:
      - name: token
        in: path
        required: true
        schema:
          type: string
    responses:
      "302":
        description: Redirect to RSO OAuth or error page

/auth/rso:
  get:
    operationId: authRso
    tags: [auth]
    summary: Initiate RSO OAuth flow (website-only, no bot token)
    responses:
      "302":
        description: Redirect to auth.riotgames.com

/auth/logout:
  post:
    operationId: authLogout
    tags: [auth]
    summary: Destroy player session
    responses:
      "200":
        description: Logged out
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/SuccessResponse"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Promise.all` per-player queries | Batch `inArray` + JS merge | Phase 3 (this phase) | O(1) queries instead of O(N) |
| All matches in memory + JS filter | SQL WHERE + LIMIT/OFFSET | Phase 3 (this phase) | Bounded memory, faster response |
| Duplicate formatMatch in 3 files | Single shared formatter | Phase 3 (this phase) | One place to change response shapes |
| No FOR UPDATE on bot W/L updates | `.for("update")` in transaction | Phase 3 (this phase) | Prevents lost updates from race conditions |

## Open Questions

1. **Pagination default page size**
   - What we know: Teams.ts uses `default 20, max 100` (lines 589-600 of OpenAPI spec)
   - What's unclear: Whether players and matches should use the same defaults
   - Recommendation: Use consistent defaults: page size 20, max 100, matching teams.ts precedent (Claude's discretion per CONTEXT.md)

2. **Pagination parameter naming**
   - What we know: Teams.ts uses `page` and `limit` query params
   - What's unclear: Whether to use the same or prefer `offset` directly
   - Recommendation: Use `page` and `limit` for consistency with existing teams.ts pattern

3. **GET /players response breaking change**
   - What we know: Current response is a flat array. Pagination wraps it in `{ data, total, page, totalPages }`
   - What's unclear: Whether frontend currently relies on the flat array shape
   - Recommendation: This is an intentional breaking change. The spec update + codegen will propagate the new shape to frontend hooks. The frontend is Replit-owned and will need to adapt, but codegen will surface the type changes.

4. **formatMatch TypeScript return type**
   - What we know: matches.ts version returns a superset of fields compared to teams.ts version
   - What's unclear: Whether to use a single type or intersection types
   - Recommendation: Single `FormattedMatch` type with optional `extra` fields. The function signature already handles this pattern in matches.ts.

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of all files referenced in CONTEXT.md canonical refs
- `artifacts/api-server/src/routes/players.ts` -- N+1 query at lines 216-243 (confirmed: 2 queries per player in Promise.all)
- `artifacts/api-server/src/routes/matches.ts` -- FOR UPDATE pattern at lines 166-175, in-memory filters at lines 243-269
- `artifacts/api-server/src/routes/auth.ts` -- 7 actual route handlers vs spec (5 discrepancies found)
- `artifacts/api-server/src/routes/submitRofl.ts` -- ELO applied unconditionally at lines 233-240
- `artifacts/discord-bot/src/lib/matchRecorder.ts` -- Missing FOR UPDATE at lines 121-136
- `lib/api-spec/openapi.yaml` -- Full 3658-line spec audited against actual routes
- `lib/api-spec/orval.config.ts` -- Codegen configuration confirmed working
- `artifacts/api-server/src/lib/privacyGate.ts` -- Phase 2 response fields (isRedacted, _masked, isPrivate)

### Secondary (MEDIUM confidence)
- `pnpm-workspace.yaml` -- drizzle-orm ^0.45.1 confirmed (supports `.for("update")` and `inArray`)
- Orval ^8.5.2 in `lib/api-spec/package.json` -- codegen command: `cd lib/api-spec && pnpm run codegen`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in use, versions confirmed
- Architecture: HIGH -- all patterns already established in codebase, just need to extend
- Pitfalls: HIGH -- based on direct code reading, not speculation
- OpenAPI drift: HIGH -- line-by-line comparison of spec vs actual routes completed

**Research date:** 2026-03-27
**Valid until:** 2026-04-27 (stable -- internal codebase patterns, no external API changes)
