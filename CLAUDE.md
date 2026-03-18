# VCLoL — Claude Code Reference

Read this file completely before every session. Every decision here is final unless explicitly overridden by the user in the current session.

---

## Project Identity

Vancouver Competitive LoL Project. Grassroots competitive LoL platform for serious local players. Core: ELO Ladder (primary) + VOD Library (learning/discovery) + Challenge System. Events are secondary. Long-term vision: city-by-city competitive ladder network as a pro discovery pipeline.

Full PRD: `/docs/PRD.md` (copy of vclol_prd_final.md in repo root)

---

## Absolute Principles

1. **Everything defaults to automatic.** Admin can override but automation is always the default. Never ask "should this be manual?" — assume auto first.
2. **Zero hardcoded configurable values.** K-factor, match limits, expiry times, playoff sizes — all read from `ladderSettings` or `adminScheduleSettings` DB tables.
3. **Read source before answering.** Never guess schema, never guess route signatures, never assume a file exists without reading it.
4. **Schema first.** Every change: Schema → OpenAPI spec → orval codegen → Express route → React page with generated hooks. Never write frontend API calls by hand.
5. **Every ELO change writes to `elo_history`.** No exceptions. Reason field: `match`, `season_reset`, `manual_admin`.
6. **.rofl metadata is source of truth.** Never trust player-reported results. Results come from LCU auto-fetch or .rofl parse.

---

## Architecture

**Stack:** pnpm monorepo, React + Vite + Wouter, Express + TypeScript, PostgreSQL + Drizzle ORM, OpenAPI → Orval codegen

**Repo:** `xiNeRoar/lolproject` (public GitHub)

**Key paths:**
- Schema: `lib/db/src/schema/`
- OpenAPI: `lib/api-spec/openapi.yaml`
- Codegen config: `lib/api-spec/orval.config.ts`
- Generated hooks: `lib/api-client-react/src/generated/`
- Backend routes: `artifacts/api-server/src/routes/`
- Frontend pages: `artifacts/vclol/src/pages/`

**After ANY schema change:**
```
cd lib/api-spec && pnpm run generate
```
Verify generated types in `lib/api-client-react/src/generated/api.schemas.ts` before writing any frontend code.

**Deployment:** User manages via Portainer UI. Never suggest SSH or CLI. Package as TAR for Portainer "Build image" UI. Auto-migrate on container start.

---

## Authentication Architecture

**Admin:** Session-based (`req.session.adminId`). `requireAdmin` middleware on all admin routes.

**Player (current stub):** localStorage `vclol_player_id`. All `// TODO Claude: replace localStorage auth` comments mark where real session must go.

**Player (target):** Discord OAuth → `req.session.playerId`. Implement via `/auth/discord` → `/auth/discord/callback` routes. Session stores `playerId` (numeric DB id) and `playerRiotId`.

**Critical:** After Discord OAuth, find all `localStorage.getItem("vclol_player_id")` in frontend and replace with session-based auth.

---

## Business Logic — Challenge System

```
Create: challenger (logged in) selects opponent → picks time slot → POST /api/challenges
  - challengerId = req.session.playerId (NEVER from request body)
  - Check weekly limits against ladderSettings

Decline limits (read from ladderSettings):
  - maxDeclinesPerWeek (default 2): count declines this week across all challengers
  - maxDeclinesSameOpponentPerWeek (default 1): count declines this week vs same challenger
  - If either limit reached → Decline button removed from UI → PUT /:id/accept called automatically

No-show (scheduler, configurable):
  - ladderSettings.noShowExpiryDays after accepted with no gameId submitted
  - status = 'expired_no_show'
  - Admin notified → one-click assign loss ELO

Dispute (Phase 1 only):
  - Both players submit gameId
  - Same gameId → auto-confirm
  - Different gameId → status = 'disputed', admin notified
```

---

## Business Logic — VOD Pipeline

```
Phase 1 (spectator bot present):
  Spectator bot in game → game ends → LCU downloads .rofl automatically
  → POST /api/replays { matchId, roflPath, renderMode: 'auto_capture' }
  → render queue entry created

Phase 2 (player submits):
  Player uploads .rofl via PlayerDashboard
  → POST /api/replays (multipart, rofl file)
  → File stored: /data/replays/{seasonId}/{matchId}/{matchId}.rofl
  → Metadata parsed from .rofl header: champion, KDA, winner (tamper-proof)
  → Match result auto-updated if not already set
  → render queue entry created

Render machine polls:
  GET /api/replays/queue/next → returns next pending job
  PATCH /api/replays/:id { status: 'processing' }
  PATCH /api/replays/:id { status: 'done', youtubeUrlA: '...', youtubeUrlB: '...' }
  → VOD entries auto-created, linked to match_id
  → .rofl file deleted from VPS

Patch expiry: Show warning in UI if < 3 days remaining (estimate based on Riot patch cycle, ~2 weeks)
```

---

## Business Logic — Season & Playoff

