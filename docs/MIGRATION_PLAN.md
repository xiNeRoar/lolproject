# VCLoL — 1v1 → 5v5 Team Migration Plan

**Branch:** `variant`
**Date:** March 2026
**Scope:** Complete codebase migration from 1v1 player ladder to 5v5 team scrim recording platform

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | Claude Code's session reference — project identity, absolute principles, data model, what not to do |
| `replit.md` | Replit's session reference — file ownership, page responsibilities, design system |
| `docs/PRD_v3.md` | Product vision — 5v5 team model, user flows, privacy rules, competitive landscape |
| `docs/SCHEMA_CONTRACT.md` | Layer 1 structural contract — actual Drizzle TypeScript code for every table |
| `docs/BOT_SPEC.md` | Discord bot specification — commands, .rofl pipeline, package structure |

---

## How to Read This Document

Every file in the codebase has been read line-by-line and categorised below. Each file has an **action** (DELETE / REWRITE / MODIFY / KEEP / NEW) and a **reason** explaining exactly what needs to change and why.

**Who does what:**
- **Claude** = Backend (schema, routes, OpenAPI, codegen, bot) — owns `CLAUDE.md`
- **Replit** = Frontend (pages, components, layout) — owns `replit.md`
- Steps are ordered by dependency — each step's prerequisites are listed

---

## Handoff Protocol

Claude and Replit work on the **same repo** (`variant` branch) but **never edit each other's files.**

**Workflow:**
1. Claude completes a phase → pushes with commit message: `[HANDOFF-REPLIT] Phase X done — description`
2. User tells Replit to `git pull` and continue from where Claude left off
3. Replit builds frontend using generated hooks → pushes: `[HANDOFF-CLAUDE] description + requests`
4. User tells Claude to `git pull` and continue

**If Replit needs a backend change:**
- Does NOT edit route/schema files
- Creates or appends to `docs/REQUESTS.md` with the request details
- Claude picks it up in next session

**If Claude needs a frontend change:**
- Does NOT edit page/component files
- Documents in commit message what the frontend needs to display

**Conflict prevention:**
- Claude: `lib/`, `artifacts/api-server/`, `artifacts/discord-bot/`, `CLAUDE.md`, `docs/SCHEMA_CONTRACT.md`, `docs/BOT_SPEC.md`
- Replit: `artifacts/vclol/src/pages/`, `artifacts/vclol/src/components/`, `artifacts/vclol/src/hooks/`, `artifacts/vclol/src/lib/`, `artifacts/vclol/src/App.tsx`, `replit.md`
- Shared (edit carefully): `docs/MIGRATION_PLAN.md` (status updates only)

---

## Phase 0: Schema Migration (Claude)

> **Prerequisite:** None. This is step 1.
> **Output:** New schema files in `lib/db/src/schema/`, run `db:push`

### DELETE these schema files

| File | Reason |
|------|--------|
| `challenges.ts` | 1v1 challenge system does not exist in 5v5 model. `challengesTable` has `challengerId → players.id`, `challengedId → players.id` — irrelevant when matches are team vs team |
| `matchmakingQueue.ts` | 1v1 matchmaking queue. Empty placeholder routes already — no business logic ever built |
| `interestSubmissions.ts` | Deprecated. `ManageInterests.tsx` already deleted. Frontend redirects `/interest` → `/register` |
| `adminScheduleSettings.ts` | 1v1 scheduling (availableDays, startTime, endTime, maxConcurrentMatches). In 5v5, scrims are self-scheduled by teams via Discord, not admin-scheduled |

### NEW schema files to create

| File | Table | Columns | FKs |
|------|-------|---------|-----|
| `teams.ts` | `teams` | id, name, tag (2-5 char), captainPlayerId, discordServerId?, teamElo (default 1000), peakElo, wins, losses, isActive, createdAt, updatedAt | captainPlayerId → players.id |
| `teamMembers.ts` | `team_members` | id, teamId, playerId, role (top/jg/mid/adc/sup/fill), status (active/inactive), joinedAt | teamId → teams.id, playerId → players.id |
| `matchPlayers.ts` | `match_players` | id, matchId, playerId, teamSide (A/B), champion, kills, deaths, assists, cs, neutralCs, gold, damageToChampions, visionScore, level, win, item0-item6, summonerSpell1, summonerSpell2, teamPosition, createdAt | matchId → matches.id, playerId → players.id |

### REWRITE `matches.ts`

**Current** (1v1 hardcoded):
```
playerAId → players.id
playerBId → players.id
sideAName, sideBName (player names)
playerAEloBefore, playerAEloAfter
playerBEloBefore, playerBEloAfter
```

**New** (team-based):
```
teamAId → teams.id
teamBId → teams.id
sideAName, sideBName (team names)
teamAEloBefore, teamAEloAfter
teamBEloBefore, teamBEloAfter
gameId (from .rofl metadata)
gameDuration (from .rofl)
gameVersion (patch, from .rofl)
resultSource (default 'rofl_parse', also 'admin_manual')
roflFilePath (nullable — path to stored .rofl)
```

Keep: eventId, seasonId, matchTitle, winnerName, score, format, isPlayoff, round, bracketSlot, isLosersBracket, groupId, nextMatchId, createdAt, updatedAt

Remove: playerAId, playerBId, playerA/BEloBefore/After, vodUrl (VODs linked via vod_entries.matchId)

### MODIFY `players.ts`

**Remove columns:** `currentElo`, `peakElo`, `wins`, `losses` — ELO is now per-team, not per-player. Player wins/losses are derived from `match_players` table.

**Add columns:** `puuid` (from .rofl, nullable until verified), `primaryRole`, `secondaryRole`

**Keep:** id, riotId, discordUsername, isActive, discordId, email, notificationPreference, registrationStatus, createdAt, updatedAt

### MODIFY `eloHistory.ts`

**Add column:** `teamId → teams.id` (nullable). Existing reason values stay. New reason: `scrim`.

### MODIFY `ladderSettings.ts`

**Remove columns (7 challenge-related):**
- `maxChallengesPerWeek`
- `maxChallengesSameOpponentPerWeek`
- `challengeExpiryHours`
- `maxDeclinesPerWeek`
- `maxDeclinesSameOpponentPerWeek`
- `noShowExpiryDays`
- `playoffMinPlayers`

**Keep:** `id`, `kFactor`, `minMatchesForDisplay`, `playoffSize`, `playoffFormat`, `defaultMatchFormat`, `updatedAt`

**Add (optional, Phase 2):** `minMatchesForTeamDisplay`

### MODIFY `seasonChampions.ts`

**Change:** `playerId → players.id` becomes `teamId → teams.id`. Add `teamName` denormalized field for historical display.

### MODIFY `eventRegistrations.ts`

**Add:** `teamId → teams.id` (nullable, for team-based event registration)

**Keep existing individual fields** (riotId, discordUsername, etc.) for backward compat with any individual events

### KEEP unchanged

| File | Reason |
|------|--------|
| `adminUsers.ts` | Admin auth is independent of game model |
| `events.ts` | Event structure (title, slug, format, dates) unchanged |
| `seasons.ts` | Season lifecycle unchanged (upcoming/active/completed) |
| `vodEntries.ts` | VOD schema already supports matchId FK — works for team matches too |
| `vodTimestamps.ts` | Independent of game model |
| `replaySubmissions.ts` | Render queue structure unchanged |
| `notifications.ts` | Notification structure (playerId, type, title, message) unchanged |
| `playerBadges.ts` | Badge structure unchanged — badge TYPES will change but schema doesn't |

