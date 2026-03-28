---
phase: 05-auth-stats-api
plan: 02
subsystem: api
tags: [express, openapi, drizzle, sql-aggregation, privacy-gate]

requires:
  - phase: 05-auth-stats-api
    provides: "Auth/me hasPuuid and rsoOptIn (plan 01), player schema with puuid column"
provides:
  - "GET /players/:id/team-stats endpoint with 2-phase query (memberships + match aggregation)"
  - "PlayerTeamStats named schema in OpenAPI spec with 12 properties"
  - "/players/{id}/team-stats path definition with 200/400/403/404 responses"
affects: [06-codegen, frontend-career-page, player-profile]

tech-stack:
  added: []
  patterns: ["2-phase query pattern: memberships first, match aggregation second, merge with null-safe Map"]

key-files:
  created: []
  modified:
    - lib/api-spec/openapi.yaml
    - artifacts/api-server/src/routes/players.ts

key-decisions:
  - "Used 2-phase query (memberships + stats) instead of single JOIN to handle zero-game teams gracefully"
  - "Privacy gate returns 403 (not 404) for private profiles, consistent with /champions and /events handlers"
  - "CASE expression maps teamSide to teamAId/teamBId, null teamIds from deleted teams filtered in Phase 3"
  - "All team membership statuses included (active, inactive, pending) -- career resume model, no filtering"

patterns-established:
  - "CASE-based team resolution: map matchPlayersTable.teamSide to matches.teamAId/teamBId via SQL CASE"
  - "Null-safe statsMap: filter null teamIds before merging with membership rows"
  - "Zero-game fallback: ?? 0 for all numeric stats, Number(toFixed(2)) for averages"

requirements-completed: [STAT-01, STAT-02]

duration: 6min
completed: 2026-03-28
---

# Phase 5 Plan 2: Per-Team Career Stats Endpoint Summary

**GET /players/:id/team-stats returns per-team W/L record and KDA averages via 2-phase query with CASE-based team resolution, privacy gate (403), and OpenAPI PlayerTeamStats schema**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-28T19:44:16Z
- **Completed:** 2026-03-28T19:50:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- PlayerTeamStats named schema in OpenAPI spec with 12 properties, per-game average descriptions, and nullable role field
- /players/{id}/team-stats path with full error responses (400/403/404 referencing ErrorResponse)
- GET /players/:id/team-stats route handler with 2-phase query strategy handling zero-game teams and deleted teams
- Privacy gate consistent with /champions and /events handlers (403 for private profiles)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add PlayerTeamStats schema and path to OpenAPI spec** - `59e09ad` (feat)
2. **Task 2: Implement GET /players/:id/team-stats route handler** - `aab2e92` (feat)

## Files Created/Modified
- `lib/api-spec/openapi.yaml` - Added PlayerTeamStats schema (12 properties) and /players/{id}/team-stats path definition
- `artifacts/api-server/src/routes/players.ts` - Added team-stats route handler with 2-phase query, privacy gate, and CASE-based team resolution; added `or` to drizzle-orm imports

## Decisions Made
- Used 2-phase query (memberships first, match aggregation second) to handle zero-game teams without LEFT JOIN complexity
- 403 for private profiles (not 404) -- consistent with established /champions and /events pattern (D-07, D-08, D-09)
- SQL CASE expression resolves teamSide ("A"/"B") to actual team FKs; null results from deleted teams filtered via Map null check
- All membership statuses included (no WHERE filter on status) -- career resume model shows complete history

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged variant branch to get required schema tables**
- **Found during:** Task 2 (Route handler implementation)
- **Issue:** Worktree was forked from old branch state missing teamMembersTable, matchPlayersTable, teamsTable (team-scrim schema), and isPlayerProfileVisibleTo function
- **Fix:** Merged variant branch (FETCH_HEAD) into worktree, resolved openapi.yaml merge conflicts by keeping HEAD content (our Task 1 additions)
- **Files modified:** All files from variant merge
- **Verification:** Schema imports resolve, route handler compiles
- **Committed in:** e395034 (merge commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Merge required to access team-scrim schema. No scope creep -- exact plan implementation after merge.

## Issues Encountered
- Pre-existing TypeScript errors in players.ts (primaryRole, secondaryRole, profileVisibility properties not in schema) and other route files -- these are NOT from our changes and exist in the variant branch already. Our new team-stats handler has zero TypeScript errors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Both 05-01 (auth/me) and 05-02 (team-stats) complete -- Phase 05 finished
- Ready for Phase 06 codegen: Orval codegen will generate React Query hooks for getPlayerTeamStats
- Frontend career page can use generated hooks once codegen runs

## Self-Check: PASSED
- lib/api-spec/openapi.yaml: FOUND
- artifacts/api-server/src/routes/players.ts: FOUND
- Commit 59e09ad (Task 1): FOUND
- Commit aab2e92 (Task 2): FOUND

---
*Phase: 05-auth-stats-api*
*Completed: 2026-03-28*
