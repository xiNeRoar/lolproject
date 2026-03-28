---
status: complete
phase: 01-schema-sync-auth-hardening
source: [01-01-SUMMARY.md, 01-02-SUMMARY.md, 01-03-SUMMARY.md]
started: 2026-03-27T08:30:00.000Z
updated: 2026-03-27T09:00:00.000Z
---

## Current Test

[testing complete]

## Tests

### 1. CORS rejects untrusted origins
expected: CORS config in app.ts uses PLATFORM_URL allowlist (not wildcard). Dev mode allows localhost:5173 and localhost:3000 only.
result: pass

### 2. Session secret validation on startup
expected: Server refuses to start (exits code 1) if SESSION_SECRET is the default value in production.
result: pass

### 3. Visibility endpoint uses session playerId
expected: PUT /matches/:id/visibility derives playerId from req.session. Returns 401 when no session.
result: pass

### 4. OAuth state parameter on Discord flow
expected: crypto.randomBytes(32) state on all 3 OAuth flows. Mismatched state returns 403.
result: pass

### 5. RSO tokens not persisted to database
expected: rsoAccessToken and rsoRefreshToken set to null on insert/update. PUUID still saved.
result: pass

### 6. Schema has match_type and tournament_code columns
expected: Drizzle schema defines match_type (default 'scrim') and tournament_code (nullable).
result: pass

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