### Update `index.ts` exports

Remove: challenges, matchmakingQueue, interestSubmissions, adminScheduleSettings
Add: teams, teamMembers, matchPlayers

---

## Phase 1: OpenAPI + Codegen (Claude)

> **Prerequisite:** Phase 0 schema complete
> **Output:** Updated `lib/api-spec/openapi.yaml`, run codegen to generate hooks

### DELETE endpoints

| Route file | Endpoints | Reason |
|-----------|-----------|--------|
| `challenges.ts` | All 7 endpoints (GET /, GET /player/:id, POST /, PUT /:id/accept, PUT /:id/decline, PUT /:id/game-ready, DELETE /:id) | 1v1 challenge system |
| `matchmakingQueue.ts` | POST /join, DELETE /leave | 1v1 matchmaking stub |
| `interests.ts` | GET /, POST /, DELETE /:id | Deprecated feature |
| `adminSchedule.ts` | GET /, PUT / | 1v1 scheduling |

### NEW endpoints

| Route file | Endpoints | Notes |
|-----------|-----------|-------|
| `teams.ts` | GET / (list), POST / (create), GET /:id (detail), PUT /:id (update), DELETE /:id (admin) | Team CRUD. POST / used by Discord bot for /register-team |
| `teamMembers.ts` | GET /team/:teamId (list members), POST / (add member), PUT /:id (update role/status), DELETE /:id (remove) | Bot manages via /add @players |
| `matchPlayers.ts` | GET /match/:matchId (list 10 player stats) | Read-only — data written during .rofl parse in match submission |
| `matches.ts` (new POST) | POST /submit — Accept .rofl upload, parse metadata, create match + 10 match_player rows + calculate team ELO. This is THE core endpoint. | Replaces manual admin match creation for bot flow |

### REWRITE endpoints

| Route file | What changes | Details |
|-----------|-------------|---------|
| `matches.ts` | POST / — ELO logic changes from player to team | Currently: reads playerAId/playerBId → calculates player ELO → writes to `players.currentElo` + `elo_history`. New: reads teamAId/teamBId → calculates team ELO → writes to `teams.teamElo` + `elo_history` (with teamId) |
| `matches.ts` | GET /:id — response shape changes | Currently: returns playerARiotId, playerBRiotId. New: returns teamAName, teamBName + `matchPlayers[]` (10 entries with champion/KDA/CS) |
| `matches.ts` | GET / — filter changes | Currently: filters by playerAId/playerBId. New: filters by teamAId/teamBId |
| `matches.ts` | PUT /:id — update fields change | Remove player ELO fields. Add team ELO fields |
| `players.ts` | GET /:riotId — response changes | Currently: returns currentElo, peakElo, wins, losses, recentMatches (via playerAId/playerBId). New: returns aggregate stats from match_players (champion pool, KDA, win rate). No player-level ELO. Show teams[] (from team_members) |
| `players.ts` | GET /by-id/:id — same as above | Same changes |
| `players.ts` | POST /register — remove ELO init | Currently: sets currentElo=1000, peakElo=1000, wins=0, losses=0. New: none of these fields exist |
| `players.ts` | PUT /:id/edit (admin) — remove ELO fields | Currently: allows setting currentElo, peakElo, wins, losses. Remove these |
| `players.ts` | GET /public-list — remove ELO sort | Currently: ORDER BY currentElo DESC. New: ORDER BY createdAt or riotId |
| `players.ts` | GET /:id/champions — data source changes | Currently: from vodEntries. New: from match_players (much better — actual game data not just VOD metadata) |
| `players.ts` | GET /:idA/h2h/:idB — query changes | Currently: matches where playerAId/playerBId. Delete this endpoint or rewrite for team h2h |
| `ladder.ts` | GET / — completely different query | Currently: `SELECT * FROM players WHERE isActive ORDER BY currentElo DESC`. New: `SELECT * FROM teams WHERE isActive ORDER BY teamElo DESC`. Response shape: team entries with name, tag, elo, wins, losses |
| `seasons.ts` | POST /:id/complete — ELO reset target changes | Currently: resets `players.currentElo` for all active players. New: resets `teams.teamElo` for all active teams. `seasonChampions` writes teamId instead of playerId |
| `ladderSettings.ts` | GET /, PUT / — remove challenge fields | Remove 7 fields from response/request. See schema section above |

### MODIFY endpoints

| Route file | What changes |
|-----------|-------------|
| `events.ts` | GET /:slug — match response shape changes (team names instead of player names). Minor |
| `registrations.ts` | POST / — accept optional teamId. Keep individual fields for backward compat |
| `replays.ts` | PATCH /:id — auto-create VOD logic references match.sideAName/sideAName (these stay, just now represent team names). Mostly works, minor text changes |
| `admin.ts` | GET /stats — remove interests count, add teams count |

### KEEP endpoints (no changes needed)

| Route file | Reason |
|-----------|--------|
| `vods.ts` | VOD CRUD is independent of 1v1 vs 5v5 — just reads/writes vodEntries |
| `vodTimestamps.ts` | Independent |
| `auth.ts` | Discord OAuth unchanged |
| `notifications.ts` | Player notification read/mark-read unchanged |
| `eloHistory.ts` | GET /:playerId — still works (player ELO history from match participation) |
| `seasonChampions.ts` | GET / — will need minor: show teamName instead of playerRiotId. But structure unchanged |
| `playerBadges.ts` | GET /:playerId — unchanged |
| `health.ts` | Unchanged |

---

## Phase 1.5: Lib + Middleware Updates (Claude)

> **Prerequisite:** Phase 0 + 1
> **Output:** Updated lib files

| File | Action | Details |
|------|--------|---------|
| `lib/elo.ts` | KEEP | `calculateElo()` and `softResetElo()` are pure math — works for team ELO identically. Just called with team ELO values instead of player ELO values |
| `lib/badges.ts` | REWRITE | `checkMatchBadges()` queries `players.wins + players.losses` and `matchesTable.playerAId/playerBId`. All broken in team model. Rewrite to query `match_players` and `teams`. Badge types should change: `first_blood` → `first_scrim`, add `team_streak`, etc. |
| `lib/notifications.ts` | MODIFY | Add new NotificationType values: `match_submitted`, `team_invite`, `team_removed`. Remove: `challenge_received`, `challenge_accepted`, `challenge_declined`, `challenge_auto_accepted`, `no_show_flagged` |
| `lib/vodRecommendations.ts` | KEEP | Queries vodEntries by champion/position — independent of game model |
| `lib/session.ts` | KEEP | Session types unchanged |
| `lib/auth.ts` | KEEP | Password hashing unchanged |
| `middlewares/requireAdmin.ts` | KEEP | |
| `schedulers/noShowExpiry.ts` | DELETE | 1v1 challenge no-show expiry scheduler |

---

## Phase 2: Route Index Update (Claude)

> **Prerequisite:** Phase 1 + 1.5

Update `routes/index.ts`:

**Remove:**
```typescript
import challengesRouter from "./challenges";
import matchmakingQueueRouter from "./matchmakingQueue";
import interestsRouter from "./interests";
import adminScheduleRouter from "./adminSchedule";
// and their router.use() lines
```