```
Season complete trigger (admin):
  1. Find player with highest ELO → insert season_champions
  2. Check qualified players (wins+losses >= ladderSettings.playoffMinMatches)
  3. If >= ladderSettings.playoffMinPlayers → create playoff bracket
     else → season_champion = highest ELO player, no bracket
  4. Apply soft ELO reset to ALL active players
  5. Write each reset to elo_history (reason: 'season_reset')
  6. Award season_champion badge to champion

Playoff bracket auto-seeded by current ELO (highest seed = 1st).
Bracket format read from ladderSettings.playoffFormat.
```

---

## Business Logic — Registration

```
Step 1: POST /auth/discord → Discord OAuth
Step 2: POST /api/players/register {
  riotId: string,        // validated against Riot API
  discordId: string,     // from OAuth session
  discordUsername: string,
  email?: string,
  notificationPreference: 'web' | 'email' | 'discord' | 'both'
}
Validations:
  - discordId not already in players table
  - riotId not already in players table  
  - Riot API confirms riotId exists (ACCOUNT-V1 endpoint)
Success → player created, registrationStatus: 'active', session set
```

---

## Complete Backend Task List

Work through in order. Do not skip ahead.

### P1 — Platform broken without these (DO FIRST)

**C1: Public registration endpoint**
- `POST /api/players/register` (no requireAdmin)
- Accepts: riotId, discordId, discordUsername, email, notificationPreference
- Validates: discordId unique, riotId unique, riotId exists in Riot API
- Returns: Player object + sets req.session.playerId
- Update Register.tsx to call this endpoint

**C2: Player self-update endpoint**
- `PUT /api/players/:id/profile` (requires player session, own account only)
- Allows editing: email, notificationPreference ONLY
- Cannot edit: riotId, currentElo, wins, losses, isActive
- Update PlayerDashboard.tsx notification settings save

**C3: GET player by numeric ID**
- `GET /api/players/by-id/:id` (public)
- Returns PlayerProfile shape (same as GET /:riotId)
- Register BEFORE /:riotId route to prevent Express matching "by-id" as a riotId
- Add to OpenAPI spec, run codegen
- Update PlayerDashboard.tsx: replace useGetPlayer(String(pid)) with useGetPlayerById(pid)

**C4: Challenge POST — challengerId from session**
- Fix challengerId: challengedId bug in challenges.ts POST
- Read challengerId from req.session.playerId
- If no session → 401

**C5: Challenge decline counting**
- Track declines per player per week in challenges table
- Before creating decline: check against ladderSettings.maxDeclinesPerWeek and maxDeclinesSameOpponentPerWeek
- If limit reached: return 403 with reason
- Frontend: PUT /:id/decline returns 403 → UI removes Decline button, auto-calls accept

**C6: No-show auto-expiry**
- Scheduler (setInterval or cron): every hour, find accepted challenges where scheduledTime + noShowExpiryDays has passed and no gameId submitted
- Update status to 'expired_no_show'
- Create admin notification

### P2 — Data never written

**C7: matches POST → elo_history**
- After updating both players' ELO in transaction, insert two elo_history rows
- playerId, elo (new value), delta (new - old), matchId, reason: 'match'

**C8: seasons complete → season_champions**
- Before ELO reset, find max currentElo player among active players
- Insert into seasonChampionsTable: seasonId, playerId, finalElo

**C9: seasons complete → elo_history**
- For each player whose ELO is reset, insert elo_history row
- delta = newElo - oldElo, reason: 'season_reset', matchId: null

### P3 — Settings ignored

**C10: calculateElo uses hardcoded K-factor**
- In matches.ts POST, fetch ladderSettings before ELO calc
- Pass kFactor to calculateElo(pA, pB, won, kFactor)

**C11: Challenge expiry hardcoded 48h**
- In challenges.ts POST, read ladderSettings.challengeExpiryHours
- expiresAt = now + challengeExpiryHours * 3600 * 1000

**C12: Ladder minMatchesForDisplay hardcoded in elo.ts**
- ladder.ts route must read from DB, not from elo.ts constant

### P4 — Incomplete data shapes

**C13: events GET /:slug → complete match objects**
- Add to matches.map: playerAId, playerBId, playerAEloBefore, playerAEloAfter, playerBEloBefore, playerBEloAfter, isPlayoff, seasonId

**C14: players GET /:riotId → opponent riotIds in recentMatches**
- formatMatch() currently returns null for eventTitle and playerRiotIds
- For each match, lookup opponent's riotId and include as playerARiotId/playerBRiotId
- Frontend: opponent names in match history become clickable links

**C15: EventDetail participants → confirmed only**
- registrations.ts GET: when eventId provided, filter to status != 'withdrawn'
- Or add confirmed=true query param

### P5 — New schema + VOD pipeline

