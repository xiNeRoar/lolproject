---
phase: 05
reviewers: [codex]
reviewed_at: "2026-03-28T19:18:00Z"
plans_reviewed: [05-01-PLAN.md, 05-02-PLAN.md]
---

# Cross-AI Plan Review — Phase 5

## Codex Review (GPT-5.4)

### Plan 05-01: Update /auth/me

**Summary:** Plan 05-01 is directionally correct and should satisfy AUTH-06, AUTH-07, D-05, D-06, and D-08, but it is slightly under-specified in a few places that matter for correctness and maintainability. The main risk is the handler-level implementation detail: adding a database query and a catch-based fallback can accidentally mask real server errors or create inconsistent behavior.

**Strengths:**
- Updates existing named AuthMeResponse schema, matching D-08
- Includes hasPuuid and rsoOptIn in both authenticated and unauthenticated responses, matching D-05 and D-06
- Uses boolean normalization to keep response shape stable
- Keeps scope tight to actual phase goal

**Concerns:**
- **HIGH**: Catch block returns graceful fallback — risky if it converts real DB/server failures into false/false, hiding outages and producing misleading auth state
- **MEDIUM**: Plan does not specify how authenticated user maps to playersTable. Identity linkage should be explicit
- **MEDIUM**: Unclear whether rsoOptIn comes from playersTable for all authenticated users or only when linked player exists
- **LOW**: Making handler async adds DB hit to previously cheap endpoint
- **LOW**: Should mark hasPuuid and rsoOptIn as required booleans in schema

**Suggestions:**
- Return 500 for actual server/DB failures; only return false/false for unauthenticated or unlinked-user cases
- Specify identity resolution path clearly
- Mark hasPuuid and rsoOptIn as required boolean properties in AuthMeResponse

**Risk Assessment:** MEDIUM

---

### Plan 05-02: Create team-stats endpoint

**Summary:** Plan 05-02 is mostly well-aligned with STAT-01, STAT-02, and user decisions. The biggest strength is staying within the requested endpoint contract. The main risks are around query correctness: team membership history vs current membership, match aggregation semantics, and privacy leakage through existence checks.

**Strengths:**
- Correct nested resource path matching D-01
- Unpaginated flat response matching D-02
- Named PlayerTeamStats schema matching D-07
- Privacy gating incorporated
- Zero-match teams handled with zeroed aggregates
- Merge-via-Map is simple and efficient

**Concerns:**
- **HIGH**: Plan does not clarify whether stats are based on all teams ever belonged to, only current memberships, or memberships valid at time of each match
- **HIGH**: Privacy gate failure behavior not explicit — 403 vs 404 affects information disclosure
- **HIGH**: CASE-based teamSide→teamId aggregation can be fragile with null/malformed side data
- **MEDIUM**: Denominator for averages not defined — are averages per game for that team?
- **MEDIUM**: Number(Number(val).toFixed(2)) is presentation logic in handler; can create rounding inconsistency
- **MEDIUM**: 2-phase design may be more complexity than needed vs single grouped query with left joins
- **MEDIUM**: Plan does not mention whether inactive/left memberships included
- **LOW**: No mention of route-level :id validation
- **LOW**: Index requirements on membership and match-stat tables not mentioned

**Suggestions:**
- Define business rule for team inclusion explicitly (all historical vs current only)
- Define privacy failure behavior consistently (403 vs 404)
- Specify match eligibility rules (remakes, incomplete stats)
- Make average contract explicit: zero-game teams return numeric zeros, not nulls
- Consider single SQL query with left joins instead of 2-phase approach

**Risk Assessment:** MEDIUM-HIGH

---

### Cross-Plan Assessment

**Strengths:**
- Clear separation between auth and stats work
- OpenAPI updates treated as first-class tasks
- Both plans align with requirements and user decisions
- No scope creep

**Concerns:**
- **HIGH**: Both plans vague on error semantics — can create inconsistent API behavior
- **MEDIUM**: Neither plan explicitly calls out tests
- **MEDIUM**: Data contract precision stronger in /auth/me than team-stats

**Overall Risk Assessment:** MEDIUM

---

## Consensus Summary

### Agreed Strengths
- Plans align with user decisions and requirements
- OpenAPI-first approach is correct
- Scope is well-contained

### Agreed Concerns
1. **Error semantics under-specified** — graceful fallback in /auth/me catch block may mask real failures
2. **Team membership business rules unclear** — all historical vs current only for stats aggregation
3. **Privacy gate behavior not explicit** — 403 vs 404 information disclosure

### Divergent Views
Single reviewer — no divergence to report.

---

**Response to HIGH concerns (orchestrator notes for /gsd:plan-phase --reviews):**

1. **Catch block masking failures:** The actual plan code DOES log via `console.error("[auth]", err)` before returning fallback. This is the established pattern in auth.ts (other handlers do the same). The "graceful fallback" is intentional — /auth/me should never crash the frontend auth state check. This is a valid concern but the implementation already addresses it via logging.

2. **Team membership scope:** The plan explicitly queries team_members which contains ALL memberships (active, inactive, pending). The `status` field is included in the response so the frontend can distinguish. This is the correct behavior for a "career resume" — all teams ever played for.

3. **Privacy gate 403 vs 404:** The plan follows the EXACT same pattern as the existing /players/:id/champions endpoint (line 700-758 in players.ts) which returns 403 for private profiles. This is consistent with Phase 2 decisions (D-07, D-08, D-09). Changing to 404 would break consistency.

4. **CASE fragility:** match_players.teamSide is always "A" or "B" — set by the bot's matchRecorder during .rofl parsing. NULL values are filtered by the statsMap null check. This is a valid concern but mitigated by data invariants.