**Add:**
```typescript
import teamsRouter from "./teams";
import teamMembersRouter from "./teamMembers";
import matchPlayersRouter from "./matchPlayers";
router.use("/teams", teamsRouter);
router.use("/team-members", teamMembersRouter);
router.use("/match-players", matchPlayersRouter);
```

---

## Phase 3: Frontend — Layout & Navigation (Replit)

> **Prerequisite:** Phase 2 complete (codegen provides new hooks)

### `PublicLayout.tsx` — MODIFY

**Current nav:** Home | Ladder | VODs | Events | About
**New nav:** Home | Teams | VODs | Events | About

- "Ladder" label → "Teams" (links to `/teams` which shows team leaderboard)
- Auth state logic uses `localStorage.getItem("vclol_player_id")` — must change to session-based auth. Replace all `localStorage` auth with `useGetAuthMe()` hook when Discord OAuth is live. (Can stay as stub for dev)

### `AdminLayout.tsx` — MODIFY

**Current nav sections:**
```
Overview → Dashboard
Players → Players
Ladder → Seasons
Events → Events
Content → VOD Archive
Settings → Ladder Settings
```

**New nav sections:**
```
Overview → Dashboard
Players → Players
Teams → Teams (NEW page)
Ladder → Seasons
Events → Events
Content → VOD Archive
Settings → Ladder Settings
```

Remove hidden nav links still in routing: `/admin/challenges`, `/admin/registrations` (folded into event detail)

---

## Phase 4: Frontend — Public Pages (Replit)

> **Prerequisite:** Phase 3

### DELETE

| File | Reason |
|------|--------|
| `Interest.tsx` | Deprecated. Already redirects to /register |
| `ChallengeModal.tsx` | 1v1 challenge system component. Used in Ladder.tsx and PlayerProfile.tsx |

### REWRITE (major changes, rebuild from scratch using new hooks)

| File | Current | New |
|------|---------|-----|
| `Ladder.tsx` | Player leaderboard. Uses `useGetLadder()` → shows player rows with ELO/W/L. Has ChallengeModal integration. Season countdown. Playoff zone divider. | Team leaderboard. Uses new `useGetTeamLadder()` → shows team rows with team ELO/W/L. Remove ChallengeModal. Keep season countdown + playoff zone. |
| `PlayerProfile.tsx` | Shows player ELO, peak ELO, W/L, ELO chart, recent matches (as playerA/B), champion pool (from VODs), badges, H2H challenge button, season champion crown. 352 lines. | Shows player's teams (from team_members), aggregate stats from match_players (champion pool, KDA, win rate, CS/min), recent matches (from match_players JOIN matches), badges. Remove ELO chart (no player ELO). Remove challenge button. Add "Teams" section. |
| `MatchDetail.tsx` | 2-player view. Shows sideA vs sideB with ELO delta, YouTube embed, bracket label. | 10-player view. Shows Team A vs Team B with 5v5 stats table (champion, KDA, CS, damage, gold, items per player). Keep VOD embed. Keep bracket label. |
| `PlayerDashboard.tsx` | Shows player ELO, badges, ELO chart, active challenges (accept/decline buttons), notification feed, ROFL upload button. 685 lines of 1v1-specific code. | Shows player's teams, recent match results, notification feed. Remove: ELO display, challenge section, ELO chart. Add: team list, match history from match_players. ROFL upload moves to Discord bot. |
| `Register.tsx` | Registration form (Riot ID + Discord username → POST /players/register). Sets localStorage auth. | Landing page explaining how to register via Discord bot. Shows bot invite link + step-by-step guide. No form. |

### MODIFY (content/copy changes, structure mostly preserved)

| File | Changes |
|------|---------|
| `Home.tsx` | Hero copy: "1v1 ladder" → "team scrim recording". CTAs: "Challenge" → removed, "Register" → "Add Bot to Discord". Recent matches section: show team names instead of player names. Keep events/VODs sections. |
| `About.tsx` | Copy changes: "Challenge System" → "Scrim Recording", "solo queue" references → "team competition". Static text only, no data deps. |
| `DevLogin.tsx` | Remove ELO display from player list. Keep basic login-as functionality. |
| `PlayerLogin.tsx` | Keep Discord OAuth button. Remove Register link (registration is via bot). |
| `EventDetail.tsx` | Match list: show team names instead of player names. Registration section: add team selection if team-based event. Bracket components: pass team names. |

### MODIFY (minor changes found during full read)

| File | Changes |
|------|---------|
| `Vods.tsx` | **Line 139-148:** Player filter dropdown reads `ladder?.entries` (player leaderboard). After migration, ladder returns teams, not players. Change to `useListPlayers()` or remove ELO-based player filter. Also: 3× `(vod as any).matchId` type casts — fix via OpenAPI schema. |
| `VodDetail.tsx` | **Line 180-184:** 3× `(vod as any).matchId` type casts. Fix via OpenAPI schema (add matchId to VodDetail required). Also: `playerEloAtTime` display (line 171-173) — keep but note this becomes team ELO context. |
| `EventDetail.tsx` | **Line 76-85:** Participants section shows individual `r.riotId` badges. Change to team names for team events. **Line 144:** Sidebar CTA "Register as Player → /register" changes to "Add Bot to Discord". |
| `DevLogin.tsx` | **Line 91-93:** Player list shows `p.currentElo` and `p.wins/p.losses`. Remove — these fields deleted from player schema. |

### KEEP (no changes)

| File | Reason |
|------|--------|
| `Events.tsx` | Lists events with format banners — no 1v1-specific data |
| `Contact.tsx` | Static page |

### NEW

| File | Purpose |
|------|---------|
| `TeamProfile.tsx` | `/teams/:id` — Team name, tag, ELO, W/L, member roster, match history, ELO chart. The team equivalent of PlayerProfile. |
| `Teams.tsx` | `/teams` — Team directory/leaderboard. Replaces Ladder.tsx purpose. |

---

## Phase 5: Frontend — Admin Pages (Replit)

> **Prerequisite:** Phase 4

### DELETE

| File | Reason |
|------|--------|
| `ManageChallenges.tsx` | 1v1 challenge management. All endpoints deleted. |

### REWRITE

| File | Current | New |
|------|---------|-----|
| `ManageSeasonDetail.tsx` | 4 tabs: Details \| Challenges \| Matches \| Champions. Challenges tab lists 1v1 challenges with accept/decline/complete buttons. Standings tab reads player ELO. 818 lines. | 3 tabs: Details \| Matches \| Champions. Remove Challenges tab entirely. Standings/Champions tab reads team ELO. Match form uses team dropdowns instead of player dropdowns. |
| `ManageMatches.tsx` | Match form has Player A/B dropdowns, auto-fills sideAName from riotId, calculates player ELO. | Match form has Team A/B dropdowns, auto-fills sideAName from team name. Player data comes from .rofl parse (no manual per-player entry). |
| `ManageLadderSettings.tsx` | Shows 13 fields including 7 challenge-related. | Shows 6 fields: kFactor, minMatchesForDisplay, playoffSize, playoffFormat, defaultMatchFormat. Remove: maxChallengesPerWeek, maxChallengesSameOpponentPerWeek, challengeExpiryHours, maxDeclinesPerWeek, maxDeclinesSameOpponentPerWeek, noShowExpiryDays, playoffMinPlayers. Also remove Admin Schedule section (adminSchedule route deleted). |

### MODIFY

