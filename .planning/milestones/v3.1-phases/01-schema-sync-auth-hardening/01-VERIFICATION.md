---
phase: 01-schema-sync-auth-hardening
verified: 2026-03-26T00:00:00Z
status: human_needed
score: 6/7 must-haves verified (1 needs human confirmation)
human_verification:
  - test: "Run drizzle-kit push against production database"
    expected: "Zero pending column additions reported — match_type and tournament_code already exist"
    why_human: "No database connection available in verification environment. Schema TS files and migration SQL are correct, but actual database state cannot be confirmed without running drizzle-kit against a live DB."
  - test: "Verify 01-03-SUMMARY.md is populated"
    expected: "Summary file documents AUTH-01 and AUTH-03 work with commit hashes 61c4d6e and 3963be4"
    why_human: "The file exists but is empty (0 bytes). The code changes ARE committed and verified, but the process artifact is missing."
---

# Phase 1: Schema Sync & Auth Hardening Verification Report

**Phase Goal:** Production database has all required columns and auth flows are safe against CSRF, token leakage, and session hijacking
**Verified:** 2026-03-26
**Status:** human_needed — automated checks pass, one item needs live database confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Running `drizzle-kit push` produces zero pending column additions | ? UNCERTAIN | Schema TS files have match_type + tournament_code. Migration 0003_add_match_type_tournament_code.sql created. Cannot confirm live DB state without running push. |
| 2 | RSO and Discord OAuth flows include a cryptographic state parameter validated on callback | ✓ VERIFIED | auth.ts lines 22-41 (Discord), 144-145+188-192 (connect/RSO), 173-174+188-192 (RSO direct). 3 randomBytes calls, 2 callbacks both validate and delete state. 403 returned on mismatch. |
| 3 | CORS rejects requests from origins other than production domain | ✓ VERIFIED | app.ts lines 31-49: allowedOrigins array with PLATFORM_URL env var + localhost dev ports only. Origin callback rejects all others. No wildcard `origin: true`. |
| 4 | RSO access/refresh tokens not stored in DB — only PUUID persists | ✓ VERIFIED | auth.ts lines 287-288 (update path) and 309-310 (create path): `rsoAccessToken: null`, `rsoRefreshToken: null`. TODO comment present. tokenData.access_token only used for API call headers, not persisted. |
| 5 | Match visibility PUT endpoint derives playerId from session only | ✓ VERIFIED | matches.ts line 791: `const playerId = req.session.playerId`. Lines 792-795: 401 returned when missing. No `req.body.playerId` anywhere in matches.ts. |

