# Roadmap: VCLoL

## Milestones

- **v3.1 Launch Preparation** — Phases 1-4 (shipped 2026-03-27) — [archive](milestones/v3.1-ROADMAP.md)
- **v3.2 Frontend Readiness** — Phases 4.1, 5-8 (in progress)

## Phases

<details>
<summary>v3.1 Launch Preparation (Phases 1-4) — SHIPPED 2026-03-27</summary>

- [x] Phase 1: Schema Sync & Auth Hardening (3/3 plans) — completed 2026-03-26
- [x] Phase 2: Privacy Gates (2/2 plans) — completed 2026-03-27
- [x] Phase 3: API Contract & Performance (3/3 plans) — completed 2026-03-27
- [x] Phase 4: Spec Alignment Cleanup (1/1 plan) — completed 2026-03-27

</details>

### v3.2 Frontend Readiness (In Progress)

**Milestone Goal:** Deliver all backend API gaps needed for frontend launch, establish design system documentation, update ownership model, fix incorrect GitHub issues.

- [ ] **Phase 4.1: v3.1 Bug Fixes** - Fix submitRofl visibility fallback, TypeScript compile errors, dead code, stale docs (INSERTED)
- [ ] **Phase 8: Design System & Ownership Docs** - Document design tokens, component patterns, and update CLAUDE.md for full-stack Claude ownership
- [ ] **Phase 5: Auth & Stats API** - Add hasPuuid to /auth/me and build per-team player stats endpoint with OpenAPI specs
- [ ] **Phase 6: Codegen Sync** - Regenerate frontend hooks after all spec changes land
- [ ] **Phase 7: Issue Hygiene** - Fix incorrect issue paths and open missing frontend issues

## Phase Details

### Phase 4.1: v3.1 Bug Fixes (INSERTED)
**Goal**: Fix all bugs discovered during v3.1 code review — visibility fallback, TypeScript errors, dead code, stale docs
**Depends on**: Nothing (bug fixes on shipped code)
**Requirements**: Closes #222, #223, #224
**Success Criteria** (what must be TRUE):
  1. submitRofl.ts visibility fallback is "private" (matches bot matchRecorder behavior)
  2. submitRofl.ts INSERT includes explicit matchType: "scrim"
  3. Dead eloEligible code removed — scrims skip ELO without conditional
  4. vods.ts has zero implicit-any TypeScript errors
  5. RSO token schema comments say "reserved for Tournament API, always null" (not "encrypted")
  6. REQUESTS.md has no stale entries for completed work
  7. `pnpm --filter @workspace/api-server exec tsc --noEmit` produces zero new errors in files modified by v3.1
**Plans:** 1 plan

Plans:
- [ ] 04.1-01-PLAN.md — Fix submitRofl bugs, vods.ts TypeScript errors, schema comments, stale docs

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

### Phase 8: Design System & Ownership Docs
**Goal**: Formalize the implicit design system into docs/DESIGN_GUIDE.md, update CLAUDE.md for full-stack Claude ownership, and update PROJECT.md to reflect new ownership model
**Depends on**: Nothing (documentation only, no code dependencies)
**Requirements**: DOC-01, DOC-02, DOC-03
**Success Criteria** (what must be TRUE):
  1. docs/DESIGN_GUIDE.md exists with actual color tokens, typography rules, component patterns, and layout conventions extracted from codebase
  2. CLAUDE.md ownership section updated: Claude owns artifacts/vclol/src/ (was Replit), with design guide referenced as canonical
  3. PROJECT.md reflects full-stack Claude ownership with updated constraints and active requirements
  4. Design Guide covers: color tokens, typography, component variants, layout patterns, bot-web alignment, and new patterns (per-team career cards, activity heatmap, shareable cards)
**Plans**: TBD

### Phase 7: Issue Hygiene
**Goal**: GitHub issues accurately reflect backend API reality and correct ownership labels
**Depends on**: Nothing (parallel with Phases 5-6)
**Requirements**: ISSUE-01, ISSUE-02, ISSUE-03, ISSUE-04
**Success Criteria** (what must be TRUE):
  1. Issue #198 shows correct API paths (GET /auth/connect/:token, GET /auth/rso, GET /auth/rso/callback)
  2. A new issue exists documenting that GET /players and GET /matches now return paginated response shape { data, total, page, totalPages }
  3. A new issue exists describing frontend handling for restricted VODs (graceful degradation when VOD is privacy-gated)
  4. A new issue exists describing frontend 403 handling for private player profile sub-routes
  5. All Replit-labelled issues updated to Claude ownership
**Plans**: TBD

## Progress

**Execution Order:**
Phase 4.1 executes FIRST (urgent bug fixes). Then Phase 8 (no dependencies, foundation). Then Phases 5 and 7 in parallel. Phase 6 follows Phase 5.

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Schema Sync & Auth Hardening | v3.1 | 3/3 | Complete | 2026-03-26 |
| 2. Privacy Gates | v3.1 | 2/2 | Complete | 2026-03-27 |
| 3. API Contract & Performance | v3.1 | 3/3 | Complete | 2026-03-27 |
| 4. Spec Alignment Cleanup | v3.1 | 1/1 | Complete | 2026-03-27 |
| 4.1. v3.1 Bug Fixes | v3.2 | 0/1 | Not started | - |
| 5. Auth & Stats API | v3.2 | 0/? | Not started | - |
| 6. Codegen Sync | v3.2 | 0/? | Not started | - |
| 7. Issue Hygiene | v3.2 | 0/? | Not started | - |
| 8. Design System & Ownership Docs | v3.2 | 0/? | Not started | - |
