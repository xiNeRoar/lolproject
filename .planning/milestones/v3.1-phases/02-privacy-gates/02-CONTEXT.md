# Phase 2: Privacy Gates - Context

**Gathered:** 2026-03-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the 3-layer privacy model from PRD §7 across all API endpoints. Every API response must respect match visibility, player opt-in status, and profile visibility settings. This is the Riot compliance layer — launch blocker.

</domain>

<decisions>
## Implementation Decisions

### Scrim Match Redaction (PRIV-01)
- **D-01:** Non-participants viewing scrim matches see: team names, score, date, game duration ONLY. No player stats, no champion picks, no KDA, no items.
- **D-02:** API returns partial data with `isRedacted: true` flag when redacting. Frontend can show "Login to see full stats" CTA. NOT a 403/404.
- **D-03:** Participant = any of the 10 players in that match (checked via session playerId → match_players lookup).
- **D-04 (NEW from research):** Captain `/visibility public` for scrims only makes team-level results public (team names, score, date, duration). Per-player stats (champion, KDA, items) require each player's individual RSO opt-in (`rsoOptIn = true`) to be publicly visible. This split is critical for Riot policy compliance.

### Tournament/Event Visibility (PRIV-02)
- **D-05:** Tournament/event matches (`matchType = 'ranked_tournament' | 'event'`) bypass all visibility gates — fully public by design (PRD §7 Layer 3). All 10 player stats visible to anyone.

### Player Search Filter (PRIV-03)
- **D-06:** GET /players and global search API filter by `rsoOptIn = true`. Non-opted players invisible in search results. No flag, no hint — they simply don't appear.

### Player Profile Visibility (PRIV-04)
- **D-07:** `profileVisibility = 'private'` → only the player themselves can see full profile. Others get minimal response: `{ id, riotId, isPrivate: true, teams }`.
- **D-08:** `profileVisibility = 'public'` → anyone can see full profile (only after RSO opt-in).
- **D-09:** `profileVisibility = 'participants-only'` → same-match participants can see full profile. "Same-match" = any player who appeared in the same match (10-player pool from match_players table). NOT same-team — same-match.

### VOD Visibility (PRIV-05)
- **D-10:** VOD visibility follows match visibility exactly. If match is private → VOD is private. If match is public → VOD is public.
- **D-11:** `visibleAfter = null` treated as PRIVATE (not 7-day delay). Fix the 7-day auto-public bug in vods.ts.
- **D-12:** POV VOD always requires individual player RSO opt-in consent regardless of match visibility (PRD §10).

### Visibility Logic Consolidation (PRIV-06)
- **D-13:** Extract shared visibility helpers into `artifacts/api-server/src/lib/privacyGate.ts`. Functions: `isMatchVisibleTo(match, playerId)`, `isPlayerProfileVisibleTo(player, viewerId)`, `redactMatchForNonParticipant(match)`.
- **D-14:** All routes that check visibility MUST use shared helpers — no inline visibility logic.

### UX Friction (Cross-cutting)
- **D-15:** Privacy gates must feel natural, not blocking. "Login to see details" is a reward unlock CTA, not a wall. API returns enough data to be useful (team names, score) even when redacted.
- **D-16:** Bot Discord embeds in-channel are unaffected by privacy gates (all 10 players just played together — server-members-only context per PRD §7 Layer 1).

### Claude's Discretion
- Implementation of `privacyGate.ts` helper functions (internal API)
- Query optimization for participant lookup
- Error message wording for 401/403 responses
- How to handle edge cases (deleted players, null teamIds)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Privacy Model
- `docs/PRD_v3.md` §7 — 3-layer privacy model (Layer 1 scrim, Layer 2 RSO opt-in, Layer 3 tournament)
- `docs/PRD_v3.md` §10 — VOD visibility rules, POV consent
- `.planning/research/RIOT_PRIVACY_RESEARCH.md` — Riot policy analysis, platform comparisons, compliance recommendations

### API Routes to Modify
- `artifacts/api-server/src/routes/matches.ts` — Match detail endpoint, match list
- `artifacts/api-server/src/routes/players.ts` — Player list, player profile
- `artifacts/api-server/src/routes/vods.ts` — VOD list, VOD visibility (7-day bug here)
- `artifacts/api-server/src/routes/auth.ts` — Session/participant checking

### Schema
- `docs/SCHEMA_CONTRACT.md` — match_players table (participant lookup), players.rsoOptIn, players.profileVisibility
- `lib/db/src/schema/` — Drizzle schema files

### Phase 1 Context (Carried Forward)
- `.planning/phases/01-schema-sync-auth-hardening/01-CONTEXT.md` — Auth hardening decisions (CORS, session, OAuth state)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `artifacts/api-server/src/middlewares/requireAdmin.ts` — Middleware pattern to follow for privacy gates
- `artifacts/api-server/src/routes/auth.ts` — Session checking pattern (`req.session.playerId`)
- Match visibility already partially implemented via `visibleAfter` timestamp comparison

### Established Patterns
- Routes check session inline (no player auth middleware yet)
- Drizzle ORM for all queries
- Express session via `req.session.playerId` / `req.session.adminId`

### Integration Points
- `artifacts/api-server/src/routes/matches.ts` — Main redaction point for PRIV-01, PRIV-02
- `artifacts/api-server/src/routes/players.ts` — rsoOptIn filter (PRIV-03) + profile visibility (PRIV-04)
- `artifacts/api-server/src/routes/vods.ts` — VOD visibility fix (PRIV-05)
- New file: `artifacts/api-server/src/lib/privacyGate.ts` — Shared helpers (PRIV-06)

</code_context>

<specifics>
## Specific Ideas

- User explicitly prioritizes LOW FRICTION UX — privacy gates should feel like reward unlocks ("Login to see full stats"), not walls
- Riot policy research revealed: captain `/visibility public` should NOT expose per-player stats without individual RSO opt-in — this is a new requirement from research, not in original PRD
- Conservative approach chosen for RSO application approval: default private, explicit opt-in, team-level results separate from player-level data

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-privacy-gates*
*Context gathered: 2026-03-26*