**Score:** 4/5 truths fully verified, 1 uncertain (needs live DB)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `docs/SCHEMA_CONTRACT.md` | eloHistory section without playerId | ✓ VERIFIED | Lines 162-173: section header says "team-only ELO, no playerId". teamId: notNull(). No playerId column in definition or FK map. |
| `lib/db/src/schema/eloHistory.ts` | Source of truth with teamId, no playerId | ✓ VERIFIED | File has teamId as notNull FK, no playerId anywhere. 14 lines. |
| `lib/db/drizzle/migrations/0003_add_match_type_tournament_code.sql` | Migration adding match_type + tournament_code | ✓ VERIFIED | File exists. ALTER TABLE IF NOT EXISTS for both columns. Verify assertions included. |
| `artifacts/api-server/src/app.ts` | CORS allowlist + session secret startup validation | ✓ VERIFIED | allowedOrigins on lines 33-36. CORS origin callback lines 38-49. DEFAULT_SECRET guard lines 53-63. process.exit(1) on line 62. sessionSecret variable used in session config. |
| `artifacts/api-server/src/routes/matches.ts` | Session-only playerId in visibility endpoint | ✓ VERIFIED | Line 791: session-only. Line 792-795: 401 guard. grep for `req.body.*playerId` returns no matches. |
| `artifacts/api-server/src/routes/auth.ts` | OAuth state CSRF on all 3 flows + token non-persistence | ✓ VERIFIED | crypto imported line 2. 3 randomBytes calls (lines 22, 144, 173). 2 validation callbacks (lines 37, 188). rsoAccessToken: null at lines 287, 309. |
| `artifacts/api-server/src/lib/session.ts` | SessionData with oauthState field | ✓ VERIFIED | Line 14: `oauthState?: string; // CSRF state for OAuth flows (Discord + RSO)` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app.ts` | `process.env.PLATFORM_URL` | CORS origin allowlist | ✓ WIRED | Line 31: PLATFORM_URL read from env with localhost fallback. Used in allowedOrigins array line 34. |
| `app.ts` | `process.env.SESSION_SECRET` | Startup validation | ✓ WIRED | Lines 53-63: DEFAULT_SECRET defined, sessionSecret from env, isProduction guard calls process.exit(1). |
| `matches.ts` | `req.session.playerId` | Session-only auth in visibility PUT | ✓ WIRED | Line 791: `const playerId = req.session.playerId`. 401 guard immediately follows. |
| `auth.ts` | `req.session.oauthState` | State generation + validation | ✓ WIRED | Set before redirect (lines 23, 145, 174). Validated in callbacks (lines 37, 188). Deleted after validation (lines 41, 192). |
| `auth.ts` | `rsoAccessToken: null` | Token non-persistence | ✓ WIRED | Both update (line 287) and create (line 309) paths set null. TODO comment links to Tournament API. |
| `docs/SCHEMA_CONTRACT.md` | `lib/db/src/schema/eloHistory.ts` | Manual sync | ✓ WIRED | SCHEMA_CONTRACT.md lines 163-172 exactly match eloHistory.ts content. Both have teamId: notNull(), no playerId. |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase produces no data-rendering components. Changes are schema files, migration SQL, middleware configuration, and auth route logic.

---

### Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| No `origin: true` wildcard CORS | `grep "origin: true" app.ts` | No matches | ✓ PASS |
| PLATFORM_URL in allowedOrigins | `grep "PLATFORM_URL" app.ts` | Lines 31, 34 | ✓ PASS |
| process.exit(1) guards default secret | `grep "process.exit(1)" app.ts` | Line 62 | ✓ PASS |
| No body.playerId fallback in matches.ts | `grep "req.body.*playerId" matches.ts` | No matches | ✓ PASS |
| eloHistory has no playerId in doc | `grep "elo_history.playerId" SCHEMA_CONTRACT.md` | No matches | ✓ PASS |
| OAuth state in session type | `grep "oauthState" session.ts` | Line 14 | ✓ PASS |
| RSO tokens set to null | `grep "rsoAccessToken:" auth.ts` | Lines 287, 309 (both null) | ✓ PASS |
| tokenData.access_token not persisted | `grep "rsoAccessToken: tokenData"` | No matches | ✓ PASS |
| 3 flows generate state | `grep -c "randomBytes" auth.ts` | 3 | ✓ PASS |
| All commits exist in git log | `git log --oneline \| grep <hash>` | All 4 from plans 01+02 found; plan 03 commits 61c4d6e + 3963be4 also present | ✓ PASS |
| drizzle-kit push zero pending changes | Cannot run without live DB | N/A | ? SKIP |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCHM-01 | 01-01-PLAN.md | DB schema synced — match_type, tournament_code exist in production | ? UNCERTAIN | Drizzle schema TS files correct. Migration 0003 created with IF NOT EXISTS guards. Cannot confirm live DB without drizzle-kit push. |
| SCHM-02 | 01-01-PLAN.md | eloHistory.playerId resolved — SCHEMA_CONTRACT.md matches code | ✓ SATISFIED | SCHEMA_CONTRACT.md eloHistory matches eloHistory.ts exactly. No playerId in definition or FK map. Commit f59d832. |
| AUTH-01 | 01-03-PLAN.md | RSO OAuth state parameter on both Discord and RSO flows | ✓ SATISFIED | 3 flows generate state (randomBytes). 2 callbacks validate. 403 on mismatch. Commit 61c4d6e. |
| AUTH-02 | 01-02-PLAN.md | CORS restricted to production domain | ✓ SATISFIED | allowedOrigins with PLATFORM_URL env var. No wildcard. Commit 13543d5. |
| AUTH-03 | 01-03-PLAN.md | RSO token storage resolved — null persisted, columns kept | ✓ SATISFIED | rsoAccessToken: null, rsoRefreshToken: null in both DB write paths. TODO comment added. Schema columns retained. Commit 3963be4. |
| AUTH-04 | 01-02-PLAN.md | Session secret enforced as non-default in production | ✓ SATISFIED | process.exit(1) guard on DEFAULT_SECRET in isProduction. Commit 13543d5. |
| AUTH-05 | 01-02-PLAN.md | Match visibility endpoint rejects spoofed playerId in body | ✓ SATISFIED | Session-only playerId. 401 on missing session. No body.playerId anywhere. Commit 1e3ae5a. |

**Coverage:** 6/7 requirements satisfied, 1 uncertain (SCHM-01 — needs live DB confirmation)

Note: REQUIREMENTS.md marks AUTH-02, AUTH-04, AUTH-05 as `[x]` Complete and AUTH-01, AUTH-03 as `[ ]` Pending — consistent with plan 01-02 completing before plan 01-03. All 7 requirements have implementation evidence.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `01-03-SUMMARY.md` | — | Empty file (0 bytes) | ℹ️ Info | Process gap only — the code changes ARE committed and verified. Summary was not written after plan 03 executed. |
| `auth.ts` | 37, 188 | Only 2 state validation callbacks (plan expected 3) | ℹ️ Info | Functionally correct — /connect/:token redirects to RSO and its state is validated by /rso/callback. Not a security gap. |

No blocking anti-patterns found. No TODO/placeholder stubs in implementation code. No hardcoded empty data returns.

---

### Human Verification Required

#### 1. Confirm database schema sync (SCHM-01)

**Test:** Connect to the production PostgreSQL database and run one of:
- `SELECT column_name FROM information_schema.columns WHERE table_name='matches' AND column_name IN ('match_type', 'tournament_code');`
- Or: `cd lib/db && pnpm drizzle-kit push` and confirm "No changes detected" or apply the migration

**Expected:** Both `match_type` and `tournament_code` columns exist in the `matches` table. If not yet applied, running the migration at `lib/db/drizzle/migrations/0003_add_match_type_tournament_code.sql` should add them safely (IF NOT EXISTS guards).

**Why human:** No database connection is available in the verification environment. The Drizzle schema TS files are correct and the migration SQL is ready, but the actual live database state cannot be confirmed programmatically.

#### 2. Populate 01-03-SUMMARY.md

**Test:** Open `.planning/phases/01-schema-sync-auth-hardening/01-03-SUMMARY.md`

**Expected:** File should contain a summary of AUTH-01 (OAuth state parameter) and AUTH-03 (RSO token non-persistence) work, with commit hashes `61c4d6e` and `3963be4`.

**Why human:** The file exists but is empty (0 bytes). The code changes are committed and verified correct. The summary was not written during plan 03 execution. This is a process artifact gap, not a code gap — no automated check can write the summary.

---

### Gaps Summary

No code gaps were found that block the phase goal. All 7 requirements have implementation evidence in the codebase:

- SCHM-02, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05: fully verified against actual source files
- SCHM-01: schema TS files and migration SQL are correct; the only uncertainty is whether the migration has been applied to the live database (a deployment concern, not a code concern)

The phase goal — "Production database has all required columns and auth flows are safe against CSRF, token leakage, and session hijacking" — is **achieved in code**. The auth hardening changes are complete and correct. The schema migration is ready but requires a database deployment to confirm the production state.

Two process artifacts need attention:
1. 01-03-SUMMARY.md is empty and should be written
2. SCHM-01 final confirmation requires a live database check

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
