---
phase: 02-privacy-gates
verified: 2026-03-27T07:24:59Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 2: Privacy Gates Verification Report

**Phase Goal:** Every API response respects the 3-layer visibility model -- scrims restricted, tournaments public, player profiles gated by opt-in
**Verified:** 2026-03-27T07:24:59Z
**Status:** passed
**Re-verification:** No -- initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Non-participant requesting a scrim match detail receives team names, score, date, game duration only -- no player stats | VERIFIED | `redactMatchForNonParticipant()` in privacyGate.ts strips all player data; `isRedacted: true` in output; called at matches.ts:517 |
| 2 | Tournament/event match detail is fully visible to any requester regardless of login | VERIFIED | privacyGate.ts:62 -- `matchType === "ranked_tournament" \|\| matchType === "event"` returns `canSeeStats: true` unconditionally (unless captain set far-future private) |
| 3 | Redacted match responses include `isRedacted: true` flag, not `_private: true` | VERIFIED | `isRedacted: true` hardcoded in `redactMatchForNonParticipant` (privacyGate.ts:118); zero instances of `_private` in matches.ts |
| 4 | Participant check uses `match_players` table, not `team_members` | VERIFIED | `checkMatchParticipant` queries `matchPlayersTable` with `and(eq(matchPlayersTable.matchId,...), eq(matchPlayersTable.playerId,...))` (privacyGate.ts:28-38); `teamMembersTable` absent from privacyGate.ts (grep count: 0) |
| 5 | Captain `/visibility public` for scrims masks per-player stats for players without rsoOptIn | VERIFIED | `filterMatchPlayersByOptIn` batch-queries `rsoOptIn`, returns `_masked: true` for non-opted players; called in matches.ts:537 when `isPublicScrimNonParticipant` |
| 6 | All match visibility logic uses shared `privacyGate.ts` helpers, no inline visibility logic remains in matches.ts | VERIFIED | Old `isVisible()` and `isMemberOfMatch()` functions are gone (grep returns 0); `isMatchVisibleTo` called 3x in matches.ts (/:id, /:id/players, /:id/replay) |
| 7 | GET /players omits any player whose `rsoOptIn` is false -- non-opted players do not appear in list | VERIFIED | players.ts:213 -- `.where(isAdmin ? undefined : eq(playersTable.rsoOptIn, true))` |
| 8 | GET /players/by-id/:id returns 403 with minimal response for private profiles viewed by non-owners | VERIFIED | players.ts:382-401 -- returns `{ id, riotId, isPrivate: true, teams }` when `!canSeeProfile` |
| 9 | GET /players/:riotId uses shared `isPlayerProfileVisibleTo` helper, not inline logic | VERIFIED | players.ts:426 calls `isPlayerProfileVisibleTo`; old `requester_matches` SQL subquery and `const visibility` pattern are gone (grep: 0) |
| 10 | GET /players/:id/events and GET /players/:id/champions respect profile visibility | VERIFIED | players.ts:588 (events) and 663 (champions) both call `isPlayerProfileVisibleTo` and return 403 when `!canSeeProfile` |
| 11 | GET /vods list does not auto-publish VODs after 7 days when visibleAfter is null | VERIFIED | `isMatchPublic` function deleted from vods.ts (grep: 0); `7 * 24 * 60 * 60 * 1000` pattern absent (grep: 0); visibility now delegated to `isMatchVisibleTo` which treats `visibleAfter = null` as private |
| 12 | GET /vods/:id checks match visibility before returning VOD data | VERIFIED | vods.ts:226-238 -- fetches match, calls `isMatchVisibleTo`, returns 403 if `!canSeeStats` |
| 13 | POV VODs require individual player `rsoOptIn` regardless of match visibility | VERIFIED | vods.ts:176-195 (list) and 240-247 (detail) -- both filter `player-pov`/`team-pov` by `rsoOptIn = true` |

