# Phase 3: API Contract & Performance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 03-api-contract-performance
**Areas discussed:** N+1 query fix, OpenAPI spec scope, Extra fixes, Codegen strategy, Error responses, Bot locking

---

## N+1 Query Fix Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Batch inArray queries | 2 batch queries (team + stats) merged in JS. Drizzle native, easy to maintain. | ✓ |
| LEFT JOIN + GROUP BY | Single SQL, but complex Drizzle GROUP BY, may need raw SQL. Best perf but worse readability. | |
| Claude decides | Trust research to pick best approach. | |

**User's choice:** Batch inArray queries
**Notes:** None

---

## Pagination for GET /players

| Option | Description | Selected |
|--------|-------------|----------|
| Add pagination | LIMIT/OFFSET alongside N+1 fix. rsoOptIn filter already has WHERE clause. | ✓ |
| Don't add | Just fix N+1, no pagination. Player count needs to be large to matter. | |
| Claude decides | Research-based decision. | |

**User's choice:** Add pagination
**Notes:** None

---

## OpenAPI Spec Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Full alignment | Auth endpoints + all Phase 1-2 response shape changes (isRedacted, isPrivate, pagination params). One-time complete sync. | ✓ |
| Auth endpoints only | Just SPEC-01 scope. Other changes deferred. | |
| Claude decides | Research-based scope. | |

**User's choice:** Full alignment
**Notes:** None

---

## Extra Fixes from CONCERNS.md

| Option | Description | Selected |
|--------|-------------|----------|
| submitRofl ELO bug | ELO computed for scrims, violates PRD. Few lines fix. | ✓ |
| formatMatch duplicates | Three files with different versions. Extract to shared utility. | ✓ |
| GET /matches pagination | No LIMIT, loads entire table. Same pattern as players pagination. | ✓ |
| None | Keep Phase 3 scope to PERF-01 + SPEC-01 + SPEC-02 only. | |

**User's choice:** All three extra fixes
**Notes:** None

---

## Codegen Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| All updates then codegen once | Spec fully aligned, then single codegen run. Avoids intermediate type errors. | ✓ |
| Per-endpoint codegen | Codegen after each endpoint update. Safer but slower. | |
| Claude decides | Research-based decision. | |

**User's choice:** All updates then codegen once
**Notes:** None

---

## Error Response Schemas

| Option | Description | Selected |
|--------|-------------|----------|
| Add to spec | Unified ErrorResponse schema ({ error: string }) with common HTTP status codes. Codegen produces typed error handling. | ✓ |
| Don't add | Spec only records success responses. | |
| Claude decides | Research-based scope. | |

**User's choice:** Add to spec
**Notes:** None

---

## Bot matchRecorder FOR UPDATE Locking

| Option | Description | Selected |
|--------|-------------|----------|
| Include in Phase 3 | Add FOR UPDATE locking to bot matchRecorder. Few lines, prevents race condition. | ✓ |
| Exclude | Phase 3 focuses on API server. Bot fix for future milestone. | |
| Claude decides | Research-based decision. | |

**User's choice:** Include in Phase 3
**Notes:** None

---

## Claude's Discretion

- Pagination default page size and parameter naming
- formatMatch field selection and typing approach
- OpenAPI spec organizational structure
- SQL optimization approach for GET /matches WHERE clauses

## Deferred Ideas

None — discussion stayed within phase scope.
