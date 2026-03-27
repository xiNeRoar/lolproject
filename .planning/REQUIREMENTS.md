# Requirements: VCLoL v3.2 Frontend Readiness

**Defined:** 2026-03-27
**Core Value:** Every match submitted via .rofl produces a verified, permanent competitive record that cannot be faked.

## v3.2 Requirements

### Auth API

- [ ] **AUTH-06**: GET /auth/me returns `hasPuuid: boolean` field indicating whether player has linked Riot account
- [ ] **AUTH-07**: OpenAPI spec updated for /auth/me response schema with hasPuuid field

### Player Stats API

- [ ] **STAT-01**: New endpoint returns per-team W/L record and KDA averages for a given player (grouped by team membership)
- [ ] **STAT-02**: OpenAPI spec documents the per-team stats endpoint with correct request/response schemas
- [ ] **STAT-03**: Codegen regenerated after spec changes — frontend hooks updated

### Issue Hygiene

- [ ] **ISSUE-01**: GitHub issue #198 updated with correct API paths (GET /auth/connect/:token, GET /auth/rso, GET /auth/rso/callback)
- [ ] **ISSUE-02**: New GitHub issue opened for frontend paginated response adaptation (GET /players and GET /matches now return { data, total, page, totalPages })
- [ ] **ISSUE-03**: New GitHub issue opened for frontend VOD privacy gate UI (handle restricted VODs gracefully)
- [ ] **ISSUE-04**: New GitHub issue opened for frontend player profile sub-route 403 handling

## Out of Scope

| Feature | Reason |
|---------|--------|
| Frontend implementation of #198, #199, #200, #202, #204 | Replit scope — Claude owns backend only |
| VOD rendering pipeline | Separate Windows PC infrastructure — own milestone |
| Tournament API integration | Depends on Riot production key — blocked externally |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-06 | TBD | Pending |
| AUTH-07 | TBD | Pending |
| STAT-01 | TBD | Pending |
| STAT-02 | TBD | Pending |
| STAT-03 | TBD | Pending |
| ISSUE-01 | TBD | Pending |
| ISSUE-02 | TBD | Pending |
| ISSUE-03 | TBD | Pending |
| ISSUE-04 | TBD | Pending |

**Coverage:**
- v3.2 requirements: 9 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 9

---
*Requirements defined: 2026-03-27*
*Last updated: 2026-03-27*
