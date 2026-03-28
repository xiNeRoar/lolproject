# Phase 2: Privacy Gates - Research

**Researched:** 2026-03-26
**Domain:** API visibility/redaction logic, Riot Games custom match privacy compliance
**Confidence:** HIGH

## Summary

Phase 2 implements the 3-layer privacy model defined in PRD v3.1 S7 across all API endpoints. The core work is consolidating scattered visibility logic into a shared `privacyGate.ts` helper module, then enforcing it uniformly across matches, players, VODs, and search routes. This is a backend-only phase -- no schema changes, no frontend changes, no new dependencies.

The codebase already has partial visibility logic: `isVisible()` and `isMemberOfMatch()` in matches.ts, profile visibility checking in players.ts `GET /:riotId`, and `rsoOptIn` filtering in search.ts. However, there are critical gaps: (1) the match list endpoint (`GET /matches`) has NO visibility filtering at all -- it returns all matches with full metadata to any requester, (2) the VOD routes have a 7-day auto-public bug where `visibleAfter = null` defaults to `createdAt + 7 days` instead of treating null as private, (3) the `GET /players` list endpoint has no `rsoOptIn` filter, and (4) the `GET /players/by-id/:id` profile endpoint has zero visibility checking. The existing `isMemberOfMatch()` also uses team_members (roster membership) rather than match_players (the 10 actual participants) as specified in D-03.

**Primary recommendation:** Extract all visibility logic into `artifacts/api-server/src/lib/privacyGate.ts` with three core functions, then systematically update each route file to use them. Work from the inside out: helpers first, then match routes, then player routes, then VOD routes.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Non-participants viewing scrim matches see: team names, score, date, game duration ONLY. No player stats, no champion picks, no KDA, no items.
- **D-02:** API returns partial data with `isRedacted: true` flag when redacting. Frontend can show "Login to see full stats" CTA. NOT a 403/404.
- **D-03:** Participant = any of the 10 players in that match (checked via session playerId -> match_players lookup).
- **D-04 (NEW from research):** Captain `/visibility public` for scrims only makes team-level results public (team names, score, date, duration). Per-player stats (champion, KDA, items) require each player's individual RSO opt-in (`rsoOptIn = true`) to be publicly visible. This split is critical for Riot policy compliance.
- **D-05:** Tournament/event matches (`matchType = 'ranked_tournament' | 'event'`) bypass all visibility gates -- fully public by design (PRD S7 Layer 3). All 10 player stats visible to anyone.
- **D-06:** GET /players and global search API filter by `rsoOptIn = true`. Non-opted players invisible in search results. No flag, no hint -- they simply don't appear.
- **D-07:** `profileVisibility = 'private'` -> only the player themselves can see full profile. Others get minimal response: `{ id, riotId, isPrivate: true, teams }`.
- **D-08:** `profileVisibility = 'public'` -> anyone can see full profile (only after RSO opt-in).
- **D-09:** `profileVisibility = 'participants-only'` -> same-match participants can see full profile. "Same-match" = any player who appeared in the same match (10-player pool from match_players table). NOT same-team -- same-match.
- **D-10:** VOD visibility follows match visibility exactly. If match is private -> VOD is private. If match is public -> VOD is public.
- **D-11:** `visibleAfter = null` treated as PRIVATE (not 7-day delay). Fix the 7-day auto-public bug in vods.ts.
- **D-12:** POV VOD always requires individual player RSO opt-in consent regardless of match visibility (PRD S10).
- **D-13:** Extract shared visibility helpers into `artifacts/api-server/src/lib/privacyGate.ts`. Functions: `isMatchVisibleTo(match, playerId)`, `isPlayerProfileVisibleTo(player, viewerId)`, `redactMatchForNonParticipant(match)`.
- **D-14:** All routes that check visibility MUST use shared helpers -- no inline visibility logic.
- **D-15:** Privacy gates must feel natural, not blocking. "Login to see details" is a reward unlock CTA, not a wall. API returns enough data to be useful (team names, score) even when redacted.
- **D-16:** Bot Discord embeds in-channel are unaffected by privacy gates (all 10 players just played together -- server-members-only context per PRD S7 Layer 1).

