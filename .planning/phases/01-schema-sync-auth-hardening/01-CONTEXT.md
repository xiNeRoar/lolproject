# Phase 1: Schema Sync & Auth Hardening - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Ensure the production database has all columns defined in the Drizzle ORM schema, and harden all OAuth flows (Discord + RSO) against CSRF, token leakage, and session hijacking. This is foundation work — Phase 2 (Privacy Gates) depends on schema being correct and auth being secure.

</domain>

<decisions>
## Implementation Decisions

### eloHistory Schema
- **D-01:** Remove `playerId` from SCHEMA_CONTRACT.md to match actual code. PRD v3.1 confirms team-only ELO. Player-match relationships are available via JOIN through `elo_history → matchId → match_players → playerId`. No denormalization needed.

### Schema Sync Strategy
- **D-02 (Claude's Discretion):** Use `drizzle-kit push` for dev, `drizzle-kit generate` + `migrate` for production per DEPLOYMENT.md §Schema Change Workflow. Identify ALL missing columns (not just match_type) in a single push. Take backup guidance from DEPLOYMENT.md.

### OAuth State Parameter
- **D-03 (Claude's Discretion):** Add cryptographic `state` parameter to both Discord and RSO OAuth flows. Store state in session (already session-based auth). Validate on callback. Standard OWASP pattern.

### CORS Policy
- **D-04 (Claude's Discretion):** Restrict CORS to `PLATFORM_URL` env var (production domain) + `localhost:*` for development. Remove wildcard-with-credentials. Use `cors()` middleware configuration.

### RSO Token Storage
- **D-05:** Keep `rsoAccessToken` and `rsoRefreshToken` schema columns but do NOT populate them in auth flow. Only persist PUUID. Add code comment: `// TODO: Tournament API integration requires encrypted token storage — see PROJECT.md Key Decisions`. Decision from PROJECT.md Key Decisions table.

### Session Secret
- **D-06 (Claude's Discretion):** Add startup validation that `SESSION_SECRET` is not the default dev value when `NODE_ENV=production`. Log error and refuse to start if default secret detected.

### Match Visibility Endpoint
- **D-07 (Claude's Discretion):** Derive `playerId` from `req.session.playerId` instead of accepting it in request body. Prevents spoofed visibility changes.

### Claude's Discretion
Schema sync approach, OAuth state implementation details, CORS configuration specifics, session secret validation, and visibility endpoint fix are all standard security patterns. Claude has full discretion on implementation approach for D-02 through D-07.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema
- `docs/SCHEMA_CONTRACT.md` — Source of truth for all table definitions and FK relationships
- `lib/db/src/schema/` — Actual Drizzle ORM schema files (compare against contract)
- `docs/REQUESTS.md` — #221 P0 schema sync issue details

### Auth & Security
- `artifacts/api-server/src/routes/auth.ts` — Current Discord + RSO OAuth implementation (331 lines)
- `artifacts/api-server/src/app.ts` — CORS and session configuration
- `artifacts/api-server/src/lib/session.ts` — Session store setup
- `docs/DEPLOYMENT.md` — Environment variables for RSO, session secret requirements
- `docs/PRD_v3.md` §5, §11 — RSO as launch requirement, identity architecture

### Privacy (context for Phase 2 dependency)
- `docs/PRD_v3.md` §7 — 3-layer privacy model (Phase 2 depends on Phase 1 schema being correct)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `artifacts/api-server/src/routes/auth.ts` — RSO OAuth already implemented (lines 94-308), needs state param added
- `artifacts/api-server/src/middlewares/requireAdmin.ts` — Admin auth middleware pattern to follow
- `lib/db/drizzle.config.ts` — Drizzle migration config

### Established Patterns
- Session-based auth via `express-session` (not JWT)
- Admin routes use `requireAdmin()` middleware; player routes check session inline
- Schema changes: edit schema file → generate → migrate (per DEPLOYMENT.md)

### Integration Points
- `artifacts/api-server/src/app.ts` — CORS config lives here (line ~25)
- `artifacts/api-server/src/routes/auth.ts` — OAuth state param needs adding to Discord (line ~30) and RSO (line ~94) flows
- `artifacts/api-server/src/routes/matches.ts` — Visibility endpoint that needs session-based playerId

</code_context>

<specifics>
## Specific Ideas

- User confirmed Tournament API is a definite future requirement — RSO token columns stay in schema as placeholder
- eloHistory decision driven by clear PRD design: "Team ELO, not player ELO" + JOIN availability

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-schema-sync-auth-hardening*
*Context gathered: 2026-03-26*
