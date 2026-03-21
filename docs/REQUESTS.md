# docs/REQUESTS.md — Backend Requests from Replit

Use this file when you need Claude to add or change a backend endpoint.
Format: one section per request.

---

## Request: Add `type` filter to `GET /api/vods`
**Needed for:** Issue #95 | **Backend issue:** #109
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
**Needed for:** Issue #96 | **Backend issue:** #110
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

## Request: Implement Email and Discord DM notification delivery
**Needed for:** Issue #72 | **Backend issue:** TBD (create as Claude task)
**File:** `artifacts/api-server/src/lib/notifications.ts`
**Why:** Frontend already shows 4 notification preference options (Web only, Email, Discord DM, Email + Discord). Backend `notifyPlayer()` already has the routing logic (lines 46-54) but the email and Discord DM implementations are TODO stubs that only console.log. Users who select Email or Discord DM receive nothing.

**DB columns already exist:**
- `players.email` (text, nullable) — for email delivery
- `players.discordId` (text, nullable) — for Discord DM delivery

**What needs implementing:**

1. **Email delivery** (pref = `"email"` or `"both"`):
   - Use Resend or nodemailer to send notification emails
   - Template: simple plain-text or minimal HTML with notification title + message
   - Only send if `player.email` is not null; log warning if null
   - Consider: does the platform need a RESEND_API_KEY or SMTP config? Add as env var.

2. **Discord DM delivery** (pref = `"discord"` or `"both"`):
   - Use Discord bot token (already exists for the Discord bot) to send DM
   - `client.users.send(player.discordId, { content: ... })` or REST API call
   - Only send if `player.discordId` is not null; log warning if null
   - Consider: the API server may not have the Discord bot client. Options:
     a. Share the bot token as env var and use Discord REST API directly
     b. Add a notification queue that the Discord bot polls
     c. Import discord.js in the API server just for DM sending

3. **Error handling:**
   - Email/DM failures should not block the web notification (already inserted first on line 37-43)
   - Log errors but don't throw

**No frontend changes needed** — the UI already works correctly.
**No schema changes needed** — columns and preference values already exist.

---

## Request: Add `bracketSize` or `totalRounds` to Event/Match response
**Needed for:** Issue #106 | **Backend issue:** #111
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

---

## Request: Add `champion` field to PlayerProfile recentMatches response
**Needed for:** Issue #80 | **Backend issue:** #113
**Endpoint:** `GET /api/players/:id` → `recentMatches[]`
**Why:** Frontend wants to show the champion played in each recent match on PlayerProfile. Currently `recentMatches` uses the `Match` schema which has no per-player champion info. The champion data exists in `match_players.championId` but isn't surfaced in the player profile response.
**Spec change:** Add a `playerChampion` field to the match objects returned in `recentMatches`:
```yaml
playerChampion:
  type: string
  nullable: true
  description: Champion name played by this player in the match (from match_players.championId lookup).
```
**Backend logic:** When building recentMatches for a player, JOIN match_players WHERE match_players.playerId = :playerId AND match_players.matchId = match.id, include championId → champion name lookup.

---

## Request: Add `vodCount` field to Match list response
**Needed for:** Issue #88 | **Backend issue:** #114
**Endpoint:** `GET /api/matches` → each match object
**Why:** Frontend wants to show a VOD badge on the Matches list page when a match has associated VODs. Currently no way to know if a match has VODs without fetching each match individually.
**Spec change:** Add `vodCount` to Match schema:
```yaml
vodCount:
  type: integer
  nullable: true
  description: Number of VODs associated with this match. 0 or null means no VODs.
```
**Backend logic:** LEFT JOIN vods ON vods.matchId = matches.id, COUNT(vods.id) as vodCount, grouped by match.

---

## Request: Add `discordUrl` field to Event schema
**Needed for:** Issue #98 | **Backend issue:** #115
**Endpoint:** `GET /api/events/:idOrSlug`
**Why:** Frontend EventDetail page has a "Join Discord" button that links to the event's Discord server. Currently Event schema has no Discord URL field.
**Spec change:** Add `discordUrl` to Event schema:
```yaml
discordUrl:
  type: string
  nullable: true
  description: Discord invite URL for the event's server/channel.
```
**Backend logic:** Add column to events table, return in GET response. Optional field, null by default.

