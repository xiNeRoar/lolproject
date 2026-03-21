# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Add `type` filter to `GET /api/vods`
**Needed for:** Issue #95
**Endpoint:** `GET /api/vods?type=spectator|pov|all`
**Why:** Frontend needs to distinguish spectator VODs (playerId IS NULL, full match footage) from POV VODs (playerId IS NOT NULL, player-specific). Currently no way to filter by VOD type.
**Spec change:** Add `type` query parameter to `GET /vods` in openapi.yaml:
```yaml
- name: type
  in: query
  schema:
    type: string
    enum: [spectator, pov, all]
  description: Filter by VOD type. spectator = playerId IS NULL (full match), pov = playerId IS NOT NULL (player-specific). Default = all.
```
**Backend logic:**
- `type=spectator` → WHERE playerId IS NULL
- `type=pov` → WHERE playerId IS NOT NULL
- `type=all` or omitted → no filter (current behavior)

---

## Request: Add `playerId` filter to `GET /api/matches`
**Needed for:** Issue #96
**Endpoint:** `GET /api/matches?playerId=39`
**Why:** Frontend needs a "View all matches" link from PlayerProfile. Currently `GET /api/matches` supports `teamId`, `eventId`, `seasonId`, `search` but NOT `playerId`. Without this, there's no way to list all matches a specific player participated in.
**Spec change:** Add `playerId` query parameter to `GET /matches` in openapi.yaml:
```yaml
- name: playerId
  in: query
  schema:
    type: integer
  description: Filter matches where the given player participated (via match_players join).
```
**Backend logic:** JOIN match_players ON match_players.matchId = matches.id WHERE match_players.playerId = :playerId

---

## Request: Add `bracketSize` or `totalRounds` to Event/Match response
**Needed for:** Issue #106
**Status:** ✅ Approved by owner — dynamic bracket labels confirmed
**Endpoint:** Extend `GET /api/matches/:id` response OR `GET /api/events/:idOrSlug` response
**Why:** Frontend needs to dynamically calculate bracket round labels (Quarter Final, Semi Final, Grand Final) based on bracket size. Currently hardcoded for 8-team brackets which is incorrect for other sizes (4-team, 16-team).
**Response shape addition:**
```yaml
bracketSize:
  type: integer
  nullable: true
  description: Number of teams in the bracket (4, 8, 16). Used to calculate round labels dynamically.
```
**Frontend will use this for:**
```tsx
function bracketRoundLabel(round, totalRounds) {
  const roundsFromFinal = totalRounds - round;
  if (roundsFromFinal === 0) return "Grand Final";
  if (roundsFromFinal === 1) return "Semi Final";
  if (roundsFromFinal === 2) return "Quarter Final";
  return `Round of ${Math.pow(2, roundsFromFinal + 1)}`;
}
```
