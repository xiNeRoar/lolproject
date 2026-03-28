# Phase 5: Auth & Stats API - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Add `hasPuuid` and `rsoOptIn` fields to GET /auth/me response. Create new GET /players/:id/team-stats endpoint returning per-team W/L record and KDA averages. Update OpenAPI spec for both endpoints. No codegen — that is Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Stats Endpoint Design
- **D-01:** URL path is `GET /players/:id/team-stats` — nested resource pattern consistent with existing `/players/:id/champions` and `/players/:id/events`.
- **D-02:** Response is a flat JSON array of team objects. No pagination needed (a player will never have enough teams to require it — MAX_ACTIVE_TEAMS is 3, historical teams also limited).

### Stats Data Scope
- **D-03:** Core stats per team. Each team object contains:
  - `teamId` (number) — team primary key
  - `teamName` (string) — team display name
  - `teamTag` (string) — team tag
  - `role` (string) — player's role from team_members
  - `status` (string) — active/inactive/pending from team_members
  - `wins` (number) — matches won with this team
  - `losses` (number) — matches lost with this team
  - `avgKills` (number) — average kills per game with this team
  - `avgDeaths` (number) — average deaths per game with this team
  - `avgAssists` (number) — average assists per game with this team
  - `gamesPlayed` (number) — total games played with this team
  - `joinedAt` (string, ISO date) — when the player joined this team
- **D-04:** No champion pool, no recent matches, no win streak per team — keep simple, matching STAT-01 requirement scope.

### /auth/me Expansion
- **D-05:** Add two new fields to GET /auth/me response:
  - `hasPuuid` (boolean) — `!!player.puuid` from players table. Core AUTH-06 requirement.
  - `rsoOptIn` (boolean) — `player.rsoOptIn` from players table. Frontend needs this for profile visibility decisions.
- **D-06:** Both fields included in authenticated AND unauthenticated responses. When unauthenticated: `hasPuuid: false, rsoOptIn: false`.

### OpenAPI Spec
- **D-07:** TeamStats response uses a named schema (`PlayerTeamStats`) in components/schemas — because DESIGN_GUIDE.md career card pattern references this data structure.
- **D-08:** AuthMe response stays inline in the path definition — small object, only one endpoint uses it, not worth a named schema.
- **D-09:** Follow Phase 3 patterns: use existing ErrorResponse schema for error cases, standard 401/404/500 responses.

### Claude's Discretion
- SQL query structure for per-team stats aggregation (join strategy, CTE vs subquery)
- Error handling for non-existent player IDs (follow existing patterns in players.ts)
- Exact ordering of team-stats response (by gamesPlayed desc or joinedAt desc)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Auth Route (to modify)
- `artifacts/api-server/src/routes/auth.ts` — GET /auth/me at line 338-350 (current response shape to extend)

### Existing Player Routes (pattern reference)
- `artifacts/api-server/src/routes/players.ts` — GET /players/:id (aggregate stats pattern), GET /players/:id/champions (nested resource pattern), GET /players/:id/events (nested resource pattern)

### Schema (data source)
- `lib/db/src/schema/teamMembers.ts` — team_members table (role, status, joinedAt for per-team context)
- `lib/db/src/schema/matchPlayers.ts` — match_players table (kills, deaths, assists, win for stats)
- `lib/db/src/schema/matches.ts` — matches table (teamAId, teamBId for team association)
- `lib/db/src/schema/players.ts` — players table (puuid, rsoOptIn for /auth/me fields)
- `lib/db/src/schema/teams.ts` — teams table (name, tag for display)

### OpenAPI Spec (to update)
- `lib/api-spec/openapi.yaml` — Current spec (add /players/{id}/team-stats path, update /auth/me response)

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-06, AUTH-07, STAT-01, STAT-02 acceptance criteria

### Design Guide (for alignment)
- `docs/DESIGN_GUIDE.md` — Per-team career card data contract (§New Pattern Specifications) — endpoint response shape must align

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Aggregate stats query pattern** (players.ts:83-94): existing `matchPlayersTable` aggregation with count(), sum(), avg() — same pattern needed for per-team grouping with additional team join
- **Champion stats query** (players.ts:100-109): `groupBy()` example to follow for team grouping
- **Nested resource pattern** (players.ts `/players/:id/champions`, `/players/:id/events`): exact URL and handler structure to replicate
- **Session type extensions** (lib/session.ts): already extends express-session with playerId, playerRiotId, discordUsername

### Established Patterns
- Player ID validation: `parseInt(req.params.id)` + `isNaN()` check → 400 error
- Player lookup: `db.select().from(playersTable).where(eq(playersTable.id, id))` → 404 if not found
- Response format: direct `res.json()` with flat objects, no wrapper
- Error format: `res.status(N).json({ error: "message" })`

### Integration Points
- **GET /players/:id/team-stats → DESIGN_GUIDE.md career card**: response fields must match the career card data contract (teamName, role, wins, losses, avgKills, avgDeaths, avgAssists)
- **GET /auth/me → frontend**: hasPuuid determines RSO prompt display, rsoOptIn determines profile visibility

</code_context>

<specifics>
## Specific Ideas

- Per-team stats query: join team_members → matches (via teamAId/teamBId matching) → match_players, grouped by teamId
- Player may appear on a team's match but not be in team_members (auto-added unknown players) — handle by including stats even for non-member teams if data exists
- Team-stats response ordering: by gamesPlayed descending (most active team first)

</specifics>

<deferred>
## Deferred Ideas

- **Per-team champion pool** — Champion breakdown within each team. More complex query, can be added as separate endpoint later.
- **Per-team recent matches** — Last N matches with a specific team. Already available via filtered /matches endpoint.
- **Win streak tracking** — Consecutive wins per team. Needs ordered match query with window functions. Not in STAT-01 scope.
- **Codegen regeneration** — Phase 6 (STAT-03). Do NOT run codegen in this phase.

</deferred>

---

*Phase: 05-auth-stats-api*
*Context gathered: 2026-03-28*
