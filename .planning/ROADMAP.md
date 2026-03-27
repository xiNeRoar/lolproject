# Roadmap: VCLoL

## Milestones

- **v3.1 Launch Preparation** — Phases 1-4 (shipped 2026-03-27) — [archive](milestones/v3.1-ROADMAP.md)
- **v3.2 Frontend Readiness** — Phases 5-7 (in progress)

## Phases

<details>
<summary>v3.1 Launch Preparation (Phases 1-4) — SHIPPED 2026-03-27</summary>

- [x] Phase 1: Schema Sync & Auth Hardening (3/3 plans) — completed 2026-03-26
- [x] Phase 2: Privacy Gates (2/2 plans) — completed 2026-03-27
- [x] Phase 3: API Contract & Performance (3/3 plans) — completed 2026-03-27
- [x] Phase 4: Spec Alignment Cleanup (1/1 plan) — completed 2026-03-27

</details>

### v3.2 Frontend Readiness (In Progress)

**Milestone Goal:** Deliver all backend API gaps needed for frontend launch, fix incorrect GitHub issues, and open missing issues for frontend work.

- [ ] **Phase 5: Auth & Stats API** - Add hasPuuid to /auth/me and build per-team player stats endpoint with OpenAPI specs
- [ ] **Phase 6: Codegen Sync** - Regenerate frontend hooks after all spec changes land
- [ ] **Phase 7: Issue Hygiene** - Fix incorrect issue paths and open missing frontend issues

## Phase Details

### Phase 5: Auth & Stats API
**Goal**: Frontend can query login status (hasPuuid) and player career stats (per-team W/L + KDA) through documented, spec-compliant endpoints
**Depends on**: Phase 4 (v3.1 spec alignment)
**Requirements**: AUTH-06, AUTH-07, STAT-01, STAT-02
**Success Criteria** (what must be TRUE):
  1. GET /auth/me response includes hasPuuid boolean that is true when player has a linked PUUID and false otherwise
  2. A new stats endpoint returns W/L record and KDA averages grouped by team for a given player
  3. OpenAPI spec documents both the updated /auth/me response and the new stats endpoint with correct schemas
  4. Both endpoints return appropriate error responses (401 for unauthenticated /auth/me, 404 for unknown player stats)
**Plans**: TBD

### Phase 6: Codegen Sync
**Goal**: Frontend React Query hooks and Zod validators reflect all v3.2 spec changes so Replit can consume them immediately
**Depends on**: Phase 5 (all spec changes must land first)
**Requirements**: STAT-03
**Success Criteria** (what must be TRUE):
  1. Running codegen produces updated hooks in lib/api-client-react with hasPuuid in auth/me types
  2. Generated hooks include the new per-team stats endpoint with correct request/response types
  3. No TypeScript compilation errors in generated output
**Plans**: TBD

### Phase 7: Issue Hygiene
**Goal**: GitHub issues accurately reflect backend API reality so Replit builds against correct contracts
**Depends on**: Nothing (parallel with Phases 5-6)
**Requirements**: ISSUE-01, ISSUE-02, ISSUE-03, ISSUE-04
**Success Criteria** (what must be TRUE):
  1. Issue #198 shows correct API paths (GET /auth/connect/:token, GET /auth/rso, GET /auth/rso/callback)
  2. A new issue exists documenting that GET /players and GET /matches now return paginated response shape { data, total, page, totalPages }
  3. A new issue exists describing frontend handling for restricted VODs (graceful degradation when VOD is privacy-gated)
  4. A new issue exists describing frontend 403 handling for private player profile sub-routes
**Plans**: TBD

## Progress

**Execution Order:**
Phases 5 and 7 can execute in parallel. Phase 6 must follow Phase 5.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema Sync & Auth Hardening | v3.1 | 3/3 | Complete | 2026-03-26 |
| 2. Privacy Gates | v3.1 | 2/2 | Complete | 2026-03-27 |
| 3. API Contract & Performance | v3.1 | 3/3 | Complete | 2026-03-27 |
| 4. Spec Alignment Cleanup | v3.1 | 1/1 | Complete | 2026-03-27 |
| 5. Auth & Stats API | v3.2 | 0/? | Not started | - |
| 6. Codegen Sync | v3.2 | 0/? | Not started | - |
| 7. Issue Hygiene | v3.2 | 0/? | Not started | - |
