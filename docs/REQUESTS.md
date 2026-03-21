# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

<!-- Example:
## Request: Add X endpoint
**Needed for:** Issue #N
**Endpoint:** GET /api/something
**Why:** Frontend needs this data for page Y
**Response shape:** { field: type }
-->

---

## Request: Fix #114 — vodCount missing from GET /matches list response

**Needed for:** Issue #114
**Status:** Claude closed #114 but never implemented vodCount in match list endpoint
**Endpoint:** GET /api/matches
**Why:** Frontend Matches page needs vodCount to show VOD indicator badge per match row (Issue #88 depends on real data)
**What's missing:** `formatMatch()` in `artifacts/api-server/src/routes/matches.ts` does not include `vodCount`. The GET `/` handler needs to count vod_entries per matchId and include `vodCount: number` in each match response object.
**Expected response shape (per match):** `{ ...existingFields, vodCount: number }`

---

## Request: Fix #115 — discordUrl not accepted in Event POST/PUT

**Needed for:** Issue #115
**Status:** Claude closed #115 — schema + GET response have `discordUrl`, but POST/PUT admin endpoints do NOT accept it as input
**Endpoint:** POST /api/events, PUT /api/events/:id/edit
**Why:** Admin cannot set or update a Discord invite URL for events. Frontend EventDetail (#98) shows the discordUrl from GET but admin has no way to populate it.
**What's missing:** Both `POST /events` and `PUT /events/:id/edit` in `artifacts/api-server/src/routes/events.ts` need to destructure `discordUrl` from `req.body` and include it in the insert/update values.

---

## Request: Fix #109 — VOD type filter should use vodType field, not playerId heuristic

**Needed for:** Issue #109
**Status:** Claude closed #109 — type filter works but uses `playerId == null` as proxy for "spectator" instead of the actual `vodType` column added in #116
**Endpoint:** GET /api/vods?type=spectator|pov
**Why:** Current logic: `type=spectator` → filter `playerId == null`, `type=pov` → filter `playerId != null`. This is a heuristic that breaks if a spectator VOD has a playerId (e.g. "uploaded by player X") or if a POV has no playerId linked yet.
**Correct logic:** Filter on `vodType` column: `type=spectator` → `vodType = 'spectator'`, `type=pov` → `vodType IN ('team-pov','player-pov')`. Fall back to current heuristic only when `vodType IS NULL`.
