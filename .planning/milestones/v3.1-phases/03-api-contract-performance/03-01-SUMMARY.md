---
phase: 03-api-contract-performance
plan: 01
subsystem: api
tags: [formatters, elo, race-condition, drizzle, for-update, code-dedup]

# Dependency graph
requires:
  - phase: 01-schema-sync-auth-hardening
    provides: matchType column in matches schema, matchType guard pattern in matches.ts
provides:
  - Shared formatMatch utility in formatters.ts (single source of truth)
  - ELO guard in submitRofl preventing scrim ELO computation
  - FOR UPDATE locking on team W/L counter reads in matchRecorder and submitRofl
affects: [03-api-contract-performance]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared formatter extraction pattern: single formatMatch in lib/formatters.ts"
    - "ELO eligibility guard pattern: eloEligible = matchType === ranked_tournament || event"
    - "FOR UPDATE row locking on read-compute-write operations inside transactions"

key-files:
  created:
    - artifacts/api-server/src/lib/formatters.ts
  modified:
    - artifacts/api-server/src/routes/matches.ts
    - artifacts/api-server/src/routes/teams.ts
    - artifacts/api-server/src/routes/submitRofl.ts
    - artifacts/discord-bot/src/lib/matchRecorder.ts

key-decisions:
  - "Added matchType field to shared formatMatch output (was missing from matches.ts superset)"
  - "Used hardcoded resolvedMatchType='scrim' in submitRofl since rofl parse result has no matchType property"
  - "Separated W/L updates from ELO application in submitRofl (W/L always runs, ELO guarded)"

patterns-established:
  - "Shared formatters in lib/formatters.ts for response shape consistency"
  - "eloEligible guard pattern for match type filtering"

requirements-completed: [PERF-01]

# Metrics
duration: 11min
completed: 2026-03-27
---

# Phase 03 Plan 01: Shared Formatter + ELO Guard + FOR UPDATE Locking Summary

**Extracted duplicate formatMatch into shared utility, added ELO guard to submitRofl scrims, and FOR UPDATE row locking on bot+API team W/L counter reads**

## Performance

- **Duration:** 11 min
- **Started:** 2026-03-27T08:23:25Z
- **Completed:** 2026-03-27T08:34:14Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Extracted three-copy formatMatch duplication into single shared `formatters.ts` utility
- Fixed correctness bug: submitRofl no longer applies team ELO changes to scrim matches
- Closed race condition: both matchRecorder (bot) and submitRofl (API) now use FOR UPDATE locking on team W/L counter reads

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract shared formatMatch to formatters.ts** - `d3f3f82` (refactor)
2. **Task 2: Fix submitRofl ELO guard + FOR UPDATE in matchRecorder + submitRofl** - `76e41ce` (fix)

## Files Created/Modified
- `artifacts/api-server/src/lib/formatters.ts` - Shared formatMatch utility with superset fields + optional extra params
- `artifacts/api-server/src/routes/matches.ts` - Removed local formatMatch, imports shared version
- `artifacts/api-server/src/routes/teams.ts` - Removed local formatMatch, imports shared version
- `artifacts/api-server/src/routes/submitRofl.ts` - Separated W/L from ELO, added eloEligible guard, added FOR UPDATE
- `artifacts/discord-bot/src/lib/matchRecorder.ts` - Added FOR UPDATE on team W/L counter reads

## Decisions Made
- Added `matchType` field to the shared formatMatch output since it was missing from the original superset in matches.ts but exists in the schema
- Used hardcoded `resolvedMatchType = "scrim"` in submitRofl because the `match` variable is a RoflMatch parse result (no matchType property), and submitRofl always creates scrims
- Separated W/L counter updates from ELO application in submitRofl: W/L always runs for identified teams, ELO is wrapped in `eloEligible` guard

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Adapted plan to actual codebase file locations**
- **Found during:** Task 1 (formatMatch extraction)
- **Issue:** Plan referenced teams.ts formatMatch but the worktree was on an older commit missing several files. Plan interfaces showed a different matches.ts signature than actual code.
- **Fix:** Merged latest variant branch to get all files, then adapted extraction to actual code (matches.ts had full privacy gate imports, teams.ts had additional team/member formatters)
- **Files modified:** N/A (process adaptation only)
- **Verification:** All acceptance criteria pass against actual code

**2. [Rule 1 - Bug] Fixed matchType reference in submitRofl ELO guard**
- **Found during:** Task 2 (submitRofl ELO guard)
- **Issue:** Plan suggested `match.matchType` but `match` is the RoflMatch parse result (no matchType field), not a DB match row
- **Fix:** Used `const resolvedMatchType = "scrim"` as plan's fallback suggests, since submitRofl always creates scrims
- **Files modified:** artifacts/api-server/src/routes/submitRofl.ts
- **Verification:** grep confirms `resolvedMatchType` and `eloEligible` present
- **Committed in:** 76e41ce (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered
- Worktree was on an older commit missing submitRofl.ts, teams.ts, and matchRecorder.ts. Resolved by merging variant branch (fast-forward).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shared formatMatch utility ready for use by future routes
- ELO guard pattern established for any future match submission endpoints
- FOR UPDATE locking pattern applied to both bot and API team W/L operations

## Self-Check: PASSED

All created files verified to exist. All commit hashes verified in git log.

---
*Phase: 03-api-contract-performance*
*Completed: 2026-03-27*