| File | Changes |
|------|---------|
| `ManagePlayers.tsx` | Remove ELO column from table. Remove ELO/wins/losses from edit form. Add role columns. |
| `ManageRegistrations.tsx` | Add team column if team-based event registration. Keep individual registration for backward compat. |
| `ManageEventDetail.tsx` | Match form: Team A/B dropdowns instead of Player A/B. Bracket components: team names. Registration tab: show team info. |
| `ManageEvents.tsx` | Minor — event format options may change (add "5v5 Scrim" format). |
| `Dashboard.tsx` | Remove "Interest Submissions" stat card. Add "Teams" stat card. |

### KEEP

| File | Reason |
|------|--------|
| `Login.tsx` | Admin auth unchanged |
| `ManageSeasons.tsx` | Season list/create/delete — unchanged |
| `ManageVods.tsx` | VOD management — independent |

### NEW

| File | Purpose |
|------|---------|
| `ManageTeams.tsx` | `/admin/teams` — List all teams, view/edit team details, manage members. |

---

## Phase 6: App.tsx Routing Update (Replit)

> **Prerequisite:** Phase 4 + 5

### Remove routes
```
/interest → (already redirects, remove entirely)
/admin/challenges → ManageChallenges (deleted)
/admin/registrations → ManageRegistrations (folded into event detail)
```

### Add routes
```
/teams → Teams.tsx (team directory/leaderboard)
/teams/:id → TeamProfile.tsx
/admin/teams → ManageTeams.tsx
```

### Modify routes
```
/ladder → can redirect to /teams, or keep as alias
```

---

## Phase 7: OpenAPI Spec Cleanup + Final Codegen (Claude)

> **Prerequisite:** All above phases
> **Output:** Clean openapi.yaml, final codegen run

- Remove all challenge-related schemas (ChallengeDetail, CreateChallengeRequest, etc.)
- Remove interest schemas
- Remove adminSchedule schemas
- Add team schemas (TeamDetail, CreateTeamRequest, TeamMember, etc.)
- Add matchPlayer schema (MatchPlayerDetail)
- Update match schemas (teamAId/teamBId, remove playerA/B)
- Update player schemas (remove currentElo/peakElo/wins/losses)
- Update ladder schema (team entries)
- Run `pnpm run codegen` → verify all generated hooks

---

## Execution Order Summary

```
CLAUDE: Phase 0 → Schema files
CLAUDE: Phase 1 → OpenAPI + codegen
CLAUDE: Phase 1.5 → Lib updates
CLAUDE: Phase 2 → Route index
                              ↓
REPLIT: Phase 3 → Layout/nav
REPLIT: Phase 4 → Public pages
REPLIT: Phase 5 → Admin pages
REPLIT: Phase 6 → App.tsx routing
                              ↓
CLAUDE: Phase 7 → Final OpenAPI cleanup + codegen
```

Phases 0–2 (Claude) must complete before Phases 3–6 (Replit) can start, because Replit needs the generated hooks from codegen.

---

## Files from Old Repo to Copy Into Variant Branch

### COPY (useful infrastructure)
- `pnpm-workspace.yaml`, `tsconfig.base.json`, `tsconfig.json`, `package.json`
- `lib/db/drizzle.config.ts`, `lib/db/package.json`, `lib/db/tsconfig.json`
- `lib/api-spec/orval.config.ts` (codegen config)
- `lib/api-client-react/` (output folder structure)
- `artifacts/vclol/src/components/ui/` (entire shadcn component library)
- `artifacts/vclol/src/components/layout/` (PublicLayout, AdminLayout shells — then modify)
- `artifacts/vclol/src/components/brackets/` (bracket visualisation components — reusable for team events)
- `artifacts/vclol/src/hooks/` (use-mobile, use-toast)
- `artifacts/vclol/src/lib/utils.ts`, `artifacts/vclol/src/lib/tournament-formats.ts`
- `artifacts/vclol/src/index.css`, `artifacts/vclol/src/main.tsx`
- `artifacts/vclol/vite.config.ts`, `artifacts/vclol/tailwind.config.*`, `artifacts/vclol/tsconfig.*`
- `artifacts/api-server/src/lib/auth.ts`, `artifacts/api-server/src/lib/session.ts`
- `artifacts/api-server/src/lib/elo.ts` (pure math, works for teams)
- `artifacts/api-server/src/middlewares/requireAdmin.ts`
- `artifacts/api-server/src/app.ts` (Express setup)
- `replit.md` (Replit config)
- `scripts/` (post-merge hook)

### DO NOT COPY
- Any page file in `pages/public/` or `pages/admin/` (all rewritten or modified)
- Any route file in `routes/` (all rewritten or modified)
- `lib/db/src/schema/*` (all new)
- `lib/api-spec/openapi.yaml` (all new)
- `lib/api-client-react/src/generated/*` (regenerated from new spec)
- `lib/api-zod/src/generated/*` (regenerated)
- `docs/PRD.md` (replace with PRD v3)
- `docs/REMAINING_WORK.md` (replaced by this document)
- `attached_assets/` (old prompts, not needed)
- `CLAUDE.md` (rewrite for new model)
- `ChallengeModal.tsx` (deleted)
- `schedulers/noShowExpiry.ts` (deleted)

---

## Appendix A: Frontend Detail Spec (Evidence from Full Code Read)

> This section documents every E2E workflow, validation rule, edge case, and auth pattern found in the current codebase, with exact line references. Each item states what currently exists and what must change for 5v5.

---

### A1. Auth System — Every localStorage Reference

The entire player auth system is a `localStorage` stub. These are ALL the locations:

| File | Pattern | What it does |
|------|---------|-------------|
| `PublicLayout.tsx:11` | `localStorage.getItem("vclol_player_id")` | Sync auth state to show/hide nav buttons (Dashboard/Login/Register/Logout) |
| `PublicLayout.tsx:24` | `localStorage.removeItem("vclol_player_id")` | Logout handler |
| `PlayerDashboard.tsx:497-509` | `localStorage.getItem("vclol_player_id")` | Root component checks auth, shows LoggedOutState or DashboardContent |
| `PlayerProfile.tsx:75-78` | `localStorage.getItem("vclol_player_id")` | Check if logged in to show Challenge button |
| `Ladder.tsx:46-49` | `localStorage.getItem("vclol_player_id")` | Check if logged in to show per-row Challenge buttons |
| `Home.tsx:32-37` | `localStorage.getItem("vclol_player_id")` | Auth-aware hero CTAs (Register vs Dashboard) |
| `DevLogin.tsx:37` | `localStorage.setItem("vclol_player_id", ...)` | Dev login sets player ID |
| `DevLogin.tsx:42` | `localStorage.removeItem("vclol_player_id")` | Dev logout |
| `Register.tsx:23` | `localStorage.setItem("vclol_player_id", ...)` | After registration, sets auth |

**Migration:** All 9 locations must switch to session-based auth (`useGetAuthMe()` hook from Discord OAuth). The pattern is consistent — every file does `const id = localStorage.getItem("vclol_player_id")` then conditionally renders. Replace with a shared `useAuth()` hook that returns `{ playerId, isLoggedIn }` from the session endpoint.

---

### A2. Admin Workflows — Complete E2E Paths

