# Milestones

## v3.2 Frontend Readiness (Shipped: 2026-03-28)

**Phases completed:** 9 phases, 17 plans, 30 tasks

**Key accomplishments:**

- rsoOptIn filtering on player list, shared isPlayerProfileVisibleTo on all 4 profile routes, 7-day auto-public VOD bug eliminated, POV consent enforcement via rsoOptIn on vods.ts
- Aligned OpenAPI spec with all 7 auth routes, added privacy response fields and paginated wrappers, then regenerated frontend hooks and Zod validators via Orval codegen.
- Fixed submitRofl visibility fallback (private default), added explicit matchType, removed 47 lines of dead ELO code, corrected vods PUT type and RSO schema comments
- GET /players/:id/team-stats returns per-team W/L record and KDA averages via 2-phase query with CASE-based team resolution, privacy gate (403), and OpenAPI PlayerTeamStats schema
- Regenerated React Query hooks and Zod validators from Phase 5 OpenAPI changes after fixing 3 duplicate paths + 11 duplicate schemas in the spec
- Fixed Issue #198 API paths (GET not POST, correct operationIds) and transferred 5 Replit-labelled issues to Claude ownership
- Opened 3 GitHub issues (#225, #226, #227) documenting frontend gaps for paginated responses, restricted VODs, and private profile 403 handling
- Dark Charcoal + Steel Blue design system formalized into docs/DESIGN_GUIDE.md with 18 color tokens, Inter/Outfit typography, 7 guardrail rules, 3 new pattern specs, and bot-web alignment mapping
- CLAUDE.md and PROJECT.md updated from split Claude/Replit ownership to full-stack Claude with DESIGN_GUIDE.md as canonical frontend reference

---

## v3.1 Launch Preparation

**Shipped:** 2026-03-27
**Phases:** 4 | **Plans:** 9 | **Commits:** 57
**Timeline:** 2 days (2026-03-26 to 2026-03-27)

### Accomplishments

1. Schema sync with idempotent migration for match_type and tournament_code columns
2. Auth hardening — OAuth CSRF state on all 3 flows, CORS allowlist, session secret guard, RSO token non-persistence
3. 3-layer privacy model — shared privacyGate.ts enforcing scrim redaction, tournament public bypass, player opt-in filtering
4. N+1 query elimination — batch inArray queries for GET /players, SQL-level pagination for matches
5. OpenAPI spec alignment — all 7 auth endpoints, privacy fields, pagination wrappers, codegen regenerated
6. Spec cleanup — formatMatch/OpenAPI field alignment, stale D-11 comment fix

### Archive

- [v3.1-ROADMAP.md](milestones/v3.1-ROADMAP.md)
- [v3.1-REQUIREMENTS.md](milestones/v3.1-REQUIREMENTS.md)
- [v3.1-MILESTONE-AUDIT.md](milestones/v3.1-MILESTONE-AUDIT.md)
