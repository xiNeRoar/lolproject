---
phase: 01-schema-sync-auth-hardening
plan: 03
subsystem: auth
tags: [oauth, csrf, security, rso, discord]

requires:
  - phase: none
    provides: n/a
provides:
  - OAuth CSRF state parameter protection on all 3 auth flows
  - RSO token persistence removed (only PUUID persists)
affects: [api-server, auth, tournament-api-future]

tech-stack:
  added: [node:crypto]
  patterns: [oauth-state-csrf-protection, null-token-persistence]

key-files:
  created: []
  modified:
    - artifacts/api-server/src/routes/auth.ts
    - artifacts/api-server/src/lib/session.ts

key-decisions:
  - "Single oauthState session key shared across Discord/RSO/connect flows (one flow active per session)"
  - "RSO tokens set to null on persist; token exchange preserved for PUUID extraction"
  - "Schema columns rsoAccessToken/rsoRefreshToken kept for future Tournament API (per D-05)"

patterns-established:
  - "OAuth CSRF: generate crypto.randomBytes(32) state before redirect, validate on callback, delete after use"
  - "Token non-persistence: exchange tokens for identity data but never store sensitive tokens in DB"

requirements-completed: [AUTH-01, AUTH-03]

duration: 2min
completed: 2026-03-26
---

# Phase 01 Plan 03: OAuth CSRF State + Token Non-Persistence Summary

**Added cryptographic CSRF state parameters to all 3 OAuth flows (Discord, RSO, /connect) and stopped persisting RSO tokens to the database.**

## What Was Done

### Task 1: OAuth State Parameter (AUTH-01)

Added CSRF protection to all OAuth flows using a cryptographic state parameter:

- **session.ts**: Added `oauthState?: string` to `SessionData` interface
- **auth.ts**: Added `import crypto from "node:crypto"`
- **Discord initiation** (`GET /auth/discord`): Generates 32-byte hex state, stores in session, adds to redirect params
- **RSO initiation** (`GET /auth/rso`): Same pattern
- **/connect initiation** (`GET /auth/connect/:token`): Same pattern
- **Discord callback**: Validates state matches session, returns 403 on mismatch, deletes after use
- **RSO callback** (shared by /rso and /connect flows): Same validation pattern

**Commit:** 61c4d6e

### Task 2: RSO Token Non-Persistence (AUTH-03)

Stopped writing RSO access/refresh tokens to the database:

- **Update path** (existing player): `rsoAccessToken: null, rsoRefreshToken: null`
- **Insert path** (new player): `rsoAccessToken: null, rsoRefreshToken: null`
- Token exchange code preserved (needed to extract PUUID from Riot Account API)
- Schema columns in `players.ts` untouched (kept for future Tournament API per D-05)
- TODO comments added linking to future encrypted token storage requirement

**Commit:** 3963be4

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - no stubs or placeholder data introduced.

## Verification Results

| Check | Expected | Actual |
|-------|----------|--------|
| `crypto.randomBytes` count in auth.ts | 3 | 3 |
| `req.session.oauthState = state` count | 3 | 3 |
| State validation in callbacks | 2 (Discord + RSO shared) | 2 |
| `rsoAccessToken: null` count | 2 | 2 |
| `tokenData.access_token` DB writes | 0 | 0 |
| Schema columns preserved | Yes | Yes |
| Token exchange code preserved | Yes | Yes |

## Self-Check: PASSED

- FOUND: artifacts/api-server/src/routes/auth.ts
- FOUND: artifacts/api-server/src/lib/session.ts
- FOUND: commit 61c4d6e (Task 1)
- FOUND: commit 3963be4 (Task 2)