---

## Request: Add `gameNumber` and `vodType` fields to VOD schema + BO series support
**Needed for:** Issue #108 (Matches/Watch overlap) + VOD architecture improvements | **Backend issue:** #116
**Status:** Design finalized — see full UX spec below

### Problem
The current VOD schema cannot properly represent BO3/BO5 series or distinguish between spectator and team-side POV recordings:

1. **No game number** — A BO3 match links 3 spectator VODs to the same `matchId`, but there's no way to tell which is Game 1/2/3
2. **No VOD type distinction** — `playerId = NULL` means spectator, `playerId ≠ NULL` means player POV. But there's no concept of "Team A's spectator view" vs "Team B's spectator view"
3. **No series format** — Match has no `bestOf` field to indicate BO1/BO3/BO5

### Spec changes

**Add to VodEntry / VodDetail / CreateVodRequest schemas:**
```yaml
gameNumber:
  type: integer
  nullable: true
  description: "Game number within a BO series (1, 2, 3...). NULL for BO1 or standalone VODs."

vodType:
  type: string
  enum: [spectator, team-pov, player-pov]
  nullable: true
  description: "spectator = neutral/full match view. team-pov = one team's perspective (requires teamId). player-pov = individual player POV (requires playerId). NULL treated as spectator for backwards compat."

teamId:
  type: integer
  nullable: true
  description: "For team-pov VODs, which team's perspective this recording is from."
```

**Add to Match schema:**
```yaml
bestOf:
  type: integer
  nullable: true
  description: "Series format: 1 = BO1, 3 = BO3, 5 = BO5. NULL treated as BO1."

score:
  type: string
  nullable: true
  description: "Series score e.g. '2-1', '3-2'. NULL for BO1."
```

### Backend logic
- Add columns to `vods` table: `gameNumber` (int, nullable), `vodType` (text, nullable), `teamId` (int, nullable, FK to teams)
- Add columns to `matches` table: `bestOf` (int, nullable, default 1), `score` (text, nullable)
- When creating VODs via Discord bot, populate `gameNumber` if match is BO3/BO5
- `vodType` defaults: if `playerId` is set → `player-pov`, else → `spectator`
- Backwards compat: existing VODs with NULL `vodType` treated as spectator

### Frontend UX design (what Replit will build once backend is ready)

**MatchDetail VODs section — grouped by game, then by type:**
```
VODs (6)

Game 1
  📺 Full Match (Spectator)
  👥 Team A POV  ·  👥 Team B POV

Game 2
  📺 Full Match (Spectator)

Player POVs
  🎮 PlayerName (Jinx vs Thresh · Bot) — Game 1
  🎮 PlayerName (Ahri vs Syndra · Mid) — Game 2
```

Key UX rules:
- Group by `gameNumber` first, then by `vodType`
- Player POVs collected in separate section (not every player has one — only those who requested)
- BO1 matches: no "Game 1" header, just flat list
- Each VOD row: YouTube embed or thumbnail + title + metadata
- Player POV rows link to player profile

**Watch page (`/watch`) — pure VOD archive:**
- Search + filter by type (Spectator / Player POV), team, event, champion, position
- Card grid with YouTube thumbnails
- Badge shows VOD type: "Spectator" / "Player POV" / "Team POV"
- No match data display — just link to match page via "Match →"

**Matches page (`/matches`) — match records only:**
- No VOD badges or VOD-related UI (removed per #108)
- Pure match listing: teams, score, date, event

### Files to change
- `lib/api-spec/openapi.yaml` — schema changes above
- `lib/db/src/schema/vods.ts` — add columns
- `lib/db/src/schema/matches.ts` — add `bestOf`, `score` columns
- `artifacts/api-server/src/routes/vods.ts` — handle new fields in CRUD
- `artifacts/api-server/src/routes/matches.ts` — return new fields
- Run `pnpm run generate` after spec change + `db:push`