**Score:** 13/13 truths verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `artifacts/api-server/src/lib/privacyGate.ts` | Shared visibility helper module | VERIFIED | 250 lines, 6 exported functions, real DB queries |
| `artifacts/api-server/src/routes/matches.ts` | Privacy-gated match endpoints | VERIFIED | Imports privacyGate.js, 7 uses of helper functions, old inline functions removed |
| `artifacts/api-server/src/routes/players.ts` | Privacy-gated player endpoints | VERIFIED | Imports privacyGate.js, `isPlayerProfileVisibleTo` called 4x (by-id, riotId, events, champions) |
| `artifacts/api-server/src/routes/vods.ts` | Privacy-gated VOD endpoints with 7-day bug fix | VERIFIED | Imports privacyGate.js, `isMatchVisibleTo` called 3x, 7-day bug eliminated |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `matches.ts` | `privacyGate.ts` | `import { isMatchVisibleTo, checkMatchParticipant, redactMatchForNonParticipant, filterMatchPlayersByOptIn }` | WIRED | matches.ts line 20; all 4 functions actively called |
| `players.ts` | `privacyGate.ts` | `import { isPlayerProfileVisibleTo }` | WIRED | players.ts line 16; called 4 times in profile routes |
| `vods.ts` | `privacyGate.ts` | `import { isMatchVisibleTo }` | WIRED | vods.ts line 16; called 3 times (list loop, detail check) |
| `privacyGate.ts` | `@workspace/db` | `matchPlayersTable`, `playersTable` | WIRED | privacyGate.ts lines 11-12; both tables actively queried |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `privacyGate.ts / checkMatchParticipant` | `row` (match participant) | `db.select().from(matchPlayersTable).where(and(...)).limit(1)` | Yes -- Drizzle query against real table | FLOWING |
| `privacyGate.ts / filterMatchPlayersByOptIn` | `optInMap` (player opt-in status) | `db.select().from(playersTable).where(inArray(...))` | Yes -- batch DB query | FLOWING |
| `privacyGate.ts / checkCoParticipant` | `row` (co-participant match) | Drizzle `inArray` subquery over `matchPlayersTable` | Yes -- two-table subquery | FLOWING |
| `players.ts / GET /` | `players` (filtered list) | `db.select().from(playersTable).where(eq(playersTable.rsoOptIn, true))` | Yes -- DB-level filter | FLOWING |
| `matches.ts / GET /:id` | `canSeeStats, isParticipant` | `isMatchVisibleTo()` delegates to DB queries | Yes -- all paths hit real DB | FLOWING |
| `vods.ts / GET /` | `matchVisibility` (per-match visibility map) | `isMatchVisibleTo()` per match row fetched from DB | Yes | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED -- no runnable entry points available without starting the server. Visibility logic is fully testable at the code level; data flow tracing confirms all paths hit real DB queries.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PRIV-01 | 02-01-PLAN | Match detail API returns Team A vs B + score only for non-participant scrims (Layer 1) | SATISFIED | `redactMatchForNonParticipant` strips player stats; `isMatchVisibleTo` gates `/matches/:id` |
| PRIV-02 | 02-01-PLAN | Tournament/event matches bypass visibility gate -- always public (Layer 3) | SATISFIED | privacyGate.ts:62 explicit matchType check returns `canSeeStats: true` for `ranked_tournament`/`event` |
| PRIV-03 | 02-02-PLAN | Player search API filters by rsoOptIn -- non-opted players invisible | SATISFIED | players.ts:213 `.where(isAdmin ? undefined : eq(playersTable.rsoOptIn, true))` |
| PRIV-04 | 02-02-PLAN | Player profile API respects profileVisibility setting (private/public/participants-only) | SATISFIED | `isPlayerProfileVisibleTo` handles all three modes including co-participant subquery; used on 4 routes |
| PRIV-05 | 02-02-PLAN | VOD visibility follows match visibility -- fix 7-day auto-public bug in vods.ts | SATISFIED | `isMatchPublic` deleted; `7 * 24 * 60 * 60 * 1000` pattern gone; `isMatchVisibleTo` replaces both |
| PRIV-06 | 02-01-PLAN + 02-02-PLAN | Visibility logic consolidated into shared helper (eliminate divergent implementations) | SATISFIED | Single `privacyGate.ts` module; inline `isVisible`, `isMemberOfMatch`, `isMatchPublic`, `requester_matches` SQL all eliminated |

No orphaned requirements: all 6 PRIV requirements appear in plan frontmatter and are implemented.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| -- | -- | -- | -- | -- |

No TODO/FIXME/placeholder comments in any phase file. No stub returns. No hardcoded empty data arrays flowing to user-visible output. The `teamMembersTable` usage in matches.ts lines 881-886 is in the `/claim-team` endpoint (PUUID matching for team verification) -- unrelated to visibility logic, not an anti-pattern.

---

### Human Verification Required

#### 1. Scrim privacy end-to-end

**Test:** Submit a scrim match. As a non-participant logged-in user, fetch `GET /api/matches/:id`. Verify response has `isRedacted: true`, `matchPlayers: []`, and no `roflFilePath`.
**Expected:** Only `teamAName`, `teamBName`, `score`, `gameDuration`, `createdAt` and similar non-player fields visible.
**Why human:** Requires a running server with real session cookies and a match in the DB.

#### 2. Captain public override + RSO masking

**Test:** Captain sets scrim to public via `/visibility`. As a non-participant without RSO opt-in, fetch `GET /api/matches/:id`. Verify that players without `rsoOptIn = true` have their per-player stats masked (`_masked: true`) while team score remains visible.
**Expected:** Players with `rsoOptIn = true` show full stats; others show nulled champion/kills/etc.
**Why human:** Requires real match data with mixed rsoOptIn states.

#### 3. Tournament always-public

**Test:** Create a match with `matchType = ranked_tournament`. Fetch `GET /api/matches/:id` with no session (unauthenticated). Verify full 10-player stats are returned.
**Expected:** `isRedacted` is absent from response; all `matchPlayers` entries have real data.
**Why human:** Requires a running server and a tournament match in the DB.

---

### Gaps Summary

No gaps. All 13 observable truths verified against actual code. All 6 requirement IDs satisfied with direct code evidence. All 4 artifacts exist, are substantive (real DB queries, no stubs), are wired (imported and called), and have verified data flow. All commits documented in SUMMARYs are confirmed to exist in git history. No anti-patterns found.

---

_Verified: 2026-03-27T07:24:59Z_
_Verifier: Claude (gsd-verifier)_
