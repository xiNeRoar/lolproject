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
| F2 | **Season > Standings — correct data source** | Replace `useGetLadder()` (has minMatchesForDisplay=4 threshold) with `useListPlayers()` + cross-reference `useListMatches({ seasonId })` to find participants. Show all players who have any match in this season, sorted by currentElo desc. Admin view should not have the public threshold. **Note**: `GET /api/matches?seasonId=X` already exists in the backend — this is purely frontend, no Claude needed. | TODO |
| F3 | **Season > Challenges — per-status admin actions** | A6 already built the Season detail page with a Challenges tab that lists all challenges. F3 is the next step: add per-status action buttons to each row (this part is NOT blocked — Replit can build disabled buttons now). Per status: `pending` → Force Accept (disabled, needs B5) + Delete; `accepted+gameId` → Record Result (disabled, needs B3) + Mark No-Show (disabled, needs B6) + Delete; `accepted` → Mark No-Show (disabled, B6) + Delete; `expired_no_show` → Assign Loss (player select dropdown, disabled, needs B6) + Delete; `completed` → View Match link + Delete; `declined`/`disputed` → Delete only. All disabled buttons must show tooltip: "Requires backend update". **Note**: Building the UI with disabled buttons (F3) is independent. Enabling them (A9) is blocked on B3/B5/B6. | TODO |
| F4 | **Event > Matches form — complete redesign** | DONE. Players at top, Winner radio, Round friendly dropdown, matchTitle auto-generated, vodUrl removed. Further refined below (F4a/F4b). | DONE |
| F4a | **Event Match form — hide Side Name inputs when player linked** | When player IS selected from dropdown: sideAName/sideBName fields completely hidden (useEffect auto-sets value silently in background; deselect clears). When "None": text input shown. This eliminates the redundant readonly display div. Both useEffects updated to also clear value on deselect. | DONE |
| F4b | **Event Match form — Bracket Slot label layout** | "Bracket Slot #" label text only; helper text moved to separate `<p>` BELOW the input. Fixes label/input misalignment. | DONE |
| F4c | **Events list — Actions column consistency** | Events Actions now: `[Manage →] [🗑️]` only. Reasoning: (1) Removed duplicate Edit icon — ManageEventDetail Details tab already provides event metadata editing, making a separate list-level edit dialog redundant. (2) "Manage →" button now uses identical styling to ManageSeasons (ghost, text-primary, ArrowRight icon). Events have no "Complete" lifecycle action (no complex backend business logic triggered, unlike Season Complete which resets ELO + crowns champion). | DONE |
| F6 | **Event Match form — Round dropdown filtered by event format** | Round options dynamically change based on `event.format`. Single/Double Elimination → QF / SF / Final / 3rd Place. Group Stage + Knockout → Group Stage + QF / SF / Final / 3rd Place. Round Robin → Group Stage only. Swiss → Round 1–8. In-house / 1v1 Ladder → Bracket Position section hidden entirely (no rounds). The `BracketTab` already consumes `match.round` — this change ensures only contextually valid round values can be entered. Pure frontend, no backend/DB change. | DONE |
| F7 | **Event Match form — Round slot capacity validation** | Prevent admin from selecting a round that is already full. `matchCountByRound` computed from existing `eventMatches`. Final (round=3) and 3rd Place (round=4) → disabled when count ≥ 1, shown as "(full)". Semi Finals (round=2) → disabled when count ≥ 2. Quarter Finals (round=1) → count hint only, not disabled (bracket size varies). Group Stage / Swiss rounds → no limit. Edit mode excludes self from count. **Also fixed: `GET /api/matches` list endpoint was not including `round`, `bracketSlot`, `isLosersBracket` in its SELECT query — these fields were missing from all match list responses. Fixed in `artifacts/api-server/src/routes/matches.ts`.** | DONE |
| F9 | **Event Details form — Format change warning** | If `eventMatches.length > 0` and admin changes `format` field to a different value, show inline warning below the format select: "⚠ X matches entered. Changing format affects round validation and bracket display." Soft warning only, does not block save. Pure frontend using `watch("format")` from react-hook-form. | DONE |
| F10 | **Registrations tab — Participant count hint** | For Single/Double Elimination events, show a hint bar above the registrations table: confirmed count + whether it's a power-of-2 (ideal). Shows "✓ Perfect bracket size" for 4/8/16, "⚠ Consider waiting for N or managing with byes" otherwise. Pure frontend, no backend. | DONE |
| F11 | **PlayerDashboard — Notifications feed** | Add Notifications card to PlayerDashboard. Fetches `GET /api/notifications` via `useQuery` with raw fetch. Shows notification items with type-specific icons/colors, unread badge, mark-as-read on click via `PUT /api/notifications/:id/read`. Unread count badge shown on card title. After B7 lands, event registration notification types will auto-display correctly. | DONE |
| F5 | **Season > Matches — Add Match button (Ladder form)** | Add Match button opens simplified ladder match dialog: Player A/B (all players, auto-fills side names), Winner radio button, Score (optional). matchTitle auto-generated. seasonId pre-filled. Edit match also supported (Edit Ladder Match dialog with pre-populated data, Save Changes button). | DONE |
| F12a | **Events > Matches — redesign table to Season-style** | Remove TITLE/FORMAT and MATCHUP columns (redundant). New layout: ROUND \| PLAYERS \| RESULT \| SCORE \| DATE \| ACTIONS. ROUND shows compact badge (GS/QF/SF/Final/3rd). PLAYERS: bold sideAName + "vs sideBName" below. RESULT: "[winner] wins" in green-400 or "TBD" muted. DATE: added (was missing). ACTIONS: Edit + VOD + Delete icon buttons. | DONE |
| F12b | **Season > Matches — icon buttons + edit capability** | Replace "View"/"Delete" text buttons with icon buttons. ACTIONS now: Edit (pencil) + VOD (film, links to /admin/vods?matchId=X) + View Public (ExternalLink, opens in new tab) + Delete (trash, red). Edit dialog pre-populated with match data, titled "Edit Ladder Match". | DONE |
| F13 | **Both Matches tabs — VOD management link per row** | Film icon button on every match row in both Events > Matches and Season > Matches. Navigates to /admin/vods?matchId=X. Part of F12a/F12b implementation. | DONE |
| F14 | **ManageVods form — matchId match dropdown** | Add matched match selector to VOD create/edit form so admin can link VODs to specific matches. | BLOCKED on B8 (backend must accept matchId in CreateVodRequest first) |
| F15 | **ManageVods — ?matchId=X URL filter** | When navigated to /admin/vods?matchId=X (from the Film icon in Matches tabs): show blue filter banner "Showing VODs for Match #X" with Clear filter button, hide Render Queue section, filter VOD table to only show VODs with matching matchId. | DONE |
| F16 | **Season > Matches dialog — format reads from `ladderSettings.defaultMatchFormat`** | Match format inheritance chain: ladderSettings.defaultMatchFormat → season.defaultMatchFormat (override) → per-match format dropdown. Season Details tab shows "Inherit from Ladder Settings (BO1)" as default option. Backend validates format enum (BO1/BO3/BO5) on create/update for matches, seasons, and ladder settings. Server-side format inheritance fallback in POST /api/matches when format is omitted. | DONE |
| F17 | **Ladder Settings — Playoff Format dropdown** | Replace free-text `<Field type="text">` for `playoffFormat` with a `<select>` dropdown. Valid values: `single_elimination` / `double_elimination`. Data integrity fix — prevents invalid strings entering DB. | DONE |
| F18 | **ManageVods — ELO auto-fill + title auto-generate** | (1) When admin changes the Linked Player dropdown, `playerEloAtTime` auto-fills with that player's `currentElo`. Does NOT overwrite on form open (preserves existing VOD data in edit mode). (2) Auto-generate button (wand icon) next to Title field: builds title from `playerNames` + `champion` following PRD format "{Player} ({Champion}) vs {Opponent} — VCLoL". If champion not filled: "{Player A} vs {Player B} — VCLoL". | DONE |
| A9 | **Challenge "Record Result" — enable buttons** | Enable disabled Record Result / Force Accept / Assign Loss buttons once Claude completes B3/B5/B6 | BLOCKED on B3, B5, B6 |

