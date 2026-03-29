---
phase: 11-player-career-resume
verified: 2026-03-29T03:17:30Z
status: passed
score: 5/5 must-haves verified
re_verification: false
---

# Phase 11: Player Career Resume Verification Report

**Phase Goal:** Players can see their per-team competitive history (W/L record, KDA averages) on their profile page
**Verified:** 2026-03-29T03:17:30Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | PlayerProfile page shows a career card for each team the player has been on | VERIFIED | `careerCards.map()` at line 376 renders one row per deduplicated team from `useGetPlayerTeamStats` |
| 2 | Each career card displays team name, role, win/loss record, and KDA averages | VERIFIED | Lines 385-411: team name Link, role Badge, green-400 W / red-400 L, avgKills/Deaths/Assists .toFixed(1) |
| 3 | Duplicate team memberships (leave + rejoin) deduplicated into a single card per team | VERIFIED | Lines 136-176: Map-based merge by teamId with weighted-average KDA, summed W/L/gamesPlayed, latest joinedAt for status/role |
| 4 | Career history section hidden when player has no team stats | VERIFIED | Line 366: `{careerCards.length > 0 && (` -- section not rendered when empty |
| 5 | Inactive team cards visually muted with opacity-60 | VERIFIED | Line 382: `${isInactive ? " opacity-60" : ""}` applied to entire row div |

**Score:** 5/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `artifacts/vclol/src/pages/public/PlayerProfile.tsx` | Career History section rendered from useGetPlayerTeamStats hook | VERIFIED | 616 lines, contains `useGetPlayerTeamStats` import (line 4), hook call (line 132), deduplication IIFE (lines 136-176), Career History JSX (lines 366-420) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| PlayerProfile.tsx | /api/players/:id/team-stats | useGetPlayerTeamStats hook | WIRED | Import at line 4, hook call at line 132 with `player?.id ?? 0` and `enabled: !!player?.id && !isPrivate` guard |
| useGetPlayerTeamStats (api-client-react) | OpenAPI spec | Orval codegen | WIRED | openapi.yaml line 868 defines `/players/{id}/team-stats`, generated hook at api.ts line 2963 |
| API route /players/:id/team-stats | Database | Drizzle ORM queries | WIRED | players.ts lines 790-825: queries teamMembersTable + matchPlayersTable with JOINs, returns `res.json(results)` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| PlayerProfile.tsx | teamStats (line 132) | useGetPlayerTeamStats -> GET /api/players/:id/team-stats | Yes -- DB queries teamMembersTable JOIN teamsTable + matchPlayersTable JOIN matchesTable, returns merged results via res.json() | FLOWING |

### Behavioral Spot-Checks

Step 7b: SKIPPED (no running server available; frontend requires dev server + database connection for live data)

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-----------|-------------|--------|----------|
| PROF-01 | 11-01-PLAN.md | PlayerProfile page renders per-team career cards using useGetPlayerTeamStats hook | SATISFIED | useGetPlayerTeamStats hook imported and called; careerCards rendered with team name, tag, role, W/L, KDA, win rate, games played |
| PROF-02 | 11-01-PLAN.md | Career cards show team name, role, W/L record, and KDA averages per team | SATISFIED | Lines 385 (team name + tag Link), 390 (role Badge), 399-401 (W/L green/red), 404 (KDA .toFixed(1)) |

No orphaned requirements found. REQUIREMENTS.md traceability table maps only PROF-01 and PROF-02 to Phase 11, both claimed by 11-01-PLAN.md.

### UI-SPEC Compliance

