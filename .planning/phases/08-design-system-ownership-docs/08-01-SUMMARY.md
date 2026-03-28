---
phase: 08-design-system-ownership-docs
plan: 01
subsystem: docs
tags: [design-system, css-tokens, typography, tailwind, shadcn, dark-theme]

# Dependency graph
requires: []
provides:
  - "docs/DESIGN_GUIDE.md -- canonical design system reference for all frontend work"
  - "18 color tokens documented with HSL values, hex equivalents, and role descriptions"
  - "Bot-web color alignment mapping table (16 renderer constants to web tokens)"
  - "3 new pattern specifications: per-team career card, activity heatmap, shareable card"
affects: [frontend-implementation, bot-renderer-updates, player-profile, team-profile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dark-only theme with CSS custom property tokens consumed via Tailwind v4 @theme inline"
    - "Inter + Outfit font pairing (body + display)"
    - "7 do/don't guardrails for consistent frontend development"

key-files:
  created:
    - docs/DESIGN_GUIDE.md
  modified: []

key-decisions:
  - "Removed @napi-rs/canvas reference from design guide to avoid confusion with shareable card scope"
  - "Documented 267 lines total (under 350 limit), prioritizing reference tables over prose"

patterns-established:
  - "Design token reference as canonical source -- read DESIGN_GUIDE.md before implementing any frontend feature"
  - "Bot-web color alignment via hex-to-token mapping table"
  - "Do/Don't rules as Claude frontend guardrails"

requirements-completed: [DOC-01]

# Metrics
duration: 4min
completed: 2026-03-28
---

# Phase 08 Plan 01: Design Guide Summary

**Dark Charcoal + Steel Blue design system formalized into docs/DESIGN_GUIDE.md with 18 color tokens, Inter/Outfit typography, 7 guardrail rules, 3 new pattern specs, and bot-web alignment mapping**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-28T09:07:25Z
- **Completed:** 2026-03-28T09:11:13Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created docs/DESIGN_GUIDE.md with complete design system reference (267 lines, under 350 limit)
- All 18 CSS custom property color tokens documented with verified HSL values and hex equivalents
- Typography system documented (Inter body + Outfit display, weight scales, Tailwind classes)
- Layout patterns documented for both PublicLayout and AdminLayout paradigms
- 7 do/don't rules established as frontend guardrails
- 3 new pattern specs: per-team career card, activity heatmap, shareable card (concept + data contract level)
- Bot-web alignment table mapping all 16 renderer color constants to web token equivalents

## Task Commits

Each task was committed atomically:

1. **Task 1: Create docs/DESIGN_GUIDE.md with complete design system reference** - `cab4fb3` (docs)

## Files Created/Modified

- `docs/DESIGN_GUIDE.md` - Canonical design system reference with color tokens, typography, layout patterns, component usage principles, do/don't rules, new pattern specifications, bot-web alignment, and canonical source references

## Decisions Made

- Removed `@napi-rs/canvas` reference from bot font alignment section to avoid any confusion with the shareable card spec (which explicitly must not reference server-side rendering)
- Kept document at 267 lines by focusing on reference tables and principles rather than prose explanations, well under the 350 line guidance

## Deviations from Plan

None - plan executed exactly as written. All token values verified against actual index.css source.

## Issues Encountered

- Bot renderer files (`scoreboardRenderer.ts`, etc.) not present in this worktree -- read from main repo instead. No impact on output quality.
- `lol-utils.ts` also not in worktree -- read from main repo for ELO badge color verification.

## Known Stubs

None - this is a documentation-only plan with no code stubs.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Design guide ready as canonical reference for all future frontend work
- Plan 08-02 (CLAUDE.md and PROJECT.md ownership updates) can reference docs/DESIGN_GUIDE.md
- Future frontend implementation phases should read DESIGN_GUIDE.md before implementing UI features

## Self-Check: PASSED

- FOUND: docs/DESIGN_GUIDE.md
- FOUND: commit cab4fb3
- FOUND: 08-01-SUMMARY.md

---
*Phase: 08-design-system-ownership-docs*
*Completed: 2026-03-28*