**Season Lifecycle (ManageSeasons.tsx + ManageSeasonDetail.tsx):**
1. Admin creates season (name, dates, ELO reset factor) → `POST /api/seasons`
2. Admin activates season → `POST /api/seasons/:id/activate` (deactivates all others, confirm dialog warns)
3. Matches are created within season context (seasonId pre-filled)
4. Admin completes season → `POST /api/seasons/:id/complete` (triggers: ELO soft reset for ALL active players, writes elo_history with reason `season_reset`, finds top player by currentElo → inserts season_champions, awards badges)
5. **Edge case found:** Season detail "Standings" tab (line 202-213) computes standings by finding all players who appear in any match with this seasonId, sorted by currentElo. This is a FRONTEND calculation using `useListPlayers()` + `useListMatches({seasonId})` — NOT a backend endpoint.

**5v5 change:** Step 4 changes from "all active players" to "all active teams". Standings tab changes from player ELO sort to team ELO sort. Match creation changes from Player A/B dropdowns to Team A/B dropdowns.

**Event Lifecycle (ManageEvents.tsx + ManageEventDetail.tsx):**
1. Admin creates event (title, slug, format, date, registration status) → `POST /api/events`
2. Players register via public form or admin adds → `POST /api/registrations`
3. Admin confirms/withdraws registrations from Registrations tab
4. Admin creates matches in Matches tab (Player A/B, Winner, Score, Format, Round, Bracket Slot)
5. Bracket tab auto-visualizes from match round data — no separate bracket generation endpoint
6. **Edge case found (line 306-327):** F10 participant count hint — for Single/Double Elimination, shows confirmed count and warns if not a power of 2 (4/8/16)
7. **Edge case found (line 129-139):** Round slot capacity validation — Finals limited to 1, Semi Finals to 2, auto-disables in dropdown when full
8. **Edge case found (line 276-281):** Format change warning — if admin changes event format after matches exist, shows yellow warning

**5v5 change:** Registration changes from individual (riotId/city/rank) to team-based (teamId). Match creation uses Team A/B dropdowns. Bracket slot validation stays.

**Match Creation (across ManageSeasonDetail, ManageEventDetail, ManageMatches):**

Three separate places can create matches, each with slightly different forms:
1. **ManageSeasonDetail Matches tab (line 700-776):** Simplified ladder match — Player A/B dropdowns, Winner radio, Format, Score. Auto-fills sideAName/sideBName from player riotId. seasonId pre-filled.
2. **ManageEventDetail Matches tab (line 468-618):** Full form — Player A/B with fallback to manual name, Winner, Score, Format, Round, Bracket Slot, Losers Bracket checkbox, Season link, Playoff checkbox. Hides bracket section for In-house/1v1 Ladder formats.
3. **ManageMatches (line 196-278):** Generic form — Event dropdown, all fields, no round validation.

**All three** use `CreateMatchRequest` with `playerAId/playerBId/sideAName/sideBName/winnerName`. ALL must change to `teamAId/teamBId`.

**ELO auto-fill pattern found in all three:** When admin selects a player from dropdown, `useWatch` detects change, `useEffect` auto-fills sideAName with player.riotId and shows current ELO below dropdown. This pattern becomes: select team → auto-fill sideAName with team.name, show team.teamElo.

---

### A3. Form Validation Rules (Current)

| Form | Validation | Location |
|------|-----------|----------|
| Admin Login | Zod: email (valid email), password (min 1 char) | `Login.tsx:12-15` |
| Register Player | Required: riotId, discordUsername. Format: riotId must contain # (validated server-side). Duplicate check 409. | `players.ts:103-142`, `Register.tsx:29-40` |
| Create Season | Required: name, startDate, endDate. eloResetFactor defaults to 0.50, validated as number 0-1. defaultMatchFormat enum (BO1/BO3/BO5). | `seasons.ts:64-90`, `ManageSeasons.tsx form` |
| Create Event | Required: title, slug, format, eventDate, registrationStatus, shortDescription. Format is dropdown from EVENT_FORMAT_OPTIONS. | `events.ts:31-40`, `ManageEvents.tsx form` |
| Create Match | Required: matchTitle, sideAName, sideBName, winnerName. Score validated by format (BO1: 1-0, BO3: 2-0/2-1, BO5: 3-0/3-1/3-2) via `getScoreOptions()`. Format enum validated server-side. | `matches.ts:117-143`, match dialog forms |
| Create VOD | Required: title, videoUrl. All other fields optional. | `vods.ts:167-175` |
| Create Registration | Required: eventId, riotId, discordUsername, currentRank, city, availabilityConfirmation. | `registrations.ts:57-63` |
| Ladder Settings | All fields are numbers with defaults. Frontend uses `<input type="number">`. Server validates format enums. playoffFormat enum: single_elimination/double_elimination. defaultMatchFormat enum: BO1/BO3/BO5. | `ladderSettings.ts route`, `ManageLadderSettings.tsx` |
| Challenge | Required: challengedId (int), scheduledTime (ISO string). Server checks session auth. Decline rate-limited (maxDeclinesPerWeek, maxDeclinesSameOpponentPerWeek). | `challenges.ts:88-127` |

**5v5 changes:** Register Player form deleted (replaced by landing page). Challenge validation deleted. Match creation adds team validation. New form: Create Team (name, tag 2-5 chars, captainPlayerId).

---

### A4. Data Display Patterns — What Currently Reads 1v1 Fields

| Component | 1v1 field used | What displays | 5v5 replacement |
|-----------|---------------|---------------|-----------------|
| Ladder.tsx entry rows | `entry.currentElo, entry.wins, entry.losses, entry.riotId, entry.topChampion` | Player leaderboard with ELO, W/L, champion badge | Team leaderboard: `team.teamElo, team.wins, team.losses, team.name, team.tag` |
| PlayerProfile hero card | `player.currentElo, player.peakElo, player.wins, player.losses` | Large ELO display + W/L bar | Remove ELO section. Show teams list + aggregate stats from match_players |
| PlayerProfile recent matches | `match.playerAId === player.id` to determine side, `match.playerAEloBefore/After` for delta | Per-match W/L + ELO delta | Match has teamA/teamB. Player's team determined via match_players. No player ELO delta. |
| PlayerDashboard ELO card | `player.currentElo, player.peakElo, player.wins, player.losses` | Large "1280" ELO display + rank badge | Remove entirely or show team ELO for each team |
| PlayerDashboard challenges | `challenges` filtered by `challengedId === pid` | Pending/Upcoming challenge cards with Accept/Decline | Remove entirely — no challenges |
| PlayerDashboard ROFL upload | `RoflUploadButton` per match row | Upload .rofl to server | Remove — .rofl upload moves to Discord bot |
| MatchDetail | `match.playerARiotId/playerBRiotId, playerAEloBefore/After` | 2-player view with ELO delta | 10-player view from match_players. Team names. No player ELO delta. |
| ManageSeasonDetail standings | `players sorted by currentElo` | Admin player standings | Admin team standings sorted by teamElo |
| ManageSeasonDetail challenges tab | Full challenge table with status badges | Challenge list with actions | Delete entire tab |
| ManageLadderSettings | 7 challenge fields, schedule section | Challenge config + schedule | Remove 7 fields + schedule section |
| ManagePlayers table | `player.currentElo, player.peakElo, player.wins, player.losses` columns | ELO/W-L columns | Remove these columns, add role column |
| Admin Dashboard stats | `stats.interests` card | Interest submissions count | Replace with `stats.teams` |
| Home hero CTAs | Register/Login vs Dashboard buttons | Auth-aware CTA | "Add Bot to Discord" instead of Register |
| ChallengeModal | H2H record, time slot picker, challenge creation | Full challenge flow | Delete entire component |