### Claude's Discretion
- Implementation of `privacyGate.ts` helper functions (internal API)
- Query optimization for participant lookup
- Error message wording for 401/403 responses
- How to handle edge cases (deleted players, null teamIds)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PRIV-01 | Match detail API returns Team A vs B + score only for non-participant scrims (Layer 1) | Current `GET /matches/:id` uses `isMemberOfMatch()` (team_members) not match_players. Must change to match_players lookup per D-03. Redacted response needs `isRedacted: true` per D-02 instead of current `_private: true`. Must also strip `gameDuration` from redacted response per D-01 (currently keeps it) -- CORRECTION: D-01 says game duration IS included in redacted view. |
| PRIV-02 | Tournament/event matches bypass visibility gate -- always public (Layer 3) | Current `isVisible()` already handles tournament/event matches correctly (returns true unless captain set private). D-04 adds nuance: when captain sets scrim public, per-player stats still require individual `rsoOptIn`. |
| PRIV-03 | Player search API filters by rsoOptIn -- non-opted players invisible | `GET /players` (list all) has NO rsoOptIn filter. `GET /api/search` already filters by `rsoOptIn = true`. Need to add filter to `GET /players`. |
| PRIV-04 | Player profile API respects profileVisibility setting (private/public/participants-only) | `GET /players/:riotId` already implements this. `GET /players/by-id/:id` does NOT -- returns full profile to anyone. Both must use shared helper. |
| PRIV-05 | VOD visibility follows match visibility -- fix 7-day auto-public bug in vods.ts | Two bugs: (1) `isMatchPublic()` line 27: `return Date.now() >= match.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000` when `visibleAfter` is null. (2) GET /vods list filter line 177: same 7-day logic. Both must treat null as private per D-11. Also: VOD detail route (`GET /vods/:id`) has NO visibility check at all. |
| PRIV-06 | Visibility logic consolidated into shared helper (eliminate divergent implementations) | Three visibility functions duplicated across files. `isVisible()` in matches.ts, `isMatchPublic()` in vods.ts (different logic!), inline profile visibility in players.ts. All must be replaced with `privacyGate.ts` helpers per D-13/D-14. |
</phase_requirements>

## Standard Stack

No new dependencies needed. This phase is purely refactoring existing Express route logic.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| express | ^5 | Route handlers being modified | Already in use |
| drizzle-orm | ^0.45.1 | DB queries for participant lookup | Already in use |
| express-session | ^1.19.0 | `req.session.playerId` for auth checks | Already in use |

### Supporting
No additional libraries needed. All privacy gate logic is pure TypeScript conditionals + Drizzle queries.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Inline visibility checks | Express middleware | Middleware would add overhead to every request; helper functions called only when needed are lighter |
| Database-level RLS (Row Level Security) | PostgreSQL RLS policies | Far too complex for this use case; would require passing session context to DB; not worth it for 3-4 routes |

## Architecture Patterns

### New File Structure
```
artifacts/api-server/src/
  lib/
    privacyGate.ts           # NEW - shared visibility helpers
  routes/
    matches.ts               # MODIFY - use privacyGate, change participant check
    players.ts               # MODIFY - use privacyGate, add rsoOptIn filter
    vods.ts                  # MODIFY - use privacyGate, fix 7-day bug
    search.ts                # VERIFY - already filters by rsoOptIn (confirmed)
```

### Pattern 1: Privacy Gate Helper Module
**What:** A single file exporting all visibility-checking functions, imported by route files.
**When to use:** Every route that returns match data, player data, or VOD data to non-admin requesters.

