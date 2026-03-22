# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Wire up notifyPlayer() across all trigger points
**Needed for:** Issue #130
**Files to change:**
- `artifacts/discord-bot/src/commands/submit.ts` — replace `tx.insert(notificationsTable)` with post-tx call to `notifyPlayer()` so email/DM delivery respects player preference
- `artifacts/api-server/src/routes/registrations.ts` — after confirm → `notifyPlayer(playerId, "event_registration_confirmed", ...)`, after decline → `notifyPlayer(playerId, "event_registration_declined", ...)`
- `artifacts/api-server/src/routes/seasons.ts` — after completing season → `notifyPlayer()` for all players in winning team with type `"season_completed"`
- `artifacts/api-server/src/lib/badges.ts` — after `awardBadge()` → `notifyPlayer(playerId, "badge_earned", ...)`
**Why:** `notifyPlayer()` is fully implemented (Web + Email via Resend + Discord DM) but has 0 call sites. All 6 notification types defined in the type union are dead code.

---

## Request: Implement climber badge trigger logic
**Needed for:** Issue #131
**Files to change:** `artifacts/api-server/src/lib/badges.ts`
**Why:** `climber` badge has frontend label/emoji in `BADGE_META` but zero backend logic. Owner needs to define trigger condition first (e.g., team ELO +200 from start, or 3+ ladder position climb in a season). Then implement in `checkMatchBadges()` or a new checker function.

---

## Request: Add player profile privacy toggle
**Needed for:** Issue #132
**Schema change:** Add `profile_visibility` column to `players` table (default `'public'`, options: `'public'` | `'private'`)
**Endpoint changes:**
- `PUT /players/:id/profile` — accept `profileVisibility` field in request body
- `GET /players/:riotId` — when profile is private, return redacted response (riotId + team affiliations only, hide stats/champion pool/match history) unless requester is the player themselves or an admin
**Why:** PRD v3 §7 requires players can set profile to private. Currently no column exists in schema, no API support, no frontend toggle.
**Frontend follow-up:** After backend is ready, I will add privacy toggle in PlayerDashboard settings and a "This profile is private" gate in PlayerProfile.

---

## Request: Auto-inactive roster members after N consecutive match absences
**Needed for:** Issue #133
**Files to change:** `artifacts/discord-bot/src/commands/submit.ts` (or a new scheduler)
**Logic:** After each `/submit`, for each team in the match: check all active `team_members`. If a member has been absent from the last N team matches (suggest N=5), set `team_members.status = 'inactive'`. Optionally notify the player via `notifyPlayer()`.
**Also:** PRD §6.2 shows interactive ✅/❌ buttons for captain to confirm adding unknown players. Current bot only shows "Unlinked" text. Consider adding Discord button components for captain confirmation.
**Why:** PRD v3 §8: "Roster state is derived from actual match participation." Currently only team-level inactivity exists (30-day scheduler), not individual member inactivity.
