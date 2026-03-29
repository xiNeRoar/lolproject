---
phase: 10-rso-backend-session-store
plan: 01
subsystem: auth
tags: [rso, oauth, session-store, connect-pg-simple, riot-sign-on, puuid]

# Dependency graph
requires:
  - phase: 09-tech-debt-error-handling
    provides: clean codebase with no blocking TS errors in auth paths
provides:
  - PostgreSQL-backed session store via connect-pg-simple
  - RSO OAuth route handlers (connect/:token, /rso, /rso/callback)
  - Bot /connect flow token validation and PUUID linking
  - Website RSO flow with session-based CSRF protection
affects: [12-rso-connect-page, frontend-auth, deployment]

# Tech tracking
tech-stack:
  added: [connect-pg-simple, @types/connect-pg-simple]
  patterns: [explicit session.save before redirect, CSRF state in session, dual-flow OAuth callback]

key-files:
  created: []
  modified:
    - artifacts/api-server/src/app.ts
    - artifacts/api-server/src/routes/auth.ts
    - artifacts/api-server/package.json
    - docs/DEPLOYMENT.md

key-decisions:
  - "Reuse existing @workspace/db pool for connect-pg-simple (no second connection pool)"
  - "createTableIfMissing: true for session table -- not tracked by Drizzle, managed by connect-pg-simple"
  - "Explicit req.session.save() before every redirect to guarantee persistence to PostgreSQL"
  - "Bot and website RSO flows share a single /rso/callback handler, differentiated by session data"

patterns-established:
  - "RSO OAuth pattern: server-side redirects (302), error states via query params, CSRF state in session"
  - "Session store pattern: connect-pg-simple with shared Drizzle pool, auto-create table"

requirements-completed: [RSO-01, RSO-03]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 10 Plan 01: RSO Backend + Session Store Summary

**RSO OAuth route handlers (connect/:token, /rso, /rso/callback) with PostgreSQL-backed session store via connect-pg-simple**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T02:51:30Z
- **Completed:** 2026-03-29T02:54:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Session store switched from in-memory MemoryStore to PostgreSQL-backed connect-pg-simple, ensuring sessions survive Portainer redeploys
- Three RSO OAuth route handlers implemented following existing Discord OAuth pattern
- Bot /connect flow validates auth_sessions token, stores discordId in session, redirects to Riot auth
- Website RSO flow requires existing player session, generates CSRF state, redirects to Riot auth
- Shared callback handler exchanges auth code for PUUID via Riot Account API, updates player record
- DEPLOYMENT.md updated with RSO route table and session store documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Switch session store to connect-pg-simple** - `9995a26` (feat)
2. **Task 2: Implement RSO OAuth route handlers in auth.ts** - `fb7634c` (feat)

## Files Created/Modified
- `artifacts/api-server/package.json` - Added connect-pg-simple + @types/connect-pg-simple
- `artifacts/api-server/src/app.ts` - Imported pgSession + pool, configured PgStore with shared pool
- `artifacts/api-server/src/routes/auth.ts` - Added 3 RSO route handlers (connect/:token, /rso, /rso/callback)
- `docs/DEPLOYMENT.md` - RSO route documentation and session store note
- `pnpm-lock.yaml` - Updated lockfile with new dependencies

## Decisions Made
- Reused @workspace/db pool for connect-pg-simple instead of creating a second PostgreSQL connection pool
- Used createTableIfMissing: true so the session table is auto-created and not tracked by Drizzle
- Explicit req.session.save() before every redirect to guarantee the session data persists to PostgreSQL before the browser navigates away
- Bot and website RSO flows share a single /rso/callback handler, differentiated by connectToken presence in session
- rsoOptIn set to true when PUUID is saved, reflecting player consent to Riot identity linking

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. RSO_CLIENT_ID, RSO_CLIENT_SECRET, and RSO_REDIRECT_URI env vars were already documented in DEPLOYMENT.md.

## Next Phase Readiness
- RSO backend routes are complete and ready for the frontend /connect page (Phase 12)
- Session store is persistent -- OAuth state parameter will survive the 3-5 second Riot auth round-trip
- No blockers for Phase 11 (career resume) which is independent of RSO

## Self-Check: PASSED

- All 5 files verified present on disk
- Both task commits (9995a26, fb7634c) verified in git log
- connect-pg-simple in package.json: confirmed
- PgStore in app.ts: confirmed
- auth.riotgames.com in auth.ts: confirmed

---
*Phase: 10-rso-backend-session-store*
*Completed: 2026-03-29*
