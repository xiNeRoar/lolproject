# VCLoL — Remaining Work

All backend tasks (C1–C24 + M1–M5 + S1/S2/S3/S7) are DONE.

---

## Backend done (Claude Code)

| Task | Endpoint | Status |
|------|----------|--------|
| C1–C24 | All CLAUDE.md backend tasks | DONE |
| M1 | `vod_entries.matchId` FK | DONE |
| M2 | `GET /matches/:id` returns `vods[]` | DONE |
| M4 | `matches.gameId` + `resultSource` fields | DONE |
| M5 | `players.registrationStatus` field | DONE |
| S1 | `GET /api/players/:id/events` | DONE |
| S2 | `GET /api/players/:id/champions` | DONE |
| S3 | `GET /api/ladder` returns `topChampion` per player | DONE |
| S7 | `GET /api/players/:idA/h2h/:idB` | DONE |
| C3 | `GET /api/players/by-id/:id` — fetch player by numeric ID | DONE |

Generated hooks available: `useGetPlayerEvents`, `useGetPlayerChampions`, `useGetPlayerH2H`, `useGetPlayerById`

---

## Frontend done (Replit)

| Item | Description | Status |
|------|-------------|--------|
| 1 | Register.tsx Discord OAuth flow (Step 1 Discord → Step 2 Riot ID) | DONE |
| 2 | PlayerDashboard — RoflUploadButton with patch expiry indicator | DONE |
| 3 | ManageVods — Render Queue panel (pending/processing/failed, retry) | DONE |
| 4 | ManageLadderSettings — 6 new fields, force-cast removed | DONE |
| 5 | PlayerDashboard — Decline button 403-aware with quota message | DONE |
| 6 | PlayerLogin — "Dev Login →" link for testing | DONE |
| 7 | MatchDetail — VODs section with embed using `vods[]` from match | DONE |
| 8 | VodDetail — link back to match via `matchId` | DONE |
| 9 | Ladder — `topChampion` badge per player row | DONE |
| 10 | Ladder — playoff zone visual divider at `ladderSettings.playoffSize` | DONE |
| 11 | Ladder — season countdown (days remaining from `season.endDate`) | DONE |
| 12 | Ladder — Challenge button per row opening ChallengeModal | DONE |
| 13 | Player Profile — Events section via `useGetPlayerEvents` | DONE |
| 14 | Player Profile — Champion Pool section via `useGetPlayerChampions` | DONE |
| 15 | Player Profile — opponent names as clickable profile links | DONE |
| 16 | ChallengeModal — H2H record via `useGetPlayerH2H` | DONE |
| 17 | MatchDetail — Quarter/Semi/Grand Final labels from `round`/`isPlayoff` | DONE |
| 18 | VOD Archive — player filter dropdown via `?playerId=X` | DONE |
| 19 | PlayerDashboard skeleton fix | DONE |
| 20 | Nav auth state — Register/Login hidden when logged in | DONE |
| 21 | Nav Logout button — available on every page | DONE |
| 22 | Home hero CTAs — auth-aware | DONE |
| 23 | PlayerLogin — auto-redirect if already logged in | DONE |
| 24 | DevLogin — lists real players from DB | DONE |

---

## Admin UI Overhaul

### Background — Why the current state exists

The current admin has 9 flat disconnected pages (one per DB table). This is wrong.

VCLoL has two independent competitive systems, each with a single container entity:

```
LADDER SYSTEM (Season is the container)
  Season → Matches (ladder, eventId=null), Challenges, ELO History,
            Player Badges, Season Champions, Ladder Settings

EVENT SYSTEM (Event is the container)
  Event → Registrations, Bracket, Matches (event, eventId=X)

SHARED
  Players (participate in both systems)
  VODs (linked to matches or events)
  Replays (linked to matches)
```

**Why Challenges are disconnected from Matches:**
The PRD design intended match results to come from a **spectator bot (LCU auto-fetch)** — not admin manual entry. When the bot detects game-end, it auto-creates the Match and links `challenge.matchId`. Since the bot is not built yet, match recording is manual. The `PUT /api/challenges/:id/complete` endpoint (B3 below) is the manual bridge until the bot exists.

### Target Admin Nav

