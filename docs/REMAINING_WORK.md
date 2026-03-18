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
