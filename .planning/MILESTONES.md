# Milestones

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
