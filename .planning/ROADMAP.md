# Roadmap: VCLoL

## Milestones

- **v3.1 Launch Preparation** -- Phases 1-4 (shipped 2026-03-27) -- [archive](milestones/v3.1-ROADMAP.md)
- **v3.2 Frontend Readiness** -- Phases 4.1, 5-8 (shipped 2026-03-28) -- [archive](milestones/v3.2-ROADMAP.md)
- **v3.3 Frontend Launch** -- Phases 9-12 (in progress)

## Phases

**v3.3 Frontend Launch**

- [ ] **Phase 9: Tech Debt + Error Handling** - Fix useAuth() forwarding, paginated response unwrap, vods.ts TS errors, and frontend error states
- [x] **Phase 10: RSO Backend + Session Store** - Implement RSO OAuth handlers in auth.ts and switch to PostgreSQL-backed sessions (completed 2026-03-29)
- [ ] **Phase 11: Player Career Resume** - Render per-team career stat cards on PlayerProfile using existing backend + hooks
- [ ] **Phase 12: RSO Connect Page + Dashboard CTA** - Wire /connect page to RSO backend and surface connect prompt on dashboard

## Phase Details

### Phase 9: Tech Debt + Error Handling
**Goal**: Public pages display data correctly, auth state includes RSO fields, and error states show user-friendly messages instead of blank screens or crashes
**Depends on**: Phase 8 (v3.2 -- design system and ownership established)
**Requirements**: DEBT-01, DEBT-02, DEBT-03, ERR-01, ERR-02, ERR-03
**Plans:** 2 plans
**Success Criteria** (what must be TRUE):
  1. /matches page renders match list from paginated API response (not empty)
  2. /players page renders player list from paginated API response (not empty)
  3. useAuth() hook exposes hasPuuid and rsoOptIn boolean fields to all consuming components
  4. Visiting a private player profile shows "Profile is private" message instead of error or blank page
  5. VOD page for a privacy-gated video shows graceful "not available" message instead of error

Plans:
- [x] 09-01-PLAN.md -- Tech debt: useAuth() fix, pagination unwrap, vods.ts TS errors
- [x] 09-02-PLAN.md -- Error handling: VOD privacy, profile 403, app error boundary

### Phase 10: RSO Backend + Session Store
**Goal**: Server-side RSO OAuth flow works end-to-end (token validation, Riot auth redirect, callback handling, PUUID persistence) with sessions that survive redeployment
**Depends on**: Phase 9 (useAuth fix must land first so frontend can read RSO state)
**Requirements**: RSO-01, RSO-03
**Success Criteria** (what must be TRUE):
  1. GET /auth/connect/:token validates a bot-generated token and initiates RSO OAuth redirect to auth.riotgames.com
  2. GET /auth/rso/callback exchanges auth code for PUUID and updates the player record
  3. User sessions persist across Portainer redeploy (PostgreSQL-backed session store)
**Plans:** 1/1 plans complete

Plans:
- [x] 10-01-PLAN.md -- Session store (connect-pg-simple) + RSO OAuth handlers in auth.ts

### Phase 11: Player Career Resume
**Goal**: Players can see their per-team competitive history (W/L record, KDA averages) on their profile page
**Depends on**: Phase 9 (error handling and auth state must be stable before adding profile sections)
**Requirements**: PROF-01, PROF-02
**Success Criteria** (what must be TRUE):
  1. PlayerProfile page shows a career card for each team the player has been on
  2. Each career card displays team name, role, win/loss record, and KDA averages
  3. Duplicate team memberships (leave + rejoin) are deduplicated into a single card per team
**Plans**: TBD
**UI hint**: yes

### Phase 12: RSO Connect Page + Dashboard CTA
**Goal**: Players can complete RSO identity verification through the website -- the launch blocker that has been sending users to a 404 since v3.1
**Depends on**: Phase 10 (RSO backend routes must exist), Phase 9 (useAuth hasPuuid field)
**Requirements**: RSO-02, RSO-04
**Success Criteria** (what must be TRUE):
  1. Bot-generated /connect?token=<uuid> link renders a connect page that initiates RSO OAuth via browser navigation
  2. Dashboard shows "Verify with Riot" CTA when the logged-in player has not completed RSO
  3. After successful RSO callback, player is redirected to dashboard with confirmation feedback
  4. Expired or invalid token shows a user-friendly error message on the connect page
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:** Phase 9 -> Phase 10 -> Phase 11 -> Phase 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 9. Tech Debt + Error Handling | v3.3 | 2/2 | Complete | - |
| 10. RSO Backend + Session Store | v3.3 | 1/1 | Complete    | 2026-03-29 |
| 11. Player Career Resume | v3.3 | 0/TBD | Not started | - |
| 12. RSO Connect Page + Dashboard CTA | v3.3 | 0/TBD | Not started | - |
