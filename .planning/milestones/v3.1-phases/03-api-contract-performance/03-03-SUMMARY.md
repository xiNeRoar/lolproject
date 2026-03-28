---
phase: 03-api-contract-performance
plan: 03
subsystem: api
tags: [openapi, codegen, orval, react-query, zod, auth, pagination, privacy]

requires:
  - phase: 03-api-contract-performance
    provides: "formatMatch shared formatter, pagination wrappers, privacy gate helpers"
provides:
  - "OpenAPI spec aligned with all 7 actual auth endpoints"
  - "Privacy response fields documented (isRedacted, _masked, isPrivate)"
  - "Paginated response wrappers for GET /players and GET /matches"
  - "Regenerated React Query hooks and Zod validators"
affects: [frontend, api-client-react, api-zod]

tech-stack:
  added: []
  patterns:
    - "PaginatedPlayers/PaginatedMatches wrapper schemas for list endpoints"
    - "MatchListItem allOf extension of Match with vodCount"

key-files:
  created: []
  modified:
    - "lib/api-spec/openapi.yaml"
    - "lib/api-client-react/src/generated/api.ts"
    - "lib/api-client-react/src/generated/api.schemas.ts"
    - "lib/api-zod/src/generated/api.ts"
    - "lib/api-zod/src/generated/types/ (7 new, 90+ modified)"

key-decisions:
  - "Player schema already includes primaryTeam/totalGames/winRate from 03-02; reused as PaginatedPlayers.data item"
  - "MatchListItem extends Match via allOf with vodCount field added"
  - "Auth /me endpoint kept existing operationId (getAuthMe) for backward compat"

patterns-established:
  - "PaginatedResponse: { data: T[], total: integer, page: integer, totalPages: integer }"

requirements-completed: [SPEC-01, SPEC-02]

duration: 13min
completed: 2026-03-27
---

# Phase 03 Plan 03: OpenAPI Spec Alignment and Codegen Summary

**Aligned OpenAPI spec with all 7 auth routes, added privacy response fields and paginated wrappers, then regenerated frontend hooks and Zod validators via Orval codegen.**

## Performance

- **Duration:** 13 min
- **Started:** 2026-03-27T12:30:53Z
- **Completed:** 2026-03-27T12:44:20Z
- **Tasks:** 2/2
- **Files modified:** ~100 (1 spec + ~99 generated)

## Accomplishments

### Task 1: Full OpenAPI Spec Alignment (5e5d875)

Replaced incorrect auth endpoints and added all missing ones:

- **Removed:** `/auth/rso/authorize` (wrong path), `POST /auth/connect` (wrong method + path)
- **Added:** `GET /auth/discord` (operationId: authDiscord), `GET /auth/discord/callback` (authDiscordCallback), `GET /auth/connect/{token}` (authConnectToken), `GET /auth/rso` (authRso), `GET /auth/rso/callback` (authRsoCallback), `POST /auth/logout` (authLogout)
- **Kept:** `GET /auth/me` (getAuthMe) unchanged

Added privacy response fields:
- `isRedacted: boolean` on MatchDetail schema
- `_masked: boolean` on MatchPlayerEntry schema
- `isPrivate: boolean` on PlayerProfile schema

Added paginated response wrappers:
- `PaginatedPlayers` schema wrapping Player[] with total/page/totalPages
- `PaginatedMatches` schema wrapping MatchListItem[] with total/page/totalPages
- `MatchListItem` schema (Match + vodCount)
- Added `page` and `limit` query params to GET /players and GET /matches
- Added `format` query param to GET /matches (was missing)

### Task 2: Orval Codegen (5dd555a)

Ran `pnpm run codegen` in `lib/api-spec/` successfully:
- Generated React Query hooks for all 7 auth endpoints
- Generated PaginatedPlayers and PaginatedMatches TypeScript types
- Generated Zod validators for all new schemas
- Old wrong types removed (getRsoAuthorizeParams, postAuthConnect200, postAuthConnectBody)
- 7 new type files created, 90+ existing files updated

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- all schemas reference actual backend response shapes.

## Self-Check: PASSED

- All 4 key files exist
- Both commit hashes (5e5d875, 5dd555a) found in git log
