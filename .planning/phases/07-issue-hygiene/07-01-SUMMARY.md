---
phase: 07-issue-hygiene
plan: 01
subsystem: project-management
tags: [github-issues, issue-hygiene, api-paths, ownership-transfer]

# Dependency graph
requires:
  - phase: 08-design-ownership
    provides: Claude full-stack ownership decision
provides:
  - "Issue #198 corrected with accurate API paths from OpenAPI spec"
  - "All 5 open frontend issues transferred from Replit to Claude ownership"
affects: [09-frontend-launch]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified: []

key-decisions:
  - "No source code changes -- GitHub API operations only"
  - "operationId values taken directly from openapi.yaml (authConnectToken, authRso, authRsoCallback)"

patterns-established: []

requirements-completed: [ISSUE-01, ISSUE-04]

# Metrics
duration: 1min
completed: 2026-03-28
---

# Phase 07 Plan 01: Issue Hygiene Summary

**Fixed Issue #198 API paths (GET not POST, correct operationIds) and transferred 5 Replit-labelled issues to Claude ownership**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-28T21:07:41Z
- **Completed:** 2026-03-28T21:08:50Z
- **Tasks:** 2
- **Files modified:** 0 (GitHub API operations only)

## Accomplishments
- Issue #198 body corrected: `POST /api/auth/connect` -> `GET /api/auth/connect/{token}`, `GET /api/auth/rso/authorize` -> `GET /api/auth/rso`, operationIds aligned to openapi.yaml
- All 5 open Replit-labelled issues (#198, #199, #200, #202, #204) relabelled from "replit" to "claude" with titles updated from "[Replit]" to "[Claude]"
- Zero open issues remain with "replit" label

## Task Commits

This plan involves GitHub API operations only (issue edits via `gh` CLI). No source code files were modified, so no git commits were created for individual tasks.

1. **Task 1: Fix Issue #198 body with correct API paths** - no commit (GitHub API operation)
2. **Task 2: Relabel all open Replit issues to Claude ownership** - no commit (GitHub API operation)

## Files Created/Modified

None -- this plan exclusively uses GitHub API operations to update issue metadata.

## Decisions Made

- operationId values taken directly from openapi.yaml lines 193-231: `authConnectToken`, `authRso`, `authRsoCallback` (not the incorrect `postAuthConnect`, `getRsoAuthorize`, `getRsoCallback` that were in the issue)
- Used `gh` CLI for all GitHub API operations (CLAUDE.md documents a Python token approach, but the remote URL does not contain an inline token; `gh` CLI is authenticated)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Issue #198 now has correct API paths for frontend implementation of the RSO Connect page
- All frontend issues correctly attributed to Claude ownership, ready for frontend phase work
- Plan 07-02 (open missing frontend issues) can proceed independently

## Self-Check: PASSED

- SUMMARY.md file exists: FOUND
- Issue #198 contains `GET /api/auth/connect/{token}`: YES (1 match)
- Issue #198 contains `GET /api/auth/rso`: YES (2 matches -- /rso and /rso/callback)
- Open issues with "replit" label: 0

---
*Phase: 07-issue-hygiene*
*Completed: 2026-03-28*
