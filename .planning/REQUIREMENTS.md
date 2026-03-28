# Requirements: v3.3 Frontend Launch

## Tech Debt

- [ ] **DEBT-01**: useAuth() hook returns hasPuuid and rsoOptIn from AuthMeResponse
- [ ] **DEBT-02**: Players.tsx and Matches.tsx unwrap paginated response shape ({data, total, page, totalPages}) correctly
- [ ] **DEBT-03**: vods.ts has zero implicit-any TypeScript errors (21 TS7006 fixes)

## Auth / RSO

- [ ] **RSO-01**: Backend implements GET /auth/connect/:token, GET /auth/rso, GET /auth/rso/callback handlers in auth.ts
- [ ] **RSO-02**: /connect page renders with token from URL, initiates RSO OAuth via full-page navigation
- [ ] **RSO-03**: Session store uses connect-pg-simple (PostgreSQL-backed) instead of in-memory
- [ ] **RSO-04**: Dashboard shows RSO connect CTA when hasPuuid is false

## Player Profile

- [ ] **PROF-01**: PlayerProfile page renders per-team career cards using useGetPlayerTeamStats hook
- [ ] **PROF-02**: Career cards show team name, role, W/L record, and KDA averages per team

## Error Handling

- [ ] **ERR-01**: VOD page shows graceful message when VOD is privacy-gated instead of error
- [ ] **ERR-02**: Player profile sub-routes show "Profile is private" UI on 403 response
- [ ] **ERR-03**: App-level error boundary catches unhandled API errors with user-friendly fallback

## Future Requirements (Deferred)

- Team-stats API deduplication for multiple membership stints (MEDIUM concern from Codex review)
- Match-level privacy in team-stats aggregation (MEDIUM concern from Codex review)
- Mobile-responsive frontend layouts
- VOD rendering pipeline integration

## Out of Scope

- Mobile app — web-first, mobile later
- Real-time chat — Discord handles communication
- Scrim matchmaking — Discord handles scheduling
- Player individual ELO — team ELO only
- Non-NA servers — NA only at launch

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| DEBT-01 | TBD | Pending |
| DEBT-02 | TBD | Pending |
| DEBT-03 | TBD | Pending |
| RSO-01 | TBD | Pending |
| RSO-02 | TBD | Pending |
| RSO-03 | TBD | Pending |
| RSO-04 | TBD | Pending |
| PROF-01 | TBD | Pending |
| PROF-02 | TBD | Pending |
| ERR-01 | TBD | Pending |
| ERR-02 | TBD | Pending |
| ERR-03 | TBD | Pending |
