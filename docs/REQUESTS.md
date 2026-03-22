# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Add teamName and teamTag to GET /registrations response

**Needed for:** Issue #125
**Endpoint:** GET /api/registrations (existing)
**Why:** EventDetail Participants section currently shows captain's `riotId` instead of team name, because `formatRegistration()` doesn't join the teams table. Registration is per-team (via `/register-team`), so the participant display should show team names.
**Current response shape:** `{ id, eventId, teamId, riotId, discordUsername, ... }` — has `teamId` but no team name/tag.
**Requested change:** When `teamId` is present, join `teams` table and include `teamName` (teams.name) and `teamTag` (teams.tag) in the response.
**Response shape (additions):**
```json
{
  "teamName": "string | null",
  "teamTag": "string | null"
}
```
**File:** `artifacts/api-server/src/routes/registrations.ts` — `formatRegistration()` function

---

## Request: Add GET /api/teams/:id/matches endpoint with pagination

**Needed for:** Issue #127
**Endpoint:** GET /api/teams/:id/matches (new)
**Why:** CaptainHub currently uses `team.recentMatches` (limited to last N) for match visibility management. Captains with 100+ matches cannot manage older matches. Need a paginated endpoint to power a dedicated match management page.
**Query params:**
- `page` (number, default 1)
- `limit` (number, default 20, max 100)
- `search` (string, optional — search opponent name)
**Response shape:**
```json
{
  "matches": [
    {
      "id": "number",
      "matchTitle": "string",
      "sideAName": "string",
      "sideBName": "string",
      "teamAId": "number | null",
      "teamBId": "number | null",
      "winnerName": "string | null",
      "visibleAfter": "string | null",
      "createdAt": "string"
    }
  ],
  "total": "number",
  "page": "number",
  "totalPages": "number"
}
```
**Auth:** Requires the requesting user to be captain of the team (same auth pattern as existing team management endpoints).
**File:** `artifacts/api-server/src/routes/teams.ts` or new route file

