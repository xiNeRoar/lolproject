# Phase 10: RSO Backend + Session Store - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning
**Mode:** Auto-generated (infrastructure phase — discuss skipped)

<domain>
## Phase Boundary

Implement the three RSO OAuth route handlers in auth.ts (GET /auth/connect/:token, GET /auth/rso, GET /auth/rso/callback) and switch the session store from in-memory to PostgreSQL-backed (connect-pg-simple). Backend-only phase — no frontend changes.

Research confirmed: auth.ts is 134 lines and handles only Discord OAuth. Zero RSO handlers exist. The OpenAPI spec defines all three routes with operationIds (authConnectToken, authRso, authRsoCallback). Generated hooks exist but backend is missing. In-memory sessions will break RSO mid-flow on server restart.

</domain>

<decisions>
## Implementation Decisions

### Claude's Discretion
All implementation choices are at Claude's discretion — backend infrastructure phase. Use ROADMAP success criteria, OpenAPI spec, and existing Discord OAuth patterns in auth.ts as reference.

### Key Research Findings
- RSO must use full-page navigation (server-side redirects), not API fetch
- GET /auth/connect/:token validates bot-generated token, initiates RSO redirect to auth.riotgames.com
- GET /auth/rso is the entry point for website-initiated RSO (optional, may redirect to Riot auth)
- GET /auth/rso/callback exchanges auth code for PUUID, updates player record, redirects to /dashboard
- connect-pg-simple is the only new npm dependency for entire milestone
- Session table auto-created by connect-pg-simple if configured
- RSO production key is a Riot dependency — build with placeholder credentials

</decisions>

<canonical_refs>
## Canonical References

### OpenAPI Spec (route contracts)
- `lib/api-spec/openapi.yaml` — /auth/connect/{token}, /auth/rso, /auth/rso/callback paths
### Existing Auth Implementation
- `artifacts/api-server/src/routes/auth.ts` — Discord OAuth pattern to follow
- `artifacts/api-server/src/app.ts` — Session configuration
- `artifacts/api-server/src/lib/session.ts` — Session type declarations
### Schema
- `lib/db/src/schema/players.ts` — puuid and rsoOptIn columns

</canonical_refs>

<deferred>
## Deferred Ideas

None — discuss phase skipped.

</deferred>