```typescript
// artifacts/api-server/src/lib/privacyGate.ts

import { db } from "@workspace/db";
import { matchPlayersTable, matchesTable, playersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

type Match = typeof matchesTable.$inferSelect;
type Player = typeof playersTable.$inferSelect;

/**
 * Check if a match's full stats are visible to a given viewer.
 * Returns: { canSeeStats: boolean, isParticipant: boolean, matchType: string }
 */
export async function isMatchVisibleTo(
  match: Match,
  viewerId: number | null,
  isAdmin: boolean
): Promise<{ canSeeStats: boolean; isParticipant: boolean }> {
  // Admin always sees everything
  if (isAdmin) return { canSeeStats: true, isParticipant: false };

  const matchType = (match as any).matchType ?? "scrim";

  // Layer 3: Tournament/event matches are always public
  if (matchType === "ranked_tournament" || matchType === "event") {
    // Unless captain explicitly set private (visibleAfter far-future)
    if (match.visibleAfter && match.visibleAfter.getFullYear() >= 9000) {
      // Even then, check participant
      if (viewerId) {
        const isParticipant = await checkMatchParticipant(match.id, viewerId);
        return { canSeeStats: isParticipant, isParticipant };
      }
      return { canSeeStats: false, isParticipant: false };
    }
    return { canSeeStats: true, isParticipant: false };
  }

  // Layer 1: Scrim - check participant via match_players (D-03)
  if (viewerId) {
    const isParticipant = await checkMatchParticipant(match.id, viewerId);
    if (isParticipant) return { canSeeStats: true, isParticipant: true };
  }

  // Check if captain set public (visibleAfter in the past or epoch)
  if (match.visibleAfter && Date.now() >= match.visibleAfter.getTime()) {
    return { canSeeStats: true, isParticipant: false };
  }

  // Default: scrim is private (visibleAfter = null means private per D-11)
  return { canSeeStats: false, isParticipant: false };
}

/**
 * Check if playerId is one of the 10 match_players (D-03).
 * NOT team_members -- only actual participants in this specific match.
 */
async function checkMatchParticipant(matchId: number, playerId: number): Promise<boolean> {
  const [row] = await db
    .select({ id: matchPlayersTable.id })
    .from(matchPlayersTable)
    .where(and(
      eq(matchPlayersTable.matchId, matchId),
      eq(matchPlayersTable.playerId, playerId)
    ))
    .limit(1);
  return !!row;
}
```

### Pattern 2: Redacted Match Response
**What:** Return match metadata without player stats when viewer lacks access.
**When to use:** Non-participants viewing scrims, or any redacted context.

```typescript
/**
 * Strip per-player data from match response. Returns team-level data only.
 * D-01: team names, score, date, game duration. Nothing else.
 * D-02: includes isRedacted: true flag.
 */
export function redactMatchForNonParticipant(
  formattedMatch: Record<string, any>
): Record<string, any> {
  return {
    id: formattedMatch.id,
    teamAId: formattedMatch.teamAId,
    teamBId: formattedMatch.teamBId,
    teamAName: formattedMatch.teamAName,
    teamBName: formattedMatch.teamBName,
    teamATag: formattedMatch.teamATag,
    teamBTag: formattedMatch.teamBTag,
    sideAName: formattedMatch.sideAName,
    sideBName: formattedMatch.sideBName,
    matchTitle: formattedMatch.matchTitle,
    winnerName: formattedMatch.winnerName,
    score: formattedMatch.score,
    gameDuration: formattedMatch.gameDuration,
    createdAt: formattedMatch.createdAt,
    updatedAt: formattedMatch.updatedAt,
    matchPlayers: [],
    vods: [],
    isRedacted: true,
  };
}
```

### Pattern 3: D-04 Per-Player RSO Opt-In Filtering
**What:** When captain makes a scrim "public", team-level results are public but per-player stats only show for players with `rsoOptIn = true`.
**When to use:** Scrim matches with `visibleAfter` in the past AND viewer is not a participant.

```typescript
/**
 * D-04: For public scrims viewed by non-participants, filter match_players
 * to only include rows where the player has rsoOptIn = true.
 * Players without opt-in get their row replaced with a placeholder.
 */
export function filterMatchPlayersByOptIn(
  matchPlayers: Array<any>,
  playerOptInMap: Record<number, boolean>,
  viewerIsParticipant: boolean
): Array<any> {
  if (viewerIsParticipant) return matchPlayers; // participants see all

  return matchPlayers.map((mp) => {
    if (!mp.playerId || playerOptInMap[mp.playerId]) return mp;
    // Mask non-opted player
    return {
      ...mp,
      playerRiotId: null,
      champion: null,
      kills: null, deaths: null, assists: null,
      cs: null, gold: null, damageToChampions: null,
      visionScore: null, item0: null, item1: null,
      item2: null, item3: null, item4: null, item5: null, item6: null,
      _masked: true,
    };
  });
}
```

