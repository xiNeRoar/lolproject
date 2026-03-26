---
phase: 01-schema-sync-auth-hardening
plan: 02
subsystem: api-server
tags: [security, cors, session, auth-hardening]
dependency_graph:
  requires: []
  provides: [cors-allowlist, session-secret-validation, visibility-session-auth]
  affects: [artifacts/api-server/src/app.ts, artifacts/api-server/src/routes/matches.ts]
tech_stack:
  added: []
  patterns: [cors-origin-allowlist, startup-validation-guard, session-only-auth]
key_files:
  created: []
  modified:
    - artifacts/api-server/src/app.ts
    - artifacts/api-server/src/routes/matches.ts
decisions:
  - CORS allowlist uses PLATFORM_URL env var with localhost fallbacks in dev only
  - Session secret validation exits process with code 1 in production (fail-fast)
  - Visibility endpoint returns 401 (not 403) when session missing for correct HTTP semantics
metrics:
  duration: 1m
  completed: "2026-03-26T23:14:48Z"
---

# Phase 01 Plan 02: CORS Restriction, Session Secret Validation, Visibility Endpoint Fix Summary

CORS restricted to PLATFORM_URL allowlist, session secret startup guard prevents default value in production, visibility endpoint playerId derived exclusively from session (AUTH-02, AUTH-04, AUTH-05).

## What Was Done

### Task 1: Restrict CORS to allowlist and add session secret startup validation (AUTH-02, AUTH-04)
- Replaced wildcard `cors({ origin: true })` with origin callback checking against `allowedOrigins` array
- `allowedOrigins` includes `PLATFORM_URL` env var (production) plus localhost:5173 and localhost:3000 (dev only)
- Added `DEFAULT_SECRET` constant and startup validation: server calls `process.exit(1)` if default secret is used in production
- Updated session config to use `sessionSecret` variable instead of inline fallback
- **Commit:** 13543d5

### Task 2: Fix visibility endpoint to use session-only playerId (AUTH-05)
- Removed `(req.body as any).playerId` fallback from match visibility PUT endpoint
- playerId now derived exclusively from `req.session.playerId`
- Changed error response from 403 to 401 when session is missing (correct HTTP semantics for unauthenticated)
- Verified no other `req.body.playerId` patterns exist in matches.ts
- **Commit:** 1e3ae5a

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- `grep "origin: true" artifacts/api-server/src/app.ts` -- no matches (PASS)
- `grep "allowedOrigins" artifacts/api-server/src/app.ts` -- found on lines 33, 41 (PASS)
- `grep "process.exit(1)" artifacts/api-server/src/app.ts` -- found on line 62 (PASS)
- `grep "req.body.*playerId" artifacts/api-server/src/routes/matches.ts` -- no matches (PASS)
- TypeScript compilation -- could not run (node/pnpm not available in shell environment), changes are minimal and syntactically verified

## Known Stubs

None.

## Self-Check: PASSED

- artifacts/api-server/src/app.ts: FOUND
- artifacts/api-server/src/routes/matches.ts: FOUND
- Commit 13543d5: FOUND
- Commit 1e3ae5a: FOUND