### Required Backend (Claude Code)

| ID | Task | Details | Status |
|----|------|---------|--------|
| B3 | `PUT /api/challenges/:id/complete` | Body: `{ winnerPlayerId: number, score?: string }`. Actions: (1) look up both players from challenge, (2) sideAName/sideBName from riotIds, (3) derive winnerName, (4) create Match (playerAId/playerBId/seasonId from challenge, matchTitle auto), (5) ELO calculated + updated, (6) elo_history for both (reason: 'match'), (7) challenge.matchId = newMatchId, (8) challenge.status = 'completed'. Add to OpenAPI + codegen. | TODO |
| B4 | `GET /api/challenges?seasonId=X` | Server-side seasonId filter. Update OpenAPI + codegen. | TODO |
| B5 | `PUT /api/challenges/:id/force-accept` | Admin bypass — status: pending → accepted regardless of decline limits. Add to OpenAPI + codegen. | TODO |
| B6 | `PUT /api/challenges/:id/assign-loss { loserPlayerId }` | Admin no-show assignment: (1) determine winner = other player, (2) create Match (forfeit, resultSource: 'admin_manual'), (3) ELO update + elo_history for both, (4) challenge.matchId = newMatchId, (5) challenge.status = 'completed'. Add to OpenAPI + codegen. | TODO |
| B7 | **Event registration notifications** | In `artifacts/api-server/src/lib/notifications.ts`, add two new `NotificationType` values: `event_registration_confirmed` and `event_registration_declined`. In `artifacts/api-server/src/routes/registrations.ts` (or equivalent): after `PUT /api/registrations/:id/confirm` succeeds, call `notifyPlayer(registration.playerId, "event_registration_confirmed", "Registration Confirmed", "Your registration for [event title] has been confirmed!")`. After withdraw/decline, call `notifyPlayer(..., "event_registration_declined", ...)`. No OpenAPI change needed (notifications are internal). Frontend (F11) already polls `/api/notifications` — the new types will auto-display correctly once B7 lands. | TODO |
| B8 | **Add `matchId` to VOD create/update endpoints** | In `lib/api-spec/openapi.yaml`: add `matchId` (integer, nullable) to the `CreateVodRequest` schema. In `artifacts/api-server/src/routes/vods.ts`: in the `POST /` handler (router.post, line ~175), read `req.body.matchId` and pass it to the insert — `matchId: body.matchId ?? null`. Same for `PUT /:id` handler (line ~235). The DB column `vod_entries.matchId` already exists (M1 is DONE). This is a one-line fix per route — just the body parsing is missing. After adding to OpenAPI, run `pnpm run codegen` so the frontend `CreateVodRequest` type gains the `matchId?: number \| null` field. This unblocks F14 (ManageVods form matchId dropdown). | TODO |
| B9 | **Match result notifications on manual match creation** | In `artifacts/api-server/src/routes/matches.ts`, in the `POST /` handler: after the match is successfully inserted and ELO is updated, check if `playerAId` and `playerBId` are both non-null. If so, call `notifyPlayer(playerAId, "match_result", "Match Result Recorded", "Your match vs [sideBName] has been recorded. Result: [winnerName] wins.")` and `notifyPlayer(playerBId, "match_result", "Match Result Recorded", "Your match vs [sideAName] has been recorded. Result: [winnerName] wins.")`. Import `notifyPlayer` from `../lib/notifications`. The `match_result` type already exists in `NotificationType` — no schema change needed. This ensures players are notified when admin manually records ladder matches. | TODO |
| B10 | **Add `defaultMatchFormat` to `ladderSettings`** | Schema + API + OpenAPI + codegen. Server-side enum validation (BO1/BO3/BO5). Frontend dropdown in Ladder Settings. | DONE |
| B11 | **Add `defaultMatchFormat` to `seasons`** | Schema + API + OpenAPI + codegen. Nullable (null = inherit from ladder). Server-side enum validation. Frontend dropdown in Season Details with "Inherit from Ladder Settings" option. Server-side inheritance fallback in POST /api/matches. | DONE |
| B12 | **Server-side score validation in match routes** | Admin entering invalid scores (e.g. "99999-0") corrupts verified match data — PRD principle: "every official match has a verified result." Fix: In `artifacts/api-server/src/routes/matches.ts`, add a `validateScore(format: string, score: string): boolean` helper. Rules: BO1 → score must be "1-0"; BO3 → "2-0" or "2-1"; BO5 → "3-0", "3-1", or "3-2". In both the POST `/` and PUT `/:id` handlers: if `req.body.score` is provided AND `req.body.format` is provided, call `validateScore()` and return 400 with message `"Invalid score for format. BO1: 1-0 only. BO3: 2-0 or 2-1. BO5: 3-0, 3-1, or 3-2."` if invalid. No schema/OpenAPI change needed. Frontend score dropdowns already enforce valid values — this is belt-and-suspenders server-side enforcement. | TODO |