| UI-SPEC Contract | Expected | Actual | Status |
|-----------------|----------|--------|--------|
| Card wrapper | `bg-card/40 border-border/40 mb-6` | Line 367: exact match | PASS |
| CardHeader | `pb-3` | Line 368: exact match | PASS |
| CardTitle | `text-base font-display flex items-center gap-2` | Line 369: exact match | PASS |
| Users icon | `w-4 h-4 text-primary` | Line 370: exact match | PASS |
| Section heading copy | "Career History" | Line 371: exact match | PASS |
| CardContent override | `p-0` | Line 374: exact match | PASS |
| Divide rows | `divide-y divide-border/30` | Line 375: exact match | PASS |
| Row layout | `px-6 py-3 flex items-center gap-4` | Line 382: exact match | PASS |
| Left block | `flex-1 min-w-0` | Line 383: exact match | PASS |
| Team name Link | `text-sm font-medium hover:text-primary transition-colors truncate block` | Line 385: exact match | PASS |
| Team tag | inline `[TAG]` in `text-muted-foreground` | Line 386: exact match | PASS |
| Role badge | `Badge variant="outline"` with `text-xs`, only if role truthy | Line 390: exact match | PASS |
| Inactive label | `text-xs text-muted-foreground` "Inactive" | Line 391: exact match | PASS |
| Joined date | "Joined Mon YYYY" via `toLocaleDateString("en-CA", { year: "numeric", month: "short" })` | Line 393: exact match | PASS |
| Right block | `text-right shrink-0` | Line 397: exact match | PASS |
| W/L colors | `text-green-400` for wins, `text-red-400` for losses at `text-sm font-medium` | Lines 398-401: exact match | PASS |
| KDA format | `X.X / X.X / X.X` at `text-xs text-muted-foreground` | Lines 403-404: exact match | PASS |
| Win rate thresholds | green-400 >= 60%, text-foreground 50-59%, red-400 < 50% | Line 407: exact match | PASS |
| Win rate suffix | "{N}% WR" | Line 408: exact match | PASS |
| Em dash separator | Unicode U+2014 between WR and games | Line 410: `\u2014` confirmed | PASS |
| Games singular | "{N} game" if 1, "{N} games" otherwise | Line 411: exact match | PASS |
| Inactive muting | `opacity-60` on entire row div | Line 382: exact match | PASS |
| Empty state | Section not rendered (no card, no heading) | Line 366: `careerCards.length > 0` gate | PASS |
| Section placement | Between Badges and EloTrajectory | Badges at line 345, Career at line 366, EloTrajectory at line 422 | PASS |
| Ordering | Active teams first, then by gamesPlayed desc | Lines 170-175: sort by active status then gamesPlayed | PASS |

All 25 UI-SPEC contract points verified.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | - |

No TODOs, FIXMEs, placeholders, empty implementations, hardcoded empty data, or console.log-only handlers found in the Career History section or its supporting logic.

### Human Verification Required

### 1. Visual Rendering

**Test:** Open a player profile page with team memberships (e.g. seed data player xiNe#NA1)
**Expected:** Career History section appears between Badges and ELO Trajectory with per-team career cards showing team name links, role badges, W/L in green/red, KDA averages, color-coded win rate, and games count
**Why human:** Visual layout, font rendering, color contrast, and spacing cannot be verified by code analysis alone

### 2. Inactive Team Card Appearance

**Test:** Navigate to a player profile where the player has an inactive team membership
**Expected:** The inactive team's card row appears dimmed (opacity-60) with "Inactive" label, sorted after active teams
**Why human:** Visual opacity difference requires human eye confirmation

### 3. Team Name Link Navigation

**Test:** Click a team name in the Career History section
**Expected:** Navigates to `/teams/:teamId` via wouter Link
**Why human:** Client-side routing behavior requires browser interaction

### Gaps Summary

No gaps found. All 5 must-have truths verified. All artifacts exist, are substantive, are wired, and have real data flowing through the full pipeline (OpenAPI spec -> codegen -> hook -> component -> API route -> database queries). Both PROF-01 and PROF-02 requirements are satisfied. All 25 UI-SPEC contract points pass. No anti-patterns detected in modified files.

---

_Verified: 2026-03-29T03:17:30Z_
_Verifier: Claude (gsd-verifier)_