---

### A5. Empty State Handling (Currently Implemented)

Every list/table page has an empty state. These must be preserved in 5v5:

| Page | Empty State Text | Preserves? |
|------|-----------------|------------|
| Ladder | "No ranked players yet. Play more matches to appear here." | Change to "No ranked teams yet." |
| Events list | "No Events Found" + icon | Keep |
| VODs list | no explicit empty, just empty grid | Keep |
| ManagePlayers | "No players yet. Add one to get started." | Keep |
| ManageSeasons | "No seasons yet. Create one to start tracking ELO." | Keep |
| ManageEvents | "No events yet. Create your first event." | Keep |
| ManageChallenges | "No challenges found." | Delete page |
| ManageMatches | "No matches found." | Keep |
| ManageVods | empty table | Keep |
| Season detail standings | "No players have ladder matches in this season yet." | Change to teams |
| Season detail challenges | "No challenges this season yet." | Delete tab |
| Season detail matches | "No ladder matches this season yet." | Keep |
| Season detail champions | "Champion will be crowned when the season is completed" | Change to team champion |
| Event detail registrations | "No registrations yet." | Keep |
| Event detail bracket | "No matches for this event yet." | Keep |
| PlayerDashboard logged out | "You must be logged in to view your dashboard." | Keep |
| PlayerProfile not found | "Player not found." with back link | Keep |
| MatchDetail not found | "Match not found." with back link | Keep |

---

### A6. Notification Types (from notifications.ts + PlayerDashboard.tsx:189-200)

Current types with their UI icons:
- `challenge_received` → ⚔ blue — **DELETE**
- `challenge_accepted` → ✓ green — **DELETE**
- `challenge_declined` → ✕ red — **DELETE**
- `challenge_auto_accepted` → ⚡ blue — **DELETE**
- `match_result` → 🏆 yellow — **KEEP** (change to team context)
- `no_show_flagged` → ⚠ yellow — **DELETE**
- `season_completed` → 🏆 yellow — **KEEP**
- `badge_earned` → 🎖 yellow — **KEEP**
- `event_registration_confirmed` → ✓ green — **KEEP**
- `event_registration_declined` → ✕ red — **KEEP**

**New types needed:** `match_submitted` (when bot parses .rofl), `team_invite` (when captain adds player), `team_removed` (when player removed from team)

---

### A7. OpenAPI Schemas — What Must Change

**DELETE schemas (12):**
InterestSubmission, CreateInterestRequest, Challenge, CreateChallengeRequest, AdminScheduleSettings, MatchmakingQueueResponse, H2HRecord

**REWRITE schemas (6):**
Match (playerA/B → teamA/B), MatchDetail (add matchPlayers array), CreateMatchRequest (teamA/B), Player (remove ELO/wins/losses), PlayerProfile (remove ELO, add teams), LadderEntry (team fields), LadderSettings (remove 7 challenge fields), AdminStats (remove interests, add teams), CreatePlayerRequest (remove currentElo), LadderResponse (team entries)

**NEW schemas (5):**
Team, CreateTeamRequest, TeamMember, MatchPlayerDetail, TeamProfile

**KEEP schemas (12):**
HealthStatus, ErrorResponse, SuccessResponse, AdminLoginRequest/Response, AdminMeResponse, Event, EventDetail, CreateEventRequest, EventRegistration, CreateRegistrationRequest, VodEntry, CreateVodRequest, VodDetail, VodTimestamp, CreateVodTimestampRequest, ReplaySubmission, SubmitReplayRequest, UpdateReplayStatusRequest, Season, CreateSeasonRequest, SeasonChampion (change playerId→teamId), PlayerBadge, PlayerEventParticipation, PlayerChampionStats, EloHistoryEntry (add teamId), UpdatePlayerProfileRequest, RegisterPlayerRequest

---

### A8. Seed Script Impact (scripts/src/seed.ts)

Current seed creates: 1 admin, 1 season, 12 players with ELO, 2 events, 8 registrations, 10 matches with playerAId/playerBId + ELO tracking, 8 VODs, 4 badges, 2 challenges.

**Must rewrite entirely:** Create teams instead of individual players with ELO. Create matches with teamAId/teamBId. Create match_players entries (10 per match). Remove challenges. Remove individual ELO/wins/losses from players.

---

### A9. Files NOT Read (Intentional Exclusions)

| Category | Count | Reason |
|----------|-------|--------|
| `components/ui/*.tsx` (shadcn) | 40 files | Third-party generic UI components — Button, Card, Dialog, etc. Not affected by migration |
| `mockup-sandbox/*` | ~50 files | Separate dev sandbox, mirror of UI components |
| `lib/api-client-react/src/generated/*` | Auto-generated | Regenerated from OpenAPI spec — reading old output is pointless |
| `lib/api-zod/src/generated/*` | Auto-generated | Same |
| Config files (package.json, tsconfig.json, vite.config.ts, etc.) | ~15 files | Infrastructure config, not business logic |

**Everything else — every line of every source file — has been read.**

---

## Appendix B: Engineering Standards Supplement

---

### B1. Technical Debt Inventory (from grep of entire codebase)

| Location | Debt | Impact on Migration |
|----------|------|-------------------|
| `notifications.ts:47-52` | `// TODO: implement email via nodemailer/Resend` and `// TODO: implement Discord DM via bot token` | In 5v5, Discord bot IS the notification channel. Implement DM via bot token in Phase 1, not "future". |
| `Register.tsx:39` | `// TODO Claude: replace localStorage auth — discordId will come from Discord OAuth session (C20)` | Registration page deleted in 5v5. But the pattern reveals: 9 locations use localStorage auth (see A1). |
| `PlayerDashboard.tsx:276` | `// TODO: when backend returns 403 on decline (quota reached), hide this button` | Challenge system deleted. Moot. |
| `ManageLadderSettings.tsx:75-80` | 6× `(ladder as any).fieldName` type casts | OpenAPI spec `LadderSettings` schema is missing these fields as required. Codegen generates wrong types. Fix in new spec. |
| `Ladder.tsx:50` | `(settings as any)?.playoffSize` | Same root cause — LadderSettings type incomplete. |
| `MatchDetail.tsx:101` | `(match as any).vods` | MatchDetail schema doesn't include `vods` array in OpenAPI. Backend returns it but codegen doesn't type it. Fix in new spec. |
| `VodDetail.tsx:180-184, Vods.tsx:218-226` | 5× `(vod as any).matchId` | Same pattern — VodEntry schema missing `matchId` in required fields. Fix in new spec. |
| `app.ts:16` | Session secret hardcoded: `"vclol-admin-secret-2024"` | Must be env var in production. Add `SESSION_SECRET` to required env vars. |
| `app.ts:21` | `cookie.secure: false` | Must be `true` behind HTTPS in production. Add conditional based on NODE_ENV. |
| `matches.ts` POST | ELO delete not reversed on match delete | DELETE /matches/:id deletes the match but does NOT reverse the ELO change. Documented in UI tooltip. Same issue exists in 5v5 for team ELO. |
| `seed.ts` | ELO deltas hardcoded as ±16 | Doesn't use actual calculateElo(). Seed data is unrealistic. Rewrite seed to use real ELO calculation. |
| `custom-fetch.ts` | Full 250-line error handling system | Sophisticated but works. Keep entirely — it's framework-agnostic. |