**Workflow:** Claude builds B3+B4+B5+B6 → OpenAPI spec → codegen → Replit enables A9 (all disabled buttons)

### Future (blocked on Claude)

| ID | Task | Status |
|----|------|--------|
| A5 | **Bracket auto-generate button — Event → Bracket tab** | After B1 is done: add a "Generate Bracket" button in the Bracket tab (ManageEventDetail.tsx). Button calls `POST /api/events/:id/generate-bracket`. On success: invalidate matches query so BracketTab re-renders with newly created match records. Show error toast if bracket already exists (prompt to use `?force=true` override). Button should be hidden/disabled once bracket exists (matches with this eventId already present). The existing `BracketTab` component already visualises matches by format — no changes needed to the visualiser itself. | BLOCKED on B1 |
| B1 | `POST /api/events/:id/generate-bracket` — auto-generate match records from **confirmed** registrations (status='confirmed'). This is the critical link between the Registrations system and the Bracket/Matches system. Seeding order: seed by currentElo descending. For Single Elimination (8 players): create QF matches (1v8, 2v7, 3v6, 4v5), SF placeholders, Final placeholder. For Double Elimination: same QF + losers bracket scaffolding. Sets match.eventId, match.round, match.bracketSlot. Should reject if bracket already exists (matches with this eventId already present) unless `?force=true`. **Design note**: Registrations and Matches are intentionally decoupled — registrations track sign-ups, matches track results. This endpoint is the one-time bridge that converts confirmed registrations into match records. After generation, admin manages the bracket via the Matches tab; withdrawing a registration post-generation does NOT affect existing match records (forfeit logic is out of scope). | TODO |
| B2 | `GET /api/events/:id/bracket` — **may be optional**: existing `GET /api/matches?eventId=X` already covers the use case (BracketTab filters allMatches by eventId). Only needed if Claude wants a dedicated endpoint that returns matches pre-grouped by round for efficiency. If built, return `{ rounds: { [roundLabel: string]: Match[] } }`. No OpenAPI change strictly required if skipped — Replit's BracketTab already works without it. | TODO (low priority) |

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
| D2 | `matches` table missing `playerAChampion` / `playerBChampion` columns | Add columns to `matchesTable` schema + `db:push`. Expose in `GET /api/matches/:id` response + `GET /api/players/by-id/:id recentMatches[]`. Accept in `PUT /api/matches/:id` (existing update endpoint). Update OpenAPI + codegen. |

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