### Anti-Patterns to Avoid
- **Inline visibility checks in routes:** Every route currently has its own visibility logic. D-14 explicitly forbids this -- all routes MUST use shared helpers.
- **Using team_members for participant check:** Current `isMemberOfMatch()` checks roster membership. D-03 specifies participant = one of the 10 match_players. These are different -- a bench player on the roster who didn't play should NOT see stats.
- **Returning 403 for private content:** D-02 says return partial data with `isRedacted: true`, NOT a 403. The current match detail returns `_private: true` with empty arrays -- close but needs the `isRedacted` flag name change.
- **Checking visibleAfter only:** Must also check `matchType` first. Tournament/event matches bypass visibleAfter entirely (D-05).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Participant lookup | Custom SQL per route | `checkMatchParticipant()` in privacyGate.ts | Single query, single truth, consistent across all routes |
| Profile visibility checking | Inline checks per route | `isPlayerProfileVisibleTo()` in privacyGate.ts | Avoids the bug where `GET /players/by-id/:id` has no check but `GET /players/:riotId` does |
| Match redaction | Per-route field stripping | `redactMatchForNonParticipant()` in privacyGate.ts | Ensures consistent redacted fields across detail and list endpoints |

**Key insight:** The current codebase has three different implementations of "is this match visible" (matches.ts `isVisible()`, vods.ts `isMatchPublic()`, and the inline visibility check in matches.ts GET / list). They disagree on what `visibleAfter = null` means. Consolidation is the primary value of this phase.

## Common Pitfalls

### Pitfall 1: The 7-Day Auto-Public Bug (PRIV-05)
**What goes wrong:** VODs for scrims become publicly visible after 7 days even when the captain never set them public.
**Why it happens:** `isMatchPublic()` in vods.ts line 27 treats `visibleAfter = null` as "7 days after creation." The GET /vods list filter (line 177) has the same logic.
**How to avoid:** `visibleAfter = null` must mean PRIVATE per D-11. The new `isMatchVisibleTo()` helper treats null as private. All routes must use this helper.
**Warning signs:** Any code that does `createdAt.getTime() + 7 * 24 * 60 * 60 * 1000` is the bug.

### Pitfall 2: isMemberOfMatch Uses team_members Not match_players
**What goes wrong:** A bench player who is on the roster but didn't play this specific match gets full stats access.
**Why it happens:** Current `isMemberOfMatch()` queries `team_members` table (roster) with `status = 'active'`. D-03 specifies participant = one of the 10 match_players entries.
**How to avoid:** New `checkMatchParticipant()` queries `match_players` where `playerId = viewerId AND matchId = matchId`.
**Warning signs:** Any query that touches `team_members` for match visibility is wrong.

### Pitfall 3: GET /players List Has No Privacy Filter
**What goes wrong:** All players appear in the player list, including those who haven't opted into RSO.
**Why it happens:** The `GET /players` route has no `rsoOptIn` filter -- it returns everyone.
**How to avoid:** Add `.where(eq(playersTable.rsoOptIn, true))` to the query per D-06. Admin bypass must still see all players.
**Warning signs:** Any player list query without `rsoOptIn` filter (except admin routes).

### Pitfall 4: GET /players/by-id/:id Has No Visibility Check
**What goes wrong:** Any requester gets the full player profile by ID, bypassing privacy settings.
**Why it happens:** The route was added for internal use and never got the same visibility gate as `GET /players/:riotId`.
**How to avoid:** Apply the same `isPlayerProfileVisibleTo()` helper to both routes.
**Warning signs:** Profile endpoint without session checking.

### Pitfall 5: Match List Endpoint Leaks Data
**What goes wrong:** `GET /matches` returns all matches with full metadata (ELO data, visibleAfter, roflFilePath) to any requester.
**Why it happens:** The list endpoint was designed for admin use and never got privacy filtering.
**How to avoid:** The match list returns team-level data (names, score, date) for all matches -- this is intentional per PRD S7 (team aggregate is public). But fields like `roflFilePath` and ELO data for private scrims should be stripped. The list endpoint does NOT include match_players, so per-player stats are already excluded.
**Warning signs:** Sensitive fields (roflFilePath, visibleAfter) in list responses.

### Pitfall 6: VOD Detail Route Has No Visibility Check
**What goes wrong:** `GET /vods/:id` returns the full VOD (including videoUrl) regardless of match visibility.
**Why it happens:** The detail route was built before the visibility model was designed.
**How to avoid:** Check match visibility via the shared helper. If match is private and viewer is not a participant, return 403 or redacted response.
**Warning signs:** VOD routes that don't check `isMatchVisibleTo()`.

