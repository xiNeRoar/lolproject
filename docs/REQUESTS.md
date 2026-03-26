# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Return `matchType` in match detail response
**Needed for:** Issue #199
**Endpoint:** GET /api/matches/:id
**Why:** Frontend needs `matchType` to gate scrim match stats (PRD v3.1 §7 Layer 1). Field is defined in OpenAPI spec and DB schema (`match_type` column) but not returned by the route handler.
**Response shape:** Include `matchType: "scrim" | "ranked_tournament" | "event"` in match response.

---

## Request: Return `rsoOptIn` in player response
**Needed for:** Issues #200, #202, #203
**Endpoint:** GET /api/players/:riotId, GET /api/players/by-id/:id
**Why:** Frontend needs `rsoOptIn` to gate player profile visibility (PRD v3.1 §7 Layer 2). Field is defined in OpenAPI spec and DB schema (`rso_opt_in` column) but not returned by the route handler.
**Response shape:** Include `rsoOptIn: boolean` in player response.

---

## Request: Return `rsoOptIn` per team member in team response
**Needed for:** Issue #203
**Endpoint:** GET /api/teams/:id
**Why:** CaptainHub roster needs to show RSO verification status (✅ verified / ⚠️ unverified) per member. Currently `members[]` only has `playerRiotId`, `playerDiscordUsername`, `role`, `status`.
**Response shape:** Add `rsoVerified: boolean` to each member in `members[]` array.

---

## Request: Filter player search by `rsoOptIn`
**Needed for:** Issue #202
**Endpoint:** GET /api/players?search=...
**Why:** PRD v3.1 §7 Layer 2 — only RSO opt-in players should appear in public search results. Currently returns all players.
**Change:** Add `WHERE rso_opt_in = true` filter when returning search results (or add query param `rsoOptIn=true`).

---

## Request: Change ladder sort from ELO to wins
**Needed for:** Issue #201
**Endpoint:** GET /api/ladder
**Why:** PRD v3.1 §8 — leaderboard should sort by wins descending, not ELO. Currently `orderBy(desc(teamsTable.teamElo))`.
**Change:** Change to `orderBy(desc(teamsTable.wins))`.

---

## Request: Implement RSO auth routes
**Needed for:** Issues #198, #204
**Endpoints:** GET /auth/rso/authorize, GET /auth/rso/callback, POST /auth/connect
**Why:** RSO OAuth flow is defined in OpenAPI spec but routes are not implemented in api-server. Frontend cannot build /connect page or login RSO step without these.
**Note:** This is a launch blocker per PRD v3.1 §5, §6.1, §11.
