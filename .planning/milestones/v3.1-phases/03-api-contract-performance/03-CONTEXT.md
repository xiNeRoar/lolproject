# Phase 3: API Contract & Performance - Context

**Gathered:** 2026-03-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Align the OpenAPI spec with all actual API routes (including Phase 1-2 response shape changes), run codegen to update frontend hooks, fix the GET /players N+1 query with pagination, and resolve additional performance/correctness issues identified in CONCERNS.md.

</domain>

<decisions>
## Implementation Decisions

### N+1 Query Fix (PERF-01)
- **D-01:** Use batch `inArray` queries to fix GET /players N+1. Two batch queries (team memberships + stats) replace per-player loops. Merge results in JavaScript.
- **D-02:** Add LIMIT/OFFSET pagination to GET /players in the same fix. Default page size and query params for page/limit.

### OpenAPI Spec Scope (SPEC-01)
- **D-03:** Full alignment — not just auth endpoints. Capture ALL response shape changes from Phases 1-2 (isRedacted, isPrivate, _masked fields, privacy gate behavior) plus auth endpoints (/auth/discord, /auth/rso, /auth/connect).
- **D-04:** Define unified ErrorResponse schema in spec: `{ error: string }` with common HTTP status codes (400/401/403/404/409/500). Codegen will produce typed error handling.

### Codegen Strategy (SPEC-02)
- **D-05:** Complete all OpenAPI spec updates first, then run codegen once at the end. Avoids intermediate type errors from partial spec updates.

### Additional Fixes (from CONCERNS.md)
- **D-06:** Fix submitRofl.ts ELO bug — add `matchType` guard so scrims never compute ELO. Match pattern from matches.ts: only `ranked_tournament` or `event` triggers ELO.
- **D-07:** Extract shared `formatMatch()` utility into `artifacts/api-server/src/lib/formatters.ts`. Replace duplicates in matches.ts, teams.ts, and submitRofl.ts.
- **D-08:** Add LIMIT/OFFSET pagination to GET /matches. Push JavaScript filters into SQL WHERE clauses.
- **D-09:** Add FOR UPDATE locking to bot matchRecorder.ts team W/L counter reads inside transaction. Match pattern from matches.ts lines 205-214.

### Claude's Discretion
- Pagination default page size and parameter naming
- formatMatch field selection and typing approach
- OpenAPI spec organizational structure (grouping by resource vs by feature)
- Specific SQL optimization approach for GET /matches WHERE clauses

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### API Specification
- `lib/api-spec/openapi.yaml` -- Current OpenAPI spec (source of truth for API contract)
- `lib/api-spec/orval.config.ts` -- Codegen configuration for React Query hooks + Zod schemas

### Route Files (modification targets)
- `artifacts/api-server/src/routes/players.ts` -- N+1 query location (lines 205-244)
- `artifacts/api-server/src/routes/matches.ts` -- formatMatch duplicate, pagination target
- `artifacts/api-server/src/routes/submitRofl.ts` -- ELO bug (lines 233-240)
- `artifacts/api-server/src/routes/auth.ts` -- Auth endpoints to document in spec
- `artifacts/api-server/src/routes/vods.ts` -- Response shapes changed in Phase 2

### Bot Files
- `artifacts/discord-bot/src/lib/matchRecorder.ts` -- FOR UPDATE locking fix (lines 119-137)

### Shared Libraries
- `artifacts/api-server/src/lib/privacyGate.ts` -- Phase 2 privacy helpers (response shapes to document)

### Project Docs
- `docs/SCHEMA_CONTRACT.md` -- Schema reference for spec alignment
- `docs/BOT_SPEC.md` -- Bot command reference

### Codebase Analysis
- `.planning/codebase/CONCERNS.md` -- Detailed issue descriptions with line numbers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `privacyGate.ts`: 6 exported visibility functions — response shapes from these must be captured in OpenAPI spec
- `lib/api-spec/orval.config.ts`: Existing codegen config — run `pnpm run codegen` from `lib/api-spec/`
- Drizzle `inArray` operator: Already used in privacyGate.ts batch queries — same pattern for players N+1 fix

### Established Patterns
- Express route pattern: `Router()` → handlers → `export default router`
- Error responses: `res.status(N).json({ error: "message" })`
- DB queries: Drizzle ORM query builder (no raw SQL)
- Pagination: Not yet established — this phase introduces the pattern

### Integration Points
- `lib/api-client-react/src/generated/` — codegen output consumed by frontend
- `lib/api-zod/src/generated/` — codegen output for Zod validators
- `artifacts/api-server/src/routes/index.ts` — route mounting

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard approaches for API contract alignment, N+1 fixes, and pagination.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 03-api-contract-performance*
*Context gathered: 2026-03-27*