### Pitfall 7: D-04 Captain Public Override Still Masks Non-RSO Players
**What goes wrong:** Captain sets a scrim to "public" expecting all stats to be visible, but per-player data for non-RSO-opted players must still be masked.
**Why it happens:** D-04 is a new requirement from privacy research. The captain's `/visibility public` only makes team-level results public. Individual player stats require that player's `rsoOptIn = true`.
**How to avoid:** When rendering match_players for a "public" scrim to a non-participant, check each player's `rsoOptIn` and mask those without it.
**Warning signs:** Public scrims showing champion/KDA for players who haven't completed RSO opt-in.

## Code Examples

### Current Bugs to Fix

#### Bug 1: 7-day auto-public in vods.ts (lines 26-28)
```typescript
// CURRENT (BUGGY):
if (!match.visibleAfter) {
  return Date.now() >= match.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000;
}

// FIXED:
if (!match.visibleAfter) {
  return false; // null = private per D-11
}
```

#### Bug 2: Same 7-day bug in vods.ts GET /vods list (lines 176-178)
```typescript
// CURRENT (BUGGY):
if (!m.visibleAfter) {
  matchVisibility[m.id] = now >= m.createdAt.getTime() + 7 * 24 * 60 * 60 * 1000;
}

// FIXED:
if (!m.visibleAfter) {
  matchVisibility[m.id] = false; // null = private per D-11
}
```

#### Bug 3: matches.ts visibility default comment is wrong (line 38)
```typescript
// CURRENT:
// Visibility: private for 7 days, then auto-public. Captain can override.
// NULL = use default (createdAt + 7 days).

// The schema comment says 7-day default but the isVisible() function
// correctly treats null as private. The comment is misleading.
// The matches.ts isVisible() is correct, but vods.ts diverged.
```

#### Bug 4: matches.ts isMemberOfMatch uses team_members
```typescript
// CURRENT (WRONG per D-03):
async function isMemberOfMatch(playerId, match) {
  // Queries team_members with status='active'
  // A bench player who didn't play gets access
}

// REPLACE WITH:
async function checkMatchParticipant(matchId, playerId) {
  // Queries match_players where playerId = viewerId
  // Only actual 10 participants get access
}
```

### Routes Requiring Modification

| Route | File | Current State | Required Change |
|-------|------|---------------|-----------------|
| `GET /matches/:id` | matches.ts | Has visibility gate via `isMemberOfMatch` (team_members) | Switch to `checkMatchParticipant` (match_players), use `isRedacted` flag |
| `GET /matches/:id/players` | matches.ts | Same duplicated visibility logic | Use shared `isMatchVisibleTo()` |
| `GET /matches/:id/replay` | matches.ts | Uses `isVisible()` + `isMemberOfMatch` | Use shared helper, fix participant check |
| `GET /matches` | matches.ts | No visibility filtering at all | Strip sensitive fields (roflFilePath) for non-admin |
| `GET /players` | players.ts | No rsoOptIn filter | Add `rsoOptIn = true` filter, admin bypass |
| `GET /players/by-id/:id` | players.ts | No visibility check | Add `isPlayerProfileVisibleTo()` |
| `GET /players/:riotId` | players.ts | Has inline visibility logic | Replace with shared helper |
| `GET /players/:id/events` | players.ts | No visibility check | Consider: should follow player profile visibility |
| `GET /players/:id/champions` | players.ts | No visibility check | Should follow player profile visibility |
| `GET /vods` | vods.ts | 7-day auto-public bug | Fix null handling, use `isMatchVisibleTo()` |
| `GET /vods/:id` | vods.ts | No visibility check at all | Add match visibility check |
| `GET /api/search` | search.ts | Already filters `rsoOptIn` | Verify correct (CONFIRMED: already correct) |
| `PUT /matches/:id/visibility` | matches.ts | Uses session.playerId | Already correct, no change needed |

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `_private: true` flag | `isRedacted: true` flag | D-02 decision | Frontend CTA can distinguish redacted from private |
| team_members participant check | match_players participant check | D-03 decision | Tighter access control -- only actual 10 players |
| 7-day auto-public for scrims | Default private (null = private) | D-11 decision | Aligns with Riot policy: custom data private by default |
| Captain public = all stats visible | Captain public = team-level only; per-player needs RSO opt-in | D-04 decision | New requirement from Riot privacy research |