**C16: replay_submissions schema**
```typescript
// lib/db/src/schema/replaySubmissions.ts
export const replaySubmissionsTable = pgTable('replay_submissions', {
  id: serial('id').primaryKey(),
  matchId: integer('match_id').references(() => matchesTable.id),
  playerId: integer('player_id').references(() => playersTable.id),
  roflFilePath: text('rofl_file_path'),
  fileSizeBytes: integer('file_size_bytes'),
  status: text('status').notNull().default('pending'),
  // pending | processing | done | failed
  renderMode: text('render_mode').notNull(),
  // auto_capture | player_submitted
  youtubeUrlA: text('youtube_url_a'),
  youtubeUrlB: text('youtube_url_b'),
  errorMessage: text('error_message'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  processedAt: timestamp('processed_at'),
});
```
Add to OpenAPI, run codegen.

**C17: Replay submission endpoints**
- `POST /api/replays` — multipart upload, store .rofl, create queue entry
- `GET /api/replays/queue/next` — render machine polling (no auth, or machine token)
- `PATCH /api/replays/:id` — render machine status update
- `GET /api/replays/queue` — admin view of all queue entries

**C18: Auto-create VOD entries on render complete**
- When PATCH /api/replays/:id receives status='done' with youtubeUrlA + B:
  - Parse .rofl metadata for champion, opponentChampion, playerEloAtTime
  - Create two vod_entries linked to match_id (one per player POV)
  - Auto-generate title: "{playerRiotId} ({champion}) vs {opponent} — VCLoL S{N}"

**C19: ladderSettings new fields migration**
Add columns: maxDeclinesPerWeek (default 2), maxDeclinesSameOpponentPerWeek (default 1), noShowExpiryDays (default 7), playoffMinPlayers (default 4), playoffSize (default 8), playoffFormat (default 'single_elimination')

### P6 — Auth (do after P1-P5 stable)

**C20: Discord OAuth**
- `GET /auth/discord` → redirect to Discord OAuth
- `GET /auth/discord/callback` → exchange code, get discordId + username, set req.session.playerId
- `POST /auth/logout` → destroy session
- Replace all localStorage.getItem("vclol_player_id") in frontend with session

**C21: RiotID validation**
- In POST /api/players/register: call Riot ACCOUNT-V1 API
- gameName + tagLine format: split on '#'
- 404 from Riot → return 400 "RiotID does not exist"

**C22: Protect challenge endpoints with player session**
- PUT /:id/accept, /:id/decline, /:id/game-ready
- Verify req.session.playerId matches challenged/challenger as appropriate

### P7 — Automation & notifications

**C23: Badge auto-awarding**
Trigger points:
- After match created: check first_blood (player's first ever match), win_streak (3+ consecutive), veteran (20+ total matches)
- After season complete: climber (200+ ELO gain in season), season_champion

**C24: Notification service**
Read player.notificationPreference:
- 'web': insert to notifications table (frontend polls or websocket)
- 'email': send via nodemailer/Resend
- 'discord': send Discord DM via bot token
- 'both': email + Discord

Trigger on: challenge received, accepted, declined, auto-accepted, match result confirmed, no-show flagged, season completed

---

## What Replit Has Built (Do Not Redo)

Frontend (complete):
- Nav: Home | Ladder | VODs | Events | About | Contact (footer)
- All public pages: Home, Ladder, Events, EventDetail, VODs, VodDetail, MatchDetail, PlayerProfile, Register, PlayerLogin, PlayerDashboard, About, Contact, DevLogin
- All admin pages: Dashboard, ManageEvents, ManageMatches, ManageVods, ManagePlayers, ManageRegistrations, ManageSeasons, ManageChallenges, ManageLadderSettings
- Bracket components: SingleElimination, DoubleElimination, RoundRobin, Swiss
- ChallengeModal, GameIdSubmit
- Reactive auth (useState/useEffect for localStorage)
- Season Champion display on PlayerProfile
- W/L logic correct in PlayerDashboard

Schema (complete):
- All tables exist: players, matches, vod_entries, events, registrations, seasons, challenges, elo_history, season_champions, player_badges, ladder_settings, admin_schedule_settings, matchmaking_queue, vod_timestamps

OpenAPI + codegen (complete):
- All endpoints defined, all hooks generated
- ListVodsParams has playerId, ListMatchesParams has seasonId + playerId

---

## Frontend Still Needed (Replit, then done)

1. Register.tsx — update for Discord OAuth flow (Discord button as Step 1, RiotID as Step 2)
2. PlayerDashboard match rows — Upload Replay (.rofl) button with patch expiry indicator
3. ManageVods — Render Queue panel (pending/processing/failed jobs, retry button)
4. ManageLadderSettings — New fields: decline limits, no-show expiry, playoff config
5. PlayerDashboard pending challenges — Decline button disabled state with quota message
6. PlayerLogin — Add "Dev Login →" link for testing

---

## Environment

- NAS: Synology DS920+
- VPS: Oracle Cloud ARM64 (4 cores, ~23GB RAM), Ubuntu
- Portainer: primary management UI (user never uses SSH)
- Domain: xinehub.com / xinehub.work (personal), vclol domain TBD
- Render machine: User's Windows PC (separate from VPS)

