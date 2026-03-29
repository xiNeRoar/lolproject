---
phase: 12-rso-connect-page-dashboard-cta
plan: 01
subsystem: ui
tags: [react, rso, oauth, sonner, wouter, lucide]

# Dependency graph
requires:
  - phase: 10-rso-backend-session-hardening
    provides: RSO OAuth routes (/auth/connect/:token, /auth/rso, /auth/rso/callback)
  - phase: 09-tech-debt-error-handling
    provides: useAuth() hook with hasPuuid/rsoOptIn fields
provides:
  - "/connect page rendering bot-generated RSO verification links"
  - "Dashboard CTA banner with direct Verify with Riot button"
  - "RSO success toast with auth cache invalidation on ?rso=success"
affects: [player-profile, login-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Full-page navigation via window.location.href for OAuth redirects (never fetch/XHR)"
    - "URL query param detection + cleanup via replaceState in useEffect"
    - "Error copy lookup table pattern for user-friendly error states"

key-files:
  created:
    - artifacts/vclol/src/pages/public/Connect.tsx
  modified:
    - artifacts/vclol/src/pages/public/PlayerDashboard.tsx
    - artifacts/vclol/src/App.tsx

key-decisions:
  - "window.location.href for RSO redirect instead of fetch -- backend handles full redirect chain server-side"
  - "Dashboard CTA uses /api/auth/rso (website flow) not /api/auth/connect/:token (bot flow) since player already has session"

patterns-established:
  - "ERROR_COPY Record pattern: centralized error code-to-copy mapping for user-facing error pages"
  - "useEffect URL param detection: read query params, fire side effects, clean URL via replaceState"

requirements-completed: [RSO-02, RSO-04]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 12 Plan 01: RSO Connect Page & Dashboard CTA Summary

**Connect.tsx page with 3-state RSO verification flow (token prompt, 7 error codes, fallback) and dashboard CTA banner with direct Verify with Riot button linking to website RSO OAuth**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T03:29:19Z
- **Completed:** 2026-03-29T03:34:14Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- New Connect.tsx page receives bot-generated /connect?token=<uuid> links and renders verification prompt with CTA
- All 7 RSO error codes mapped to user-friendly headings and bodies per UI-SPEC copywriting contract
- Dashboard yellow banner upgraded from static text to actionable CTA with "Verify with Riot" button
- RSO success detection on /dashboard?rso=success fires Sonner toast, cleans URL, invalidates auth cache

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Connect.tsx page and register /connect route** - `eb59f2b` (feat)
2. **Task 2: Dashboard CTA banner upgrade and RSO success toast** - `b84104d` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `artifacts/vclol/src/pages/public/Connect.tsx` - New RSO verification page with 3 states (token, error, fallback)
- `artifacts/vclol/src/pages/public/PlayerDashboard.tsx` - CTA banner with Verify button + success toast useEffect
- `artifacts/vclol/src/App.tsx` - Route registration for /connect

## Decisions Made
- Used window.location.href for all RSO navigation (full-page redirect, not fetch/AJAX) because backend handles entire OAuth redirect chain server-side
- Dashboard CTA links to /api/auth/rso (website RSO flow requiring existing session) rather than /api/auth/connect/:token (bot flow) since dashboard user already has Discord OAuth session
- Error state for invalid_token includes Discord /connect hint; other errors show generic "Go to Dashboard" recovery

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TS6305 and TS7006 errors in unrelated files (build cache staleness, implicit any in existing code). Zero new TypeScript errors introduced by this plan's changes.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- /connect page is live and ready to receive bot-generated RSO verification links
- Dashboard CTA is wired to /api/auth/rso for logged-in players
- Success toast fires on RSO callback redirect to /dashboard?rso=success
- All RSO frontend integration gates are complete for this milestone

## Self-Check: PASSED

All files created/modified exist on disk. All commit hashes verified in git log.

---
*Phase: 12-rso-connect-page-dashboard-cta*
*Completed: 2026-03-29*
