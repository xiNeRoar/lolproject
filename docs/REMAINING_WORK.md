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

### Remaining Frontend (Replit)

| ID | Task | Details | Status |
|----|------|---------|--------|
| A6 | **Season detail page** `/admin/seasons/:id` — 4 tabs | **Standings**: players sorted by ELO (ladder view for this season). **Challenges**: all challenges for this season; `accepted` + gameId submitted → "Record Result" button. **Matches**: ladder matches where `seasonId=X AND eventId=null`. **Champions**: season champion record + "Crown Champion" action | TODO |
| A7 | **Nav final restructure** — rename sections + remove 4 standalone pages from nav | Remove standalone: Registrations, Matches, Challenges, Ladder Settings. Add: **Ladder** section (Seasons only), **Settings** section (Ladder Settings + Admin Schedule). Seasons list gets "Manage →" button linking to `/admin/seasons/:id` | TODO |
| A8 | **Match form — Player auto-fill** | When playerA/B selected from dropdown → `sideAName`/`sideBName` auto-populate with player's riotId (readonly when player linked; editable for unregistered guest opponents) | TODO |
| A9 | **Challenge "Record Result" flow** | Inside Season > Challenges tab: `accepted` challenges with a gameId show "Record Result" button → calls `PUT /api/challenges/:id/complete` (B3) with winner + score → match created automatically, challenge.matchId linked, status → completed | BLOCKED on B3 |

### Required Backend (Claude Code) — must be done before A9

| ID | Task | Details | Status |
|----|------|---------|--------|
| B3 | `PUT /api/challenges/:id/complete` | Body: `{ winnerPlayerId: number, score: string }`. Actions: (1) look up both players from challenge record, (2) derive sideAName/sideBName from riotIds, (3) determine winner name, (4) create Match record with playerAId/playerBId/seasonId copied from challenge, (5) ELO calculated + updated (same logic as POST /matches), (6) elo_history written for both players, (7) set `challenge.matchId = newMatchId`, (8) set `challenge.status = "completed"`. Returns the created match. Add to OpenAPI spec + run codegen. | TODO |
| B4 | `GET /api/challenges` — add `?seasonId=X` filter | Currently returns all challenges with no season filter. Add optional `seasonId` query param so Season > Challenges tab can show only relevant challenges. Update OpenAPI spec + run codegen. | TODO |

**Workflow:** Claude builds B3+B4 → updates OpenAPI spec → runs codegen → Replit builds A9 (Record Result button)

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
