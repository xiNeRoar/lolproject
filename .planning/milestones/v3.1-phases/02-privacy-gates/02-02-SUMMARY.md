---
phase: 02-privacy-gates
plan: 02
subsystem: api-server-visibility
tags: [privacy, visibility, rso-opt-in, profile-visibility, vod-privacy, pov-consent]
dependency_graph:
  requires:
    - phase: 02-01
      provides: privacy-gate-helpers (privacyGate.ts with isMatchVisibleTo, isPlayerProfileVisibleTo, checkCoParticipant)
  provides:
    - privacy-gated-player-endpoints
    - privacy-gated-vod-endpoints
    - rso-opt-in-player-filtering
    - pov-consent-enforcement
  affects: [frontend-player-pages, frontend-vod-pages, openapi-spec-phase-3]
tech_stack:
  added: []
  patterns: [shared-visibility-helper-import, profile-visibility-gate, pov-consent-check]
key_files:
  created: []
  modified:
    - artifacts/api-server/src/routes/players.ts
    - artifacts/api-server/src/routes/vods.ts
key_decisions:
  - "GET /players uses rsoOptIn filter with admin bypass via .where(undefined) Drizzle pattern"
  - "Private profile response returns isPrivate: true with team memberships (not 403)"
  - "POV VODs (player-pov/team-pov) filtered by individual player rsoOptIn in both list and detail"
  - "isAdmin variable declared per-handler scope (not shared across handlers)"
patterns-established:
  - "Profile sub-routes (events, champions) inherit main profile visibility gate"
  - "VOD visibility follows match visibility via isMatchVisibleTo helper"
  - "POV consent is a separate check after match visibility (D-12)"
requirements-completed: [PRIV-03, PRIV-04, PRIV-05, PRIV-06]
metrics:
  duration: 4m
  completed: "2026-03-27T07:19:21Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 02 Plan 02: Player + VOD Privacy Endpoint Enforcement Summary

**rsoOptIn filtering on player list, shared isPlayerProfileVisibleTo on all 4 profile routes, 7-day auto-public VOD bug eliminated, POV consent enforcement via rsoOptIn on vods.ts**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-27T07:15:20Z
- **Completed:** 2026-03-27T07:19:21Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- GET /players filters by rsoOptIn for non-admin requests (D-06) -- non-opted players are invisible in search
- All 4 player profile routes (by-id, riotId, events, champions) use shared isPlayerProfileVisibleTo helper
- Eliminated 7-day auto-public bug from vods.ts (deleted isMatchPublic, replaced inline visibility with shared isMatchVisibleTo)
- GET /vods/:id now checks match visibility before returning VOD data (was completely open before)
- POV VODs require individual player rsoOptIn consent in both list and detail endpoints (D-12)
- All inline visibility logic removed from players.ts (old requester_matches SQL subquery eliminated per D-14)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rsoOptIn filter and profile visibility gates to players.ts** - `c44dc0e` (feat)
2. **Task 2: Fix VOD visibility bugs and add match visibility gate to vods.ts** - `0980f5e` (feat)

## Files Created/Modified
- `artifacts/api-server/src/routes/players.ts` - Added privacyGate import, rsoOptIn filter on GET /, isPlayerProfileVisibleTo on by-id/:id, /:riotId, /:id/events, /:id/champions. Removed inline visibility logic.
- `artifacts/api-server/src/routes/vods.ts` - Added privacyGate import, deleted buggy isMatchPublic helper, replaced inline 7-day visibility with isMatchVisibleTo, added match visibility gate to GET /:id, added POV rsoOptIn consent checks.

## Decisions Made
1. **Admin bypass on GET /players uses .where(undefined):** Drizzle ORM treats `.where(undefined)` as a no-op, returning all rows. This avoids branching the query.
2. **Private profile returns isPrivate: true (not 403):** Consistent with D-07 and the existing pattern from the /:riotId route. Returns minimal data with team memberships so the frontend can show a meaningful CTA.
3. **isAdmin declared per-handler:** Each handler declares its own `isAdmin` variable from session rather than sharing across handlers, following the existing codebase pattern.
4. **Profile sub-routes return 403 for private:** Events and champions sub-routes return 403 with a message rather than minimal data, since these are data-only endpoints without a meaningful partial response.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None -- all privacy gates are fully implemented with real database queries and shared helpers.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 02 (privacy-gates) is now complete: all PRIV-01 through PRIV-06 requirements addressed
- privacyGate.ts helpers are used consistently across matches.ts, players.ts, and vods.ts
- Ready for Phase 03 (OpenAPI spec alignment to capture new response shapes like isRedacted, isPrivate)

## Self-Check: PASSED

- artifacts/api-server/src/routes/players.ts: FOUND
- artifacts/api-server/src/routes/vods.ts: FOUND
- Commit c44dc0e: FOUND
- Commit 0980f5e: FOUND

---
*Phase: 02-privacy-gates*
*Completed: 2026-03-27*