---

### B2. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| .rofl format changes with patch | Medium | Critical — parser breaks | Monitor ReplayBook repo releases. Parser reads format dynamically, not hardcoded offsets. ROFL2 magic bytes check prevents silent corruption. |
| Discord bot rate limited | Low | Medium — submissions delayed | discord.js v14 handles rate limits automatically. Queue .rofl processing server-side. |
| .rofl upload exceeds Discord 25MB limit | Unknown | High — core feature broken | Check: typical 5v5 custom game .rofl size. If >25MB, need alternative upload (direct HTTP to VPS, or chunked). |
| Team ELO imbalanced at launch | Certain | Low — expected | K-factor configurable. Can adjust after observing first 50 matches. |
| Schema change mid-development | Medium | High if Layer 1 changes | Layer 1 (tables + FKs) locked before coding. Layer 2 (columns) added freely. |
| Replit and Claude produce conflicting code | Medium | Medium — merge conflicts | Strict contract: Claude owns schema/routes/openapi. Replit owns pages/components. No cross-ownership. |
| Player impersonation (fake .rofl) | Low | Medium — false stats | .rofl contains PUUID (unencrypted). Cross-reference with registered player PUUID. Cannot forge PUUID inside .rofl without modifying binary. |
| Oracle VPS runs out of resources | Low | High — service down | Monitor CPU/RAM via Portainer. .rofl parsing is lightweight (3 sec, <50MB RAM). |

---

### B3. Acceptance Criteria (per Phase)

**Phase 0 — Schema: DONE when:**
- All new schema files compile with `tsc --noEmit`
- `pnpm --filter @workspace/db run push` succeeds against fresh DB
- Schema index exports all new tables, none of the deleted ones

**Phase 1 — OpenAPI + Codegen: DONE when:**
- `openapi.yaml` passes OpenAPI 3.1 validation (no $ref errors)
- `pnpm --filter @workspace/api-spec run codegen` succeeds
- Generated hooks include: `useListTeams`, `useGetTeam`, `useCreateTeam`, `useListTeamMembers`, `useGetMatchPlayers`
- Generated hooks do NOT include: `useListChallenges`, `useCreateChallenge`, `useJoinMatchmakingQueue`
- Generated types include `teamAId`, `teamBId` in `Match` schema, NOT `playerAId`, `playerBId`

**Phase 1.5 — Routes: DONE when:**
- `POST /api/matches/submit` accepts .rofl binary, parses metadata, creates match + 10 match_players rows + updates team ELO
- `GET /api/ladder` returns team entries sorted by teamElo
- `GET /api/teams/:id` returns team with members + match history
- All deleted routes return 404
- Seed script creates valid 5v5 test data

**Phase 3-6 — Frontend: DONE when:**
- Zero `localStorage.getItem("vclol_player_id")` in codebase (except DevLogin)
- Zero `playerAId` / `playerBId` references in any page file
- Zero `currentElo` / `peakElo` on player objects in any display
- Team leaderboard shows teams sorted by ELO
- Match detail shows 10-player stats table
- Admin can: create season → create team (or via bot) → submit match → see ELO update → complete season
- All empty states display correctly

---

### B4. New Dependencies

| Package | Purpose | Where |
|---------|---------|-------|
| `discord.js` ^14 | Discord bot runtime | New package: `artifacts/discord-bot` |
| `multer` | .rofl file upload handling (already in build.ts allowlist but not in dependencies) | `@workspace/api-server` |

**Remove from active use (code references deleted):**
- Challenge-related hooks (codegen handles this)
- `adminSchedule` endpoints

**Keep (no change):**
- All current dependencies remain valid. Express, Drizzle, React Query, Wouter, shadcn, Recharts, Framer Motion — all still used.

---

### B5. Environment Variables

**Current (from code evidence):**
| Var | Used in | Required? |
|-----|---------|----------|
| `DATABASE_URL` | `lib/db/drizzle.config.ts`, `lib/db/src/index.ts` | Yes — crashes on startup without it |
| `PORT` | `api-server/src/index.ts` (default 3000), `vclol/vite.config.ts` (default 5173) | No — has defaults |
| `SESSION_SECRET` | `app.ts` (default `"vclol-admin-secret-2024"`) | Should be required in prod |
| `RIOT_API_KEY` | `players.ts:108` (optional — skips validation if absent) | No — Phase 2 |
| `DISCORD_CLIENT_ID` | `auth.ts:8` | Yes — for Discord OAuth |
| `DISCORD_CLIENT_SECRET` | `auth.ts:9` | Yes — for Discord OAuth |
| `DISCORD_REDIRECT_URI` | `auth.ts:10` (default localhost:5173) | Yes — must match Discord app config |
| `VITE_DISCORD_URL` | `Home.tsx:287` (Discord invite link) | No — optional |
| `REPL_ID` | `vite.config.ts:9` | No — Replit detection |
| `BASE_PATH` | `vite.config.ts:8` | No — default "/" |
| `NODE_ENV` | `vite.config.ts`, `build.ts` | No — standard |

**New for 5v5:**
| Var | Purpose |
|-----|---------|
| `DISCORD_BOT_TOKEN` | Discord bot auth token |
| `ROFL_UPLOAD_DIR` | Directory path for stored .rofl files on VPS |
| `ROFL_MAX_SIZE_MB` | Max .rofl upload size (for validation) |

---

### B6. Deployment Plan (Portainer)

**Current workflow (from post-merge.sh + CLAUDE.md):**
1. `pnpm install --frozen-lockfile`
2. `pnpm --filter @workspace/db run push` (Drizzle schema sync)
3. `pnpm --filter @workspace/api-spec run codegen` (generate hooks)
4. `pnpm --filter @workspace/scripts run seed` (reset DB to seed data)

**5v5 variant deployment:**
- Same workflow. Seed script must be rewritten for team data.
- New container: Discord bot runs as separate process (or same container, separate entrypoint).
- Bot needs persistent connection to Discord gateway — cannot restart frequently.
- Recommended: 2 Portainer stacks — `vclol-web` (API + frontend) and `vclol-bot` (Discord bot). Bot can restart independently without affecting web.

---

### B7. Database Migration Strategy

**Since variant branch is a fresh start with no production data:**
- No migration scripts needed. `drizzle-kit push` creates tables from scratch.
- Seed script provides test data for development.
- When going to production: first deploy creates all tables empty. Bot is the only data source.

**If ever migrating data from v1 to v2 (hypothetical):**
- Would need migration SQL to: create new tables, copy player data (minus ELO fields), create teams from existing players, transform matches from playerA/B to teamA/B.
- Not needed now since v1 has no real users yet.

---

### B8. Codegen Pipeline (Exact Commands)

```
# After ANY OpenAPI change:
cd lib/api-spec && pnpm run codegen

# This runs orval.config.ts which:
# 1. Reads openapi.yaml
# 2. Generates React Query hooks → lib/api-client-react/src/generated/api.ts
# 3. Generates Zod schemas → lib/api-zod/src/generated/api.ts + types/
# 4. Uses custom-fetch.ts as the HTTP client (customFetch mutator)

# After ANY schema change:
cd lib/db && pnpm run push
# This runs drizzle-kit push → syncs PostgreSQL schema to match Drizzle TS files

# Full rebuild:
pnpm run build
# Runs tsc --build (typecheck libs) then builds all artifacts
```