```
Overview   → Dashboard
Players    → Player roster
Ladder     → Seasons list → Season detail (Standings | Challenges | Matches | Champions)
Events     → Events list  → Event detail  (Details | Registrations | Bracket | Matches)
Content    → VOD Archive
Settings   → Ladder Settings + Admin Schedule Settings
```

### Completed

| ID | Task | Status |
|----|------|--------|
| A1 | Delete ManageInterests page + nav link | DONE |
| A2 | Reorganise nav into sections (Overview / Community / Events & Matches / Content / Settings) | DONE |
| A3 | Event detail page `/admin/events/:id` — 4 tabs: Details \| Registrations \| Bracket \| Matches | DONE |
| A4 | ManageMatches — event filter dropdown + Round column | DONE |

### Completed (A6–A8 done, A9 pending backend)

| ID | Task | Status |
|----|------|--------|
| A6 | Season detail page `/admin/seasons/:id` — 4 tabs (initial build) | DONE |
| A7 | Nav restructure: Overview / Players / Ladder / Events / Content / Settings | DONE |
| A8 | Match form player auto-fill (sideAName/sideBName from riotId) | DONE |

### Remaining Frontend (Replit)

| ID | Task | Details | Status |
|----|------|---------|--------|
| F1 | **Season detail — design consistency** | Align Season detail to exact same design language as Event detail: table class `bg-card border border-border/50 rounded-lg overflow-x-auto`, thead `text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50`, rows `border-b border-border/20 hover:bg-muted/20` | TODO |
| F2 | **Season > Standings — correct data source** | Replace `useGetLadder()` (has minMatchesForDisplay=4 threshold) with `useListPlayers()` + cross-reference `useListMatches({ seasonId })` to find participants. Show all players who have any match in this season, sorted by currentElo desc. Admin view should not have the public threshold. | TODO |
| F3 | **Season > Challenges — per-status admin actions** | Per status: `pending` → Force Accept (disabled, needs B5) + Delete; `accepted+gameId` → Record Result (disabled, needs B3) + Mark No-Show (disabled, needs B6) + Delete; `accepted` → Mark No-Show (disabled, B6) + Delete; `expired_no_show` → Assign Loss select player (disabled, B6) + Delete; `completed` → View Match link + Delete; `declined`/`disputed` → Delete. All disabled buttons show tooltip: "Requires backend update". | TODO |
| F4 | **Event > Matches form — complete redesign** | DONE. Players at top, Winner radio, Round friendly dropdown, matchTitle auto-generated, vodUrl removed. Further refined below (F4a/F4b). | DONE |
| F4a | **Event Match form — hide Side Name inputs when player linked** | When player IS selected from dropdown: sideAName/sideBName fields completely hidden (useEffect auto-sets value silently in background; deselect clears). When "None": text input shown. This eliminates the redundant readonly display div. Both useEffects updated to also clear value on deselect. | DONE |
| F4b | **Event Match form — Bracket Slot label layout** | "Bracket Slot #" label text only; helper text moved to separate `<p>` BELOW the input. Fixes label/input misalignment. | DONE |
| F4c | **Events list — Actions column consistency** | Events Actions now: `[Manage →] [🗑️]` only. Reasoning: (1) Removed duplicate Edit icon — ManageEventDetail Details tab already provides event metadata editing, making a separate list-level edit dialog redundant. (2) "Manage →" button now uses identical styling to ManageSeasons (ghost, text-primary, ArrowRight icon). Events have no "Complete" lifecycle action (no complex backend business logic triggered, unlike Season Complete which resets ELO + crowns champion). | DONE |
| F6 | **Event Match form — Round dropdown filtered by event format** | Round options dynamically change based on `event.format`. Single/Double Elimination → QF / SF / Final / 3rd Place. Group Stage + Knockout → Group Stage + QF / SF / Final / 3rd Place. Round Robin → Group Stage only. Swiss → Round 1–8. In-house / 1v1 Ladder → Bracket Position section hidden entirely (no rounds). The `BracketTab` already consumes `match.round` — this change ensures only contextually valid round values can be entered. Pure frontend, no backend/DB change. | DONE |
| F5 | **Season > Matches — Add Match button (Ladder form)** | Inside Season > Matches tab, add "Add Match" button. Opens simplified ladder match dialog: Player A/B (all players, auto-fills side names), Winner radio button, Score (optional). matchTitle auto-generated. seasonId pre-filled from current season. No bracket fields (ladder matches don't have rounds). Note shown: "Ladder matches should ideally come from Challenges > Record Result to ensure proper challenge linking." | TODO |
| A9 | **Challenge "Record Result" — enable buttons** | Enable disabled Record Result / Force Accept / Assign Loss buttons once Claude completes B3/B5/B6 | BLOCKED on B3, B5, B6 |

### Required Backend (Claude Code)

| ID | Task | Details | Status |
|----|------|---------|--------|
| B3 | `PUT /api/challenges/:id/complete` | Body: `{ winnerPlayerId: number, score?: string }`. Actions: (1) look up both players from challenge, (2) sideAName/sideBName from riotIds, (3) derive winnerName, (4) create Match (playerAId/playerBId/seasonId from challenge, matchTitle auto), (5) ELO calculated + updated, (6) elo_history for both (reason: 'match'), (7) challenge.matchId = newMatchId, (8) challenge.status = 'completed'. Add to OpenAPI + codegen. | TODO |
| B4 | `GET /api/challenges?seasonId=X` | Server-side seasonId filter. Update OpenAPI + codegen. | TODO |
| B5 | `PUT /api/challenges/:id/force-accept` | Admin bypass — status: pending → accepted regardless of decline limits. Add to OpenAPI + codegen. | TODO |
| B6 | `PUT /api/challenges/:id/assign-loss { loserPlayerId }` | Admin no-show assignment: (1) determine winner = other player, (2) create Match (forfeit, resultSource: 'admin_manual'), (3) ELO update + elo_history for both, (4) challenge.matchId = newMatchId, (5) challenge.status = 'completed'. Add to OpenAPI + codegen. | TODO |

**Workflow:** Claude builds B3+B4+B5+B6 → OpenAPI spec → codegen → Replit enables A9 (all disabled buttons)

### Future (blocked on Claude)

| ID | Task | Status |
|----|------|--------|
| A5 | Bracket auto-generate inside Event → Bracket tab | BLOCKED on B1/B2 |
| B1 | `POST /api/events/:id/generate-bracket` — auto-generate QF/SF/Final match records from registered players | TODO |
| B2 | `GET /api/events/:id/bracket` — event matches organised by round | TODO |

---

## Phase 2 — Needs Claude Code backend first

| Item | What Claude needs to build | Then Replit builds |
|------|---------------------------|-------------------|
| P1 | `GET /api/search?q=` — global search across players/events/vods | Search bar + results page |
| P2 | `GET /api/activity` — recent activity feed (matches, registrations, VODs) | Activity feed on Home or Dashboard |
| P3 | `GET /api/ladder/rank-distribution` — ELO histogram data | Rank distribution chart on Ladder page |
| P4 | Schema: `series` table + `series_matches` join — series-level grouping | Series view in MatchDetail / Ladder |

---

## Dashboard data gaps

| Gap | Problem | Claude fix |
|-----|---------|-----------|
| D1 | `elo_history` missing registration baseline (starts at 1000) | Insert `{elo: 1000, delta: 0, reason: "registration"}` row on player creation |
| D2 | `matches` table missing `playerAChampion` / `playerBChampion` columns | Add columns, expose in `GET /matches/:id` + `GET /players/by-id/:id recentMatches[]`, accept in `PATCH /matches/:id`. Update OpenAPI + codegen. |

---

## Auth — Discord OAuth (future)

Current auth is localStorage stub (`vclol_player_id`).

**Claude needs to build:**
- `POST /auth/discord` → redirect to Discord OAuth
- `GET /auth/discord/callback` → exchange code → create/find player → `req.session.playerId`
- `GET /auth/me` → return current session player
- `POST /auth/logout` → destroy session

**Then Replit replaces:**
- `localStorage.getItem("vclol_player_id")` → `useGetAuthMe()` hook throughout
- Nav logout button → calls `POST /auth/logout`
- PlayerLogin Discord button → real `/auth/discord` link
- Register flow → tied to Discord identity
