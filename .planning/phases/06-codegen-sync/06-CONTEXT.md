# Phase 6: Codegen Sync - Context

**Gathered:** 2026-03-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Run Orval codegen to regenerate React Query hooks and Zod validators from the updated OpenAPI spec. Verify generated output reflects all v3.2 spec changes (hasPuuid, rsoOptIn, PlayerTeamStats, getPlayerTeamStats). No manual code edits to generated files.

</domain>

<decisions>
## Implementation Decisions

### Codegen Execution
- **D-01:** Run `cd lib/api-spec && pnpm run codegen` (Orval). This regenerates both `lib/api-client-react/src/generated/` (React Query hooks) and `lib/api-zod/src/generated/` (Zod validators) from `lib/api-spec/openapi.yaml`.
- **D-02:** No manual edits to generated files — codegen output is the source of truth. If types are wrong, fix the OpenAPI spec and re-run codegen.

### Verification Scope
- **D-03:** Full verification after codegen:
  1. `pnpm --filter @workspace/api-client-react exec tsc --noEmit` — zero compile errors in generated React Query hooks
  2. `pnpm --filter @workspace/api-zod exec tsc --noEmit` — zero compile errors in generated Zod validators
  3. Grep generated hooks for `hasPuuid` — confirms AuthMeResponse type updated
  4. Grep generated hooks for `rsoOptIn` — confirms AuthMeResponse type updated
  5. Grep generated hooks for `PlayerTeamStats` — confirms new schema type exists
  6. Grep generated hooks for `getPlayerTeamStats` — confirms new endpoint hook exists
  7. Compare generated file list against OpenAPI paths — every path should have a corresponding hook/function

### Claude's Discretion
- Whether to run prettier on generated output (Orval config already has `prettier: true`)
- Ordering of verification checks

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Codegen Configuration
- `lib/api-spec/orval.config.ts` — Orval codegen config (two targets: api-client-react + zod)
- `lib/api-spec/package.json` — `codegen` script definition

### OpenAPI Spec (input)
- `lib/api-spec/openapi.yaml` — Source spec with Phase 5 additions (AuthMeResponse, PlayerTeamStats, /players/{id}/team-stats)

### Generated Output (to verify)
- `lib/api-client-react/src/generated/` — React Query hooks output directory
- `lib/api-zod/src/generated/` — Zod validators output directory

### Requirements
- `.planning/REQUIREMENTS.md` — STAT-03 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Orval config:** Already configured with `clean: true` (wipes old output before generating), `prettier: true`, custom fetch mutator
- **Two generation targets:** api-client-react (React Query hooks with custom fetch) and zod (Zod validators with coercion)

### Established Patterns
- Codegen always runs from `lib/api-spec/` directory
- Output uses `mode: "split"` — separate files per operation/schema
- `titleTransformer` forces API title to "Api" for consistent exports

### Integration Points
- Generated hooks consumed by `artifacts/vclol/src/` (frontend)
- Generated Zod validators consumed by `artifacts/api-server/` (request validation)
- `lib/api-client-react/src/custom-fetch.ts` is the fetch mutator (not generated, manually maintained)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — standard codegen run and verify.

</specifics>

<deferred>
## Deferred Ideas

None — Phase 6 is purely mechanical.

</deferred>

---

*Phase: 06-codegen-sync*
*Context gathered: 2026-03-28*
