# Phase 5: Auth & Stats API - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-28
**Phase:** 05-auth-stats-api
**Areas discussed:** Stats endpoint design, Stats data scope, /auth/me expansion, OpenAPI spec details

---

## Stats Endpoint Design

| Option | Description | Selected |
|--------|-------------|----------|
| Nested resource (Recommended) | GET /players/:id/team-stats — consistent with existing /champions and /events patterns | ✓ |
| Query param grouping | GET /players/:id/stats?groupBy=team — flexible but complex | |
| Top-level resource | GET /stats/player/:id/teams — inconsistent with existing patterns | |

**User's choice:** Nested resource
**Notes:** None

---

## Stats Data Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Core stats (Recommended) | W/L + KDA averages + role + status + gamesPlayed + joinedAt per team | ✓ |
| Extended stats | + champion pool, avg CS, win streak, last match date | |
| Minimal W/L only | Just wins/losses per team | |

**User's choice:** Core stats
**Notes:** None

---

## /auth/me Expansion

| Option | Description | Selected |
|--------|-------------|----------|
| hasPuuid + rsoOptIn (Recommended) | Two boolean fields — hasPuuid for RSO status, rsoOptIn for profile visibility | ✓ |
| hasPuuid only | Minimum AUTH-06 requirement, rsoOptIn via separate endpoint | |
| Multiple fields | hasPuuid + rsoOptIn + profileVisibility + hasTeam — comprehensive user state | |

**User's choice:** hasPuuid + rsoOptIn
**Notes:** None

---

## OpenAPI Spec Details

| Option | Description | Selected |
|--------|-------------|----------|
| Named schema + inline (Recommended) | PlayerTeamStats as named schema (career card references it), AuthMe inline | ✓ |
| All named schemas | Both responses as named schemas | |
| All inline | Both responses inline in paths | |

**User's choice:** Named schema + inline
**Notes:** None

---

## Claude's Discretion

- SQL query structure for per-team aggregation
- Error handling patterns (follow existing players.ts)
- Team-stats response ordering

## Deferred Ideas

- Per-team champion pool
- Per-team recent matches
- Win streak tracking
- Codegen (Phase 6)
