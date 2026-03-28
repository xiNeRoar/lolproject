---
phase: 04-spec-alignment-cleanup
plan: 01
status: complete
requirements_addressed: [SPEC-02]
gap_closure: true
files_modified:
  - artifacts/api-server/src/lib/formatters.ts
  - artifacts/api-server/src/routes/matches.ts
  - lib/db/src/schema/matches.ts
  - artifacts/discord-bot/src/lib/matchRecorder.ts
  - lib/api-spec/openapi.yaml
  - .planning/phases/01-schema-sync-auth-hardening/01-03-SUMMARY.md
decisions:
  - "eventSlug moved from formatMatch base to detail endpoint response (MatchDetail-only per OpenAPI)"
  - "vodCount defaults to 0 in formatMatch; list endpoint overrides with real count via spread"
  - "MatchListItem simplified to $ref Match (no allOf needed when no additional properties)"
  - "Codegen skipped (node/pnpm not available); must run manually before deploy"
metrics:
  duration: 3m
  completed: 2026-03-27
  tasks: 2
  files: 6
commits:
  - hash: 57cba05
    message: "feat(04-01): align formatMatch with OpenAPI Match schema and fix stale comment"
  - hash: 32a0c22
    message: "fix(04-01): remove duplicate vodCount from MatchListItem and populate 01-03-SUMMARY"
---

# Phase 4 Plan 1: Spec Alignment Cleanup Summary

Close 6 tech debt gaps: align formatMatch output with OpenAPI Match schema, fix stale visibility comment, add explicit matchType to bot INSERT, deduplicate MatchListItem, populate missing process artifact.

## What Was Done

### Task 1: formatMatch Alignment + Stale Comment + Explicit matchType

**Commit:** 57cba05

**formatters.ts** (3 changes):
- Added `bestOf: m.bestOf ?? null` to formatMatch return object -- aligns with OpenAPI Match schema field at line 2863
- Added `vodCount: 0` as default field -- aligns with OpenAPI Match schema field at line 2808. List endpoint overrides with real count via object spread
- Removed `eventSlug` from formatMatch return object AND from `extra` parameter type -- eventSlug is MatchDetail-only per OpenAPI (line 2894), not in Match base schema

**matches.ts route** (call site fix):
- Removed `eventSlug` from formatMatch call in detail endpoint
- Added `eventSlug: event?.slug ?? null` directly to the detail response spread, keeping it in the MatchDetail response where OpenAPI expects it

**matches.ts schema** (comment fix):
- Replaced stale "private for 7 days, then auto-public" comment with "NULL = private permanently (D-11). Captain sets via /visibility."
- Aligns with decision D-11 established in Phase 2

**matchRecorder.ts** (explicit matchType):
- Added `matchType: "scrim"` to the bot's INSERT values object
- Bot only processes .rofl files from scrims; making this explicit prevents reliance on schema default

### Task 2: MatchListItem Deduplication + 01-03-SUMMARY.md

**Commit:** 32a0c22

**openapi.yaml** (MatchListItem simplification):
- Replaced allOf composition (Match + {vodCount}) with simple `$ref: "#/components/schemas/Match"`
- vodCount was already in Match base schema (line 2808), making the MatchListItem extension redundant

**01-03-SUMMARY.md** (process artifact):
- Populated with AUTH-01 (OAuth CSRF state) and AUTH-03 (RSO token write removal) execution record
- Documents commits 61c4d6e and 3963be4 with file lists and decisions

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed matches.ts detail endpoint call site after eventSlug removal**
- **Found during:** Task 1
- **Issue:** Removing eventSlug from formatMatch extra type would cause a TypeScript error at the detail endpoint call site (matches.ts line 491) which still passed eventSlug
- **Fix:** Removed eventSlug from the formatMatch call and added it directly to the detail response spread
- **Files modified:** artifacts/api-server/src/routes/matches.ts
- **Commit:** 57cba05

### Skipped Steps

**Codegen not run:** Node.js/pnpm not available in current shell environment. The OpenAPI spec change (MatchListItem simplification) requires `cd lib/api-spec && pnpm run codegen` to regenerate frontend hooks and Zod validators. Must be run manually before deploy.

## Known Stubs

None -- all changes are complete data, no placeholders.

## Verification

- `grep bestOf artifacts/api-server/src/lib/formatters.ts` -- FOUND (line 38)
- `grep vodCount artifacts/api-server/src/lib/formatters.ts` -- FOUND (line 36)
- `grep eventSlug artifacts/api-server/src/lib/formatters.ts` -- NOT FOUND (removed)
- `grep "matchType.*scrim" artifacts/discord-bot/src/lib/matchRecorder.ts` -- FOUND (line 72)
- `grep "NULL = private permanently" lib/db/src/schema/matches.ts` -- FOUND (line 37)
- `wc -l 01-03-SUMMARY.md` -- 65 lines (exceeds 30-line minimum)
- MatchListItem in openapi.yaml -- simplified to $ref Match (no duplicate vodCount)

## Self-Check: PASSED

All 6 files verified present on disk. Both commit hashes (57cba05, 32a0c22) verified in git log.