**Critical:** Replit MUST NOT edit `openapi.yaml` or `lib/db/src/schema/*`. These are Claude's domain. Replit edits pages that CONSUME generated hooks, never the hooks themselves.

---

### B9. Concurrency & Race Conditions

| Scenario | Risk | Mitigation |
|----------|------|------------|
| Two teams submit .rofl for same match simultaneously | Low (unlikely same game submitted twice) | `matches.gameId` has unique constraint. Second submission rejected with 409. |
| Bot processing .rofl while admin manually creates match | Medium | `resultSource` field distinguishes `rofl_parse` vs `admin_manual`. Admin can override. |
| Team ELO updated by two concurrent match results | Low (scrims are sequential) | ELO update is inside DB transaction (`db.transaction()`). PostgreSQL row-level locking prevents lost updates. |
| Player added to team while match being parsed | Very low | `match_players` references `players.id`, not `team_members`. Player just needs to exist in `players` table. Team membership is informational. |
| Season completed while match being submitted | Low | `completeSeason` is admin-only with confirmation dialog. Add check: reject match submission if season status is 'completed'. |

---

### B10. Security Considerations

| Item | Current State | Required State |
|------|--------------|---------------|
| Session secret | Hardcoded `"vclol-admin-secret-2024"` | From `SESSION_SECRET` env var, crash if missing in production |
| Cookie secure flag | `false` | `process.env.NODE_ENV === 'production'` |
| CORS | `origin: true` (allows any origin) | Lock to specific domain in production |
| Admin auth | Session-based, password hashed with scrypt+salt | Keep — solid |
| Player auth | localStorage stub | Must complete Discord OAuth. Session-based like admin. |
| .rofl upload | No size validation | Add `multer` limits. Check file size before processing. Validate ROFL2 magic bytes before parsing. |
| Rate limiting | None | Add `express-rate-limit` on `/api/matches/submit` (prevent spam uploads). Already in build.ts allowlist. |
| SQL injection | Drizzle ORM parameterized queries | Already safe. Keep. |
| XSS | React auto-escapes. No `dangerouslySetInnerHTML`. | Already safe. Keep. |

---

### B11. Monitoring & Observability

**Current:** `console.log` / `console.error` only. No structured logging, no health metrics beyond `/healthz`.

**Minimum for launch:**
- Keep `/healthz` endpoint (already exists)
- Add DB connection check to health endpoint (`SELECT 1`)
- Discord bot: log connection status, command usage, parse errors
- .rofl parse: log file size, parse duration, player count, success/failure
- Team ELO changes: log old/new ELO per match (already done via `elo_history` table)

**Not needed for MVP:** External monitoring (Datadog, etc.), APM, distributed tracing.

---

## Appendix C: Unresolved Architecture Issues (Backend Agent Action Required)

> These issues were identified during frontend review and require backend/schema/API changes before frontend can implement. Frontend agent will NOT act on these until backend changes land.

---

### C1. Team Governance — Team as Independent Entity

**Problem:** Team is currently tied to a single `captainPlayerId`. There is no self-service captain transfer, no role-based team management, no team dashboard. If captain quits, the team is orphaned and requires admin intervention.

**Industry standard (FACEIT / ESEA / Battlefy / Start.gg):**
- Team is an independent entity with role-based access: Owner → Captain → Member
- Captain transfer is self-service (captain selects new captain → confirm → done)
- Captain can invite/kick/promote members via web UI or bot commands
- Team has its own settings page (name, tag, visibility defaults)
- Leaving captain must transfer ownership first (enforced)

**Current state:**
- `captainPlayerId` is the only authority model
- Captain transfer: admin-only (ManageTeams.tsx → PUT /api/teams/:id)
- No API endpoints for roster management (add/remove/update members)
- No team settings page for captains
- No self-service anything

**Required backend changes:**
1. Add `role` enum to `teamMembers`: `owner | captain | member` (or at minimum separate `owner` from `captain`)
2. New API endpoints:
   - `PUT /api/teams/:id/transfer-captain` — captain self-service transfer
   - `POST /api/teams/:id/members` — invite member (captain+ only)
   - `DELETE /api/teams/:id/members/:playerId` — remove member (captain+ only)
   - `PUT /api/teams/:id/members/:playerId` — update member role (owner only)
   - `PUT /api/teams/:id/settings` — team name/tag/visibility defaults
3. Enforce: captain cannot leave team without transferring first
4. Discord bot commands: `/transfer-captain @user`, `/promote @user`, `/demote @user`

**Frontend will build (after backend lands):**
- Captain Dashboard page with roster management UI
- Captain transfer flow (select → confirm → done)
- Team settings panel (name, tag, default match visibility)

---

### C2. VOD Visibility — Team-Level Default + Bulk Management + Per-Match Override

**Problem:** Match visibility is per-match only (`visibleAfter` timestamp on `matches` table). There is no team-level default, no bulk management, no captain dashboard to control visibility across all their matches.

**Industry standard:**
- Team-level privacy default (e.g. "all our matches are private by default")
- Bulk operations (e.g. "make all matches from Event X public")
- Per-match override for exceptions
- Tiered visibility: Private (team only) → Participants (both teams) → Public (everyone)

**Current state:**
- `matches.visibleAfter` — NULL = default 7 days, captain can set to far-future (private) or past (public)
- No team-level default setting
- No bulk visibility management
- No captain-facing UI to manage visibility (only admin can see/change this)

**Required backend changes:**
1. Add `defaultMatchVisibility` to `teams` table: `private | participants | public` (default: `participants`)
2. Add `PUT /api/teams/:id/matches/visibility` — bulk update visibility for team's matches
3. Match creation: inherit team's `defaultMatchVisibility` when setting initial `visibleAfter`
4. API should support filtering: `GET /api/matches?teamId=X&visibility=private` for captain dashboard

**Frontend will build (after backend lands):**
- Team Settings → Default Visibility toggle
- Captain Dashboard → Match list with bulk visibility controls
- Per-match visibility override (already partially exists in MatchDetail)

---

### C3. Team VOD Discovery — Dedicated VODs Section on Team Profile

**Problem:** No dedicated VODs section on Team Profile page. Users must click through every individual match to find VODs.

**Current state:**
- API already supports `teamId` filter on VODs endpoint (`GET /api/vods?teamId=X`)
- Team Profile page shows Recent Matches but no VODs section
- This is a frontend-only fix BUT depends on visibility rules (C2) being resolved first

**Required backend confirmation:**
- Confirm `GET /api/vods?teamId=X` respects visibility rules (only returns VODs the viewer is allowed to see)
- If not, add visibility filtering to the VODs endpoint

**Frontend will build (after confirmation):**
- TeamProfile → "Team VODs" section using `useListVods({ teamId })` hook
- Respects same visibility rules as match visibility

---

### C4. Players Listing Improvements

**Problem:** Players page shows minimal info — no team affiliation, no games played, no win rate.

**Required backend changes:**
- `GET /api/players/public-list` should include: team name/tag (from team_members JOIN teams), total games played (from match_players COUNT), win rate (from match_players WHERE win=true / total)
- Or provide a separate aggregation endpoint

**Frontend will build (after backend lands):**
- Players page table columns: Riot ID, Team, Role, Games, Win Rate
- Sort/filter by team, role, games played
