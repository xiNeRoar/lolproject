---
phase: 01-schema-sync-auth-hardening
plan: 03
status: complete
requirements_addressed: [AUTH-01, AUTH-03]
files_modified:
  - artifacts/api-server/src/lib/session.ts
  - artifacts/api-server/src/routes/auth.ts
decisions:
  - "OAuth CSRF state uses crypto.randomUUID() stored in session, validated on callback"
  - "RSO tokens set to null on write (keep columns for future Tournament API per D-05)"
commits:
  - hash: 61c4d6e
    message: "feat(01-03): add OAuth CSRF state parameter to all 3 auth flows (AUTH-01)"
  - hash: 3963be4
    message: "fix(01-03): stop persisting RSO tokens to database (AUTH-03)"
completed: 2026-03-26
---

# Phase 1 Plan 3: OAuth State Parameters and RSO Token Removal

OAuth CSRF state validation on all three auth flows (Discord, RSO, /connect) plus RSO token write removal.

## What Was Done

### AUTH-01: OAuth CSRF State Parameter

**Commit:** 61c4d6e

Added cryptographic state parameter to all three OAuth initiation flows:

1. **Discord OAuth** (`/auth/discord`): Generates `crypto.randomUUID()`, stores in `req.session.oauthState`, appends to Discord authorize URL as `state` param. Callback validates state matches session value; returns 403 on mismatch.

2. **RSO OAuth** (`/auth/rso`): Same pattern -- generates state, stores in session, validates on callback. Prevents CSRF attacks where an attacker could trick a user into linking a different Riot account.

3. **Bot /connect flow** (`/auth/connect`): State parameter added to the RSO redirect initiated from the connect token flow.

**Files modified:**
- `artifacts/api-server/src/lib/session.ts` -- Added `oauthState` field to SessionData interface
- `artifacts/api-server/src/routes/auth.ts` -- State generation on initiation, validation on callback for all 3 flows

### AUTH-03: RSO Token Write Removal

**Commit:** 3963be4

Stopped persisting RSO access and refresh tokens to the database. VCLoL only needs the PUUID extracted during the token exchange -- storing the tokens is an unnecessary security risk.

**Changes:**
- RSO callback update path: Set `rsoAccessToken: null` and `rsoRefreshToken: null` explicitly
- RSO callback insert path: Same null values for new player creation
- Token exchange itself preserved -- PUUID extraction still works via the id_token/userinfo response
- Schema columns (`rso_access_token`, `rso_refresh_token`) kept in place for future Tournament API milestone (D-05)

**Files modified:**
- `artifacts/api-server/src/routes/auth.ts` -- Null out token fields on both update and insert code paths

## Deviations from Plan

None -- plan executed exactly as written.

## Verification

- OAuth state mismatch returns 403 (tested all 3 flows)
- RSO tokens written as null (verified in both update and insert paths)
- PUUID extraction still functional (token exchange preserved)
