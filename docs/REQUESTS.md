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

## Request: Add matches to global search results
**Needed for:** Issue #57
**Endpoint:** GET /api/search?q=...
**Why:** GlobalSearch currently returns teams, players, and events but NOT matches. Frontend `GlobalSearch.tsx` already renders teams/players/events sections — adding a `matches` array to the response would let us show match results in search.
**Current file:** `artifacts/api-server/src/routes/search.ts`
**What to add:** Query the `matches` table for rows where `sideAName` or `sideBName` ILIKE `%q%`, or `matchTitle` ILIKE `%q%`. Return top 5 results.
**Response shape addition:**
```json
{
  "matches": [
    { "id": 35, "sideAName": "Team Alpha", "sideBName": "Team Beta", "matchTitle": "Scrim #1", "score": "1-0", "winnerName": "Team Alpha", "createdAt": "..." }
  ]
}
```
