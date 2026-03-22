# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Wire up notifyPlayer() in Discord Bot /submit
**Needed for:** Issue #130
**Endpoint:** N/A (internal function call, not a new endpoint)
**Why:** Discord Bot `/submit` writes notification rows directly via `tx.insert(notificationsTable)` at `submit.ts:334`, bypassing `notifyPlayer()`. Email (Resend) and Discord DM delivery never fires. Player notification preference (`web`/`email`/`discord`/`both`) is ignored.
**Response shape:** N/A
**What to do:** After the transaction commits, call `notifyPlayer(playerId, "match_result", title, message, matchId)` for each known player instead of raw DB insert.

---

## Request: Call notifyPlayer() on event registration confirm/decline
**Needed for:** Issue #130
**Endpoint:** `PUT /api/registrations/:id/confirm` and `PUT /api/registrations/:id/withdraw`
**Why:** When admin confirms or declines a team's event registration, no notification is sent to the captain or team members. PRD §11 lists `notifications` as preserved.
**Response shape:** N/A
**What to do:** After confirming → `notifyPlayer(captainPlayerId, "event_registration_confirmed", ...)`. After declining → `notifyPlayer(captainPlayerId, "event_registration_declined", ...)`.

---

## Request: Call notifyPlayer() on season completion
**Needed for:** Issue #130
**Endpoint:** `POST /api/seasons/:id/complete`
**Why:** When a season completes, no notification is sent to any player. The winning team members should be notified.
**Response shape:** N/A
**What to do:** After completing season, call `notifyPlayer(playerId, "season_completed", ...)` for all active members of the winning team.

---

## Request: Call notifyPlayer() after badge award
**Needed for:** Issue #130
**Endpoint:** N/A (internal function in `badges.ts`)
**Why:** `awardBadge()` in `badges.ts` inserts a badge row but never notifies the player. Players have no way to know they earned a badge unless they visit their profile.
**Response shape:** N/A
**What to do:** After `awardBadge()` succeeds (and badge is new, not duplicate), call `notifyPlayer(playerId, "badge_earned", "New Badge Earned!", "You earned the {badgeName} badge.")`.

---

## Request: Implement climber badge trigger logic
**Needed for:** Issue #131
**Endpoint:** N/A (internal function in `badges.ts`)
**Why:** `climber` badge has frontend label + emoji in `BADGE_META` (`lol-utils.ts:42`) but zero backend logic. Comment in `badges.ts:85` says "can be added in a future phase". Owner must define trigger condition.
**Response shape:** N/A
**What to do:** Define condition (e.g. team ELO +200 from starting, or 3+ ladder positions climbed in a season), then add check in `checkMatchBadges()` or new function.

---

## Request: Add player profile privacy toggle
**Needed for:** Issue #132
**Endpoint:** `PUT /api/players/:id/profile` (existing — add `profileVisibility` field)
**Why:** PRD v3 §7 requires "Player can set to private if desired." No column, no API support, no frontend toggle exists. Verified: 0 matches for `profileVisibility`/`isPrivate` in schema, API, and frontend.
**Response shape:** `{ profileVisibility: "public" | "private" }` in player object
**What to do:**
1. Schema: add `profile_visibility` column to `players` (default `'public'`)
2. `PUT /players/:id/profile`: accept `profileVisibility` in request body
3. `GET /players/:riotId`: when private, return redacted data (riotId + teams only, hide stats/matches/champions) unless requester is the player or admin
4. Frontend follow-up (Replit will do): privacy toggle in Dashboard settings + "This profile is private" gate in PlayerProfile

---

## Request: Auto-inactive roster members after N consecutive match absences
**Needed for:** Issue #133
**Endpoint:** N/A (logic in Discord Bot `/submit` or new scheduler)
**Why:** PRD v3 §8 states "Existing roster member absent from N consecutive .rofl submissions → automatically marked Inactive member." Zero logic exists. Verified: grep for `inactive.*member`/`absent.*consecutive` in `discord-bot/src/` — 0 matches.
**Response shape:** N/A
**What to do:**
1. Define N (suggest N=5)
2. After each `/submit`, for each team: check all active `team_members`. If a member has been absent from last N team matches, set `team_members.status = 'inactive'`
3. Optionally call `notifyPlayer()` to inform the player (depends on #130)
4. Secondary: PRD §6.2 shows interactive ✅/❌ buttons for captain to confirm adding unknown players. Current bot shows "Unlinked" text only. Consider Discord button components.
