---
phase: 01-schema-sync-auth-hardening
plan: 01
subsystem: database-schema
tags: [schema, documentation, migration, drizzle]
dependency_graph:
  requires: []
  provides: [schema-sync, elo-history-docs]
  affects: [matches-table, elo-history-table]
tech_stack:
  added: []
  patterns: [idempotent-migration]
key_files:
  created:
    - lib/db/drizzle/migrations/0003_add_match_type_tournament_code.sql
  modified:
    - docs/SCHEMA_CONTRACT.md
decisions:
  - eloHistory has no playerId — team-only ELO confirmed (D-01)
  - Migration uses IF NOT EXISTS for safe re-runs on production
metrics:
  duration: 2m
  completed: "2026-03-26T23:15:41Z"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 01 Plan 01: Schema Sync and eloHistory Doc Fix Summary

Removed stale playerId from eloHistory docs and created idempotent migration for missing match_type + tournament_code columns (Issue #221 P0).

## Task Results

### Task 1: Fix SCHEMA_CONTRACT.md eloHistory section and FK map (SCHM-02)

**Commit:** f59d832

Edited docs/SCHEMA_CONTRACT.md to match actual eloHistory.ts code:
- Removed `playerId` column from eloHistory definition (was documented but never existed in code)
- Changed `teamId` from optional to `.notNull()` to match actual code
- Updated section header from "(MODIFY -- add teamId)" to "(MODIFY -- team-only ELO, no playerId)"
- FK map already had no `elo_history.playerId` entry, confirmed correct

### Task 2: Run drizzle-kit push to sync missing columns (SCHM-01)

**Commit:** 1e0a19c

No Node.js runtime available in executor environment, so drizzle-kit could not be run directly. Created migration file `0003_add_match_type_tournament_code.sql` instead:
- `ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'scrim'`
- `ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_code TEXT`
- Includes verification assertions
- Schema .ts files are already correct; gap is database-level only
- Migration must be applied on deployment (Portainer restart runs drizzle-kit push automatically per entrypoint.bot.sh)

## Deviations from Plan

### Task 2: No drizzle-kit available

**Found during:** Task 2
**Issue:** No pnpm/node available in executor sandbox environment. Cannot run drizzle-kit generate/push.
**Resolution:** Per plan fallback ("If no local database is available, generate the migration SQL and document the pending changes"), created a hand-written idempotent migration SQL file. The Docker entrypoint runs `drizzle-kit push` on every container start, so schema will sync automatically on next deploy.

## Known Stubs

None -- no stubs introduced.

## Decisions Made

1. **eloHistory.playerId removed from docs (D-01 confirmed):** The code never had playerId. Documentation was stale. Team-only ELO is the correct design per PRD v3.1 section 8.
2. **Hand-written migration over drizzle-kit generate:** Without runtime access, a hand-written SQL migration with IF NOT EXISTS is safer and equivalent. Production deploy will apply via drizzle-kit push anyway.

## Self-Check: PASSED

- docs/SCHEMA_CONTRACT.md: FOUND
- lib/db/drizzle/migrations/0003_add_match_type_tournament_code.sql: FOUND
- Commit f59d832: FOUND
- Commit 1e0a19c: FOUND
