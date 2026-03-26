# Requirements: VCLoL v3.1 Launch

**Defined:** 2026-03-26
**Core Value:** Every match submitted via .rofl produces a verified, permanent competitive record that cannot be faked.

## v1 Requirements

### Schema & Data Integrity

- [ ] **SCHM-01**: Database schema synced with Drizzle ORM — all columns exist in production (match_type, tournament_code, etc.)
- [ ] **SCHM-02**: eloHistory.playerId decision resolved — either restore column or update SCHEMA_CONTRACT.md

### Auth & Security

- [ ] **AUTH-01**: RSO OAuth state parameter on both Discord and RSO flows (prevent account hijack)
- [ ] **AUTH-02**: CORS restricted to production domain (not wildcard with credentials)
- [ ] **AUTH-03**: RSO token storage resolved — keep schema columns but don't populate tokens in auth flow (only persist PUUID). Add code comment linking to Tournament API future requirement.
- [ ] **AUTH-04**: Session secret enforced as non-default in production
- [ ] **AUTH-05**: Match visibility endpoint rejects spoofed playerId in request body

### Privacy Gates (PRD §7 — 3-Layer Model)

- [ ] **PRIV-01**: Match detail API returns Team A vs B + score only for non-participant scrims (Layer 1)
- [ ] **PRIV-02**: Tournament/event matches bypass visibility gate — always public (Layer 3)
- [ ] **PRIV-03**: Player search API filters by rsoOptIn — non-opted players invisible
- [ ] **PRIV-04**: Player profile API respects profileVisibility setting (private/public/participants-only)
- [ ] **PRIV-05**: VOD visibility follows match visibility — fix 7-day auto-public bug in vods.ts
- [ ] **PRIV-06**: Visibility logic consolidated into shared helper (eliminate divergent implementations)

### API Performance

- [ ] **PERF-01**: GET /players N+1 query eliminated — batch JOINs or subqueries instead of per-player lookups

### API Contract

- [ ] **SPEC-01**: OpenAPI spec updated for auth endpoints (/auth/discord, /auth/rso, /auth/connect actual signatures)
- [ ] **SPEC-02**: OpenAPI codegen run after all route changes — frontend hooks updated

## v2 Requirements

### Frontend (Post-Handover)

- **FEND-01**: /connect page for website RSO flow (currently #198 — Replit scope)
- **FEND-02**: Match detail scrim privacy gate UI (currently #199 — Replit scope)
- **FEND-03**: Player profile career resume layout with per-team W/L + KDA
- **FEND-04**: Player search filter by rsoOptIn in UI
- **FEND-05**: Login flow RSO connect step
- **FEND-06**: Remove EloTrajectory component from PlayerProfile

### Infrastructure

- **INFR-01**: Database backup automation before schema migrations
- **INFR-02**: Session store migration to connect-pg-simple (if user count warrants)

## Out of Scope

| Feature | Reason |
|---------|--------|
| VOD rendering pipeline | Requires separate Windows PC infrastructure — own milestone |
| Tournament API integration | Depends on Riot production key approval — blocked externally |
| Mobile app | Web-first per PRD §17 |
| Scrim matchmaking | Discord handles scheduling per PRD §17 |
| Player individual ELO | Team ELO only per PRD §8 |
| Frontend changes | Claude owns backend only for this milestone; frontend handover is v2 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHM-01 | Phase 1 | Pending |
| SCHM-02 | Phase 1 | Pending |
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| AUTH-04 | Phase 1 | Pending |
| AUTH-05 | Phase 1 | Pending |
| PRIV-01 | Phase 2 | Pending |
| PRIV-02 | Phase 2 | Pending |
| PRIV-03 | Phase 2 | Pending |
| PRIV-04 | Phase 2 | Pending |
| PRIV-05 | Phase 2 | Pending |
| PRIV-06 | Phase 2 | Pending |
| PERF-01 | Phase 3 | Pending |
| SPEC-01 | Phase 3 | Pending |
| SPEC-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 16 total
- Mapped to phases: 16
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-26*
*Last updated: 2026-03-26 after initial definition*
