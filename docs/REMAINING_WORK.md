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
| 19 | PlayerDashboard skeleton fix — was caused by API server running stale build without `/by-id/:id` route; fixed by restart | DONE |
| 20 | Nav auth state — Register/Login hidden when logged in, reactive to storage events | DONE |
| 21 | Nav Logout button — available on every page in header (desktop + mobile) | DONE |
| 22 | Home hero CTAs — auth-aware: logged in shows "My Dashboard" + "View Ladder" | DONE |
| 23 | PlayerLogin — auto-redirect to /dashboard if already logged in | DONE |
| 24 | DevLogin — lists real players from DB; logout returns to /dev-login | DONE |

---

## Admin UI Overhaul — Frontend (Replit)

The current admin is organised by database table (flat list of 9 disconnected pages). Industry standard organises by workflow. Needs a full restructure.

### Entity relationships (reference)
```
Season → Matches, Challenges, Ladder Settings
Event → Event Registrations, Matches (by round/bracket)
Player → Matches (as A/B), Challenges, ELO History, Badges, VODs, Registrations
Challenge → (when completed) generates a Match
Interest Submissions → DEAD, unused, remove
```

### Checklist

| ID | Task | Who | Status |
|----|------|-----|--------|
| A1 | **Delete ManageInterests** — remove page file + nav link | Replit | DONE |
| A2 | **Reorganise Admin nav** — group into sections: Players / Seasons / Events / Content / Settings instead of 9 flat links | Replit | DONE |
| A3 | **Event admin — unified Tabs page** — `/admin/events/:id` with 4 tabs: Details \| Registrations \| Bracket \| Matches. ManageEvents list now has "Manage →" button per event | Replit | DONE |
| A4 | **ManageMatches — Event filter + Round column** — dropdown to filter match list by event; Round # shown as badge in table | Replit | DONE |
| A5 | **Bracket auto-generate** — needs Claude backend first (B1/B2); then admin can click "Generate Bracket" inside Event → Bracket tab | Replit (after B1/B2) | BLOCKED |

### Backend needed for A5 (Claude Code)

| ID | Task | Status |
|----|------|--------|
| B1 | `POST /api/events/:id/generate-bracket` — takes seeded player list, generates round-based match records (QF/SF/Final), assigns `round` + `bracketSlot` + `eventId` automatically | TODO |
| B2 | `GET /api/events/:id/bracket` — returns event matches organised by round for admin bracket view; same data as public EventDetail but admin-accessible | TODO |

**Workflow for A5:** Claude builds B1+B2 → updates OpenAPI spec → runs codegen → Replit adds "Generate Bracket" button + bracket editor inside Event Tabs (A3 → Bracket tab)

---

## Phase 2 — Needs Claude Code backend first

These require new backend endpoints before Replit can build UI.

| Item | What Claude needs to build | Then Replit builds |
|------|---------------------------|-------------------|
| P1 | `GET /api/search?q=` — global search across players/events/vods | Search bar + results page |
| P2 | `GET /api/activity` — recent activity feed (matches, registrations, VODs) | Activity feed on Home or Dashboard |
| P3 | `GET /api/ladder/rank-distribution` — ELO histogram data | Rank distribution chart on Ladder page |
| P4 | Schema: `series` table + `series_matches` join — series-level grouping | Series view in MatchDetail / Ladder |

**Workflow for Phase 2:** Claude builds backend → updates OpenAPI spec → runs codegen → Replit builds UI using generated hooks.

---

## Dashboard data gaps (found during PlayerDashboard redesign)

During the redesign of PlayerDashboard, a thorough audit of all available API data was done. Two backend gaps were discovered. Both are optional enhancements that would improve the dashboard.

| Gap | Problem | Claude fix |
|-----|---------|-----------|
| D1 | `GET /api/elo-history/:id` — does NOT include the player's starting ELO at registration. History starts only after the first match. The ELO chart therefore misses the initial 1000-ELO baseline and can't show the full trajectory. | When a player is registered (or on first elo_history insert), also insert an `{elo: 1000, delta: 0, reason: "registration"}` row into `elo_history` so the chart always starts at 1000. |
| D2 | `matches` table has no champion fields — `playerAChampion` / `playerBChampion` are missing. The "Recent Results" section on Dashboard and the Player Profile page cannot show which champion was played in each match. (Champion data only exists in `vod_entries`, not in matches.) | Add `playerAChampion varchar` and `playerBChampion varchar` columns to `matches` table. Expose them in `GET /api/players/by-id/:id` → `recentMatches[]` and in `GET /api/matches/:id`. Also accept them in `PATCH /api/matches/:id` so admins can fill them in. Update OpenAPI spec + run codegen. |

---

## Auth — Discord OAuth (future)

Current auth is localStorage stub (`vclol_player_id`). All `// TODO Claude: replace localStorage auth` comments mark where real session auth must go.

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
