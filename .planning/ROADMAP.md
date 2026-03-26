# Roadmap: VCLoL v3.1 Launch

## Overview

VCLoL's backend is functional but has security gaps, missing schema columns, and incomplete privacy enforcement that block launch. This roadmap fixes the foundation (schema sync + auth hardening), implements the 3-layer privacy model required by Riot policy, then aligns the API contract and performance. Three phases, each delivering a verifiable capability, executed sequentially because each depends on the previous.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Schema Sync & Auth Hardening** - Fix missing columns and close security vulnerabilities before any production RSO traffic
- [ ] **Phase 2: Privacy Gates** - Enforce 3-layer visibility model across all match, player, and VOD endpoints
- [ ] **Phase 3: API Contract & Performance** - Eliminate N+1 queries and align OpenAPI spec with actual routes

## Phase Details

### Phase 1: Schema Sync & Auth Hardening
**Goal**: Production database has all required columns and auth flows are safe against CSRF, token leakage, and session hijacking
**Depends on**: Nothing (first phase)
**Requirements**: SCHM-01, SCHM-02, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05
**Success Criteria** (what must be TRUE):
  1. Running `drizzle-kit push` against production produces zero pending column additions (match_type, tournament_code all exist)
  2. RSO and Discord OAuth flows include a cryptographic state parameter that is validated on callback -- requests without valid state are rejected
  3. CORS configuration rejects requests from origins other than the production domain (no wildcard with credentials)
  4. RSO access/refresh tokens are not stored in the database -- only PUUID persists after auth completes
  5. Match visibility PUT endpoint derives playerId from the authenticated session, ignoring any playerId in the request body
**Plans**: TBD

### Phase 2: Privacy Gates
**Goal**: Every API response respects the 3-layer visibility model -- scrims restricted, tournaments public, player profiles gated by opt-in
**Depends on**: Phase 1
**Requirements**: PRIV-01, PRIV-02, PRIV-03, PRIV-04, PRIV-05, PRIV-06
**Success Criteria** (what must be TRUE):
  1. A non-participant requesting a scrim match detail receives only team names and final score -- no player stats, KDA, items, or champion data
  2. A tournament or event match detail is fully visible to any requester regardless of login state
  3. GET /players omits any player whose rsoOptIn is false -- they do not appear in search results
  4. A player profile with profileVisibility=private returns 403 to non-participants and a full profile to the player themselves
  5. VOD endpoints follow match visibility -- scrims do not auto-publish after 7 days; the vods.ts time-based leak is eliminated
**Plans**: TBD

### Phase 3: API Contract & Performance
**Goal**: OpenAPI spec matches all actual routes and the players endpoint responds without N+1 queries
**Depends on**: Phase 2
**Requirements**: PERF-01, SPEC-01, SPEC-02
**Success Criteria** (what must be TRUE):
  1. GET /players with 50+ players executes a constant number of SQL queries (no per-player lookups)
  2. OpenAPI spec documents all auth endpoints (/auth/discord, /auth/rso, /auth/connect) with correct request/response schemas
  3. Running codegen after spec update produces zero type errors in generated frontend hooks
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema Sync & Auth Hardening | 0/0 | Not started | - |
| 2. Privacy Gates | 0/0 | Not started | - |
| 3. API Contract & Performance | 0/0 | Not started | - |
