---
phase: 02-privacy-gates
plan: 01
subsystem: api-server-visibility
tags: [privacy, visibility, match-redaction, rso-opt-in, drizzle]
dependency_graph:
  requires: []
  provides: [privacy-gate-helpers, match-visibility-enforcement]
  affects: [matches-routes, player-routes, vod-routes]
tech_stack:
  added: []
  patterns: [shared-helper-module, visibility-gate, redacted-response]
key_files:
  created:
    - artifacts/api-server/src/lib/privacyGate.ts
  modified:
    - artifacts/api-server/src/routes/matches.ts
decisions:
  - Participant check uses match_players table not team_members (D-03)
  - Redacted response uses isRedacted flag not _private (D-02)
  - visibleAfter = null means PRIVATE not 7-day default (D-11)
  - Per-player RSO opt-in filtering applied to public scrims for non-participants (D-04)
  - checkCoParticipant uses subquery pattern for efficient same-match lookup
metrics:
  duration: 7m
  completed: "2026-03-27T07:09:17Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 02 Plan 01: Privacy Gate Helpers + Match Endpoint Enforcement Summary

Shared privacyGate.ts module with 6 exported visibility functions, matches.ts fully migrated from inline isVisible/isMemberOfMatch to shared helpers with correct match_players participant check and D-04 per-player RSO opt-in filtering.

## Task Results

### Task 1: Create privacyGate.ts shared visibility helper module

**Commit:** 10ee760

Created `artifacts/api-server/src/lib/privacyGate.ts` with 6 exported functions:

1. **checkMatchParticipant** - Queries match_players (not team_members) for participant check per D-03
2. **isMatchVisibleTo** - 3-layer visibility: admin bypass, tournament/event always public (D-05), scrim participant-only with captain override, null visibleAfter = private (D-11)
3. **redactMatchForNonParticipant** - Returns team names + score + date + duration only with `isRedacted: true` flag (D-01, D-02)
4. **filterMatchPlayersByOptIn** - Batch queries rsoOptIn status, masks stats for non-opted players with `_masked: true` (D-04)
5. **isPlayerProfileVisibleTo** - Profile visibility gate: private/public/participants-only (D-07, D-08, D-09)
6. **checkCoParticipant** - Same-match check via match_players subquery (D-09)

### Task 2: Migrate matches.ts to use privacyGate.ts helpers

**Commit:** 66a1207

Modified `artifacts/api-server/src/routes/matches.ts`:

- Removed `isVisible()` function (inline visibility logic per D-14)
- Removed `isMemberOfMatch()` function (used team_members, wrong per D-03)
- Added import from `privacyGate.js` for 4 helper functions
- **GET /matches** list: strips `roflFilePath` and `visibleAfter` for non-admin responses (Pitfall 5)
- **GET /matches/:id** detail: uses `isMatchVisibleTo` + `redactMatchForNonParticipant` for redacted responses, applies `filterMatchPlayersByOptIn` for public scrims viewed by non-participants
- **GET /matches/:id/players**: uses `isMatchVisibleTo` + `filterMatchPlayersByOptIn`
- **GET /matches/:id/replay**: uses `isMatchVisibleTo` (returns 403 for binary file, not redacted)
- **PUT /matches/:id/visibility** and **POST /matches/:id/claim-team**: untouched (already correct)
- Added comment: `visibleAfter = null means PRIVATE (D-11)`

## Deviations from Plan

### [Rule 3 - Blocking] Worktree branch was behind variant

**Found during:** Initial setup
**Issue:** The worktree branch was created from an older commit that had the v1 ladder schema (1v1 with playerAId/playerBId, no matchPlayers table, no matchType/visibleAfter/rsoOptIn columns). The plan was written for the v3.1 5v5 team schema on the variant branch.
**Fix:** Merged variant into the worktree branch (fast-forward) to get the correct schema before executing.
**Files affected:** All (full codebase update via merge)

## Known Stubs

None -- no stubs introduced. All functions are fully implemented with real database queries.

## Decisions Made

1. **Existing imports kept without .js extension:** The matches.ts file had existing imports without `.js` extension (e.g., `from "../middlewares/requireAdmin"`). New privacyGate import uses `.js` extension per CLAUDE.md ESM requirement. Did not modify existing imports to minimize diff scope.
2. **checkCoParticipant uses subquery:** Instead of a self-join, uses Drizzle's `inArray` with a subquery for readability and to avoid the raw SQL alias pattern.
3. **formatMatch return type used as Record:** The `redactMatchForNonParticipant` and `filterMatchPlayersByOptIn` functions accept `Record<string, any>` to work with the formatted match objects from `formatMatch()` without requiring strict typing on the return shape.

## Self-Check: PASSED

- artifacts/api-server/src/lib/privacyGate.ts: FOUND
- artifacts/api-server/src/routes/matches.ts: FOUND
- Commit 10ee760: FOUND
- Commit 66a1207: FOUND