## Open Questions

1. **What should `GET /players/:id/events` and `GET /players/:id/champions` return for private players?**
   - What we know: These are sub-routes of player profiles. If the player's profile is private, these should probably be private too.
   - What's unclear: CONTEXT.md doesn't explicitly mention these endpoints.
   - Recommendation: Apply `isPlayerProfileVisibleTo()` to these routes too. They expose player-specific aggregate stats, which should follow the same rules as the main profile. Claude has discretion here.

2. **Should the match list endpoint (`GET /matches`) strip ELO fields for scrims?**
   - What we know: Scrims don't have ELO (always null per PRD S8). The fields exist but are null for scrims.
   - What's unclear: Whether to strip null ELO fields is redundant -- they're already null.
   - Recommendation: No action needed -- the fields are null for scrims anyway. Focus on stripping `roflFilePath` and `visibleAfter` from non-admin responses.

3. **Edge case: deleted/null playerId in match_players**
   - What we know: `match_players.playerId` is nullable (set null on player delete). A viewer whose player record was deleted can't be a participant.
   - What's unclear: Should we handle this gracefully or is it expected?
   - Recommendation: `checkMatchParticipant` naturally handles this -- if playerId is null, the lookup returns no match. No special handling needed.

## Project Constraints (from CLAUDE.md)

- **Schema-first:** Any schema changes must go through `lib/db/src/schema/` -> `pnpm run generate` -> `pnpm run migrate`. However, this phase requires NO schema changes.
- **Ownership boundary:** Claude owns `artifacts/api-server/src/` (routes, lib, middlewares). Do NOT touch `artifacts/vclol/src/`.
- **OpenAPI codegen deferred:** OpenAPI spec updates and codegen are Phase 3. This phase changes response shapes (adding `isRedacted` flag) but does NOT update the OpenAPI spec.
- **No test framework:** The project has no test framework installed. Verification will be manual or via curl/HTTP testing.
- **File naming:** Use kebab-case for source files (`privacy-gate.ts`). But the CONTEXT.md specifies `privacyGate.ts` (camelCase). Follow the CONTEXT.md decision since it's a locked choice.
- **Import style:** Use `.js` extension in relative imports (ESM requirement). Workspace imports use bare specifiers.
- **Error handling:** Return JSON `{ error: "message" }` with appropriate HTTP status codes. Use `[topic]` prefix for console.error.
- **Express 5:** Router pattern with `export default router`.

## Sources

### Primary (HIGH confidence)
- `artifacts/api-server/src/routes/matches.ts` -- read in full, all visibility logic analyzed
- `artifacts/api-server/src/routes/players.ts` -- read in full, profile visibility logic analyzed
- `artifacts/api-server/src/routes/vods.ts` -- read in full, 7-day bug confirmed at lines 27, 177
- `artifacts/api-server/src/routes/search.ts` -- read in full, rsoOptIn filter confirmed
- `artifacts/api-server/src/lib/session.ts` -- session type definitions confirmed
- `lib/db/src/schema/matches.ts` -- matchType, visibleAfter fields confirmed
- `lib/db/src/schema/players.ts` -- rsoOptIn, profileVisibility fields confirmed
- `lib/db/src/schema/matchPlayers.ts` -- playerId (nullable FK) confirmed
- `docs/PRD_v3.md` S7 -- 3-layer privacy model specification
- `.planning/research/RIOT_PRIVACY_RESEARCH.md` -- Riot policy analysis
- `.planning/phases/02-privacy-gates/02-CONTEXT.md` -- All 16 locked decisions

### Secondary (MEDIUM confidence)
- `.planning/phases/01-schema-sync-auth-hardening/01-CONTEXT.md` -- Phase 1 auth hardening completed (session, CORS, OAuth state)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new dependencies, all existing libraries
- Architecture: HIGH -- pattern is straightforward helper extraction + route modification, fully evidenced by code review
- Pitfalls: HIGH -- all bugs confirmed by reading actual source code with line numbers
- D-04 (RSO per-player filtering): MEDIUM -- new requirement from research, implementation pattern is clear but adds complexity

**Research date:** 2026-03-26
**Valid until:** Indefinite (code-only changes, no external dependency versioning concerns)
