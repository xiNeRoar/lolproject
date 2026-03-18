# Vancouver Competitive LoL Project (VCLoL) — Product Requirements Document
**Version:** 2.0 | **Date:** March 2026 | **Status:** Authoritative

---

## 1. Mission

Build the infrastructure for grassroots competitive LoL — starting in Vancouver — that gives serious local players a place to compete, improve, build a verifiable record, and be discovered.

Not profit-driven. A contribution to the esports ecosystem. Long-term vision: city-by-city competitive ladder network (like NBA city leagues) where a player's VCLoL profile is a credible, verifiable record that professional teams can trust.

---

## 2. Target Users

**Primary — The Serious Local Player**
Age 16–25, Vancouver / Lower Mainland. Plays ranked but wants structured, meaningful competition. Wants to improve through VOD review. Wants a credible public competitive profile.

**Secondary — The Aspiring Pro**
Actively pursuing professional play. Needs verifiable match history, ELO trajectory, and VOD archive as a scouting portfolio.

**Tertiary — Observer / Community Member**
Follows the local scene, watches VODs, may become a competitor.

**Out of Scope (Now)**
Casual players, 5v5 teams, players outside Vancouver.

---

## 3. Core Value Propositions

1. **ELO Ladder** — Persistent competitive identity across seasons
2. **VOD Library** — Tamper-proof first-person match recordings, searchable, with metadata auto-extracted from .rofl
3. **Credible Public Profile** — The competitive résumé: ELO history, match record, VODs, event placements, badges

---

## 4. Complete Business Logic & Rules

### 4.1 Player Registration

**Flow:**
1. Player clicks "Register" → Discord OAuth login (verifies real Discord account exists)
2. Player enters RiotID → backend validates against Riot API (account must exist)
3. Both verified → account created, immediately active, both identities permanently bound
4. One Discord account = one RiotID. Duplicate binding rejected with clear error.

**Logic:**
- No admin approval needed — verification IS the approval
- Player cannot change RiotID after binding (admin-only override)
- Inactive/banned Riot accounts rejected at registration

**UI implications:**
- Register page: Discord OAuth button (primary action) + RiotID input field
- Success → redirect to PlayerDashboard
- Error states: Discord already bound, RiotID already bound, RiotID doesn't exist

---

### 4.2 ELO System

**Calculation:** Standard Elo formula. K-factor, starting ELO, minimum matches for ladder display — all configurable via `ladderSettings` table. Zero hardcoded values.

**ELO written when:** Match result confirmed (Phase 1: admin entry / Phase 2: LCU auto-fetch)

**ELO history:** Every change written to `elo_history` table with reason: `match`, `season_reset`, `manual_admin`

**Season reset:** Soft reset on season complete — compresses spread toward baseline, preserves relative rank. Factor configurable. Writes to `elo_history` with reason `season_reset`.

---

### 4.3 Challenge System

**Creating a Challenge:**
- Logged-in player selects opponent from Ladder → opens ChallengeModal
- Picks from available time slots (within admin-defined windows)
- System checks: both players active, season active, weekly limits not exceeded
- Challenge created with 48-hour response window (configurable)

**Accepting / Declining:**
- Challenged player sees pending challenge in Dashboard
- Can Accept or Decline
- **Decline limits (all configurable in ladderSettings):**
  - Max 2 declines per week (across all challengers)
  - Max 1 decline per week against the same opponent
  - When weekly quota exhausted → Decline button disappears, challenge auto-accepts, both players notified
- Accepted → scheduled time confirmed, 7-day window to play (configurable)

**Playing the Match:**
- Challenger (room host) opens custom game in LoL client, invites opponent by RiotID
- Challenger submits Game ID on platform → "Room Ready" notification sent to opponent
- Both players play

**Result Recording:**
- **Phase 1:** Spectator bot is present in game → LCU WebSocket detects end-of-game → auto-fetches winner, champion, KDA, gold, duration, gameId → writes to matches table → ELO auto-updates → .rofl auto-downloaded → enters render queue
- **Phase 2 (when bot can't cover all games):** Player submits .rofl file → system parses metadata (winner/champion/KDA are inside .rofl, tamper-proof) → same auto-processing

**No-show / Forfeit:**
- 7 days after accepted challenge: no gameId submitted → status auto-changes to `expired_no_show`
- Admin receives notification → reviews → one-click: assign loss ELO to no-show player
- Both players deducted nothing if mutual no-show (admin discretion)

**Dispute:**
- Only possible in Phase 1 admin-entry period
- If both players submit different gameIds → status = `disputed`, admin notified
- Admin requests screenshots from both, reviews, one-click confirms correct result
- Phase 2 (LCU auto-fetch): dispute impossible — Riot server is source of truth

---

### 4.4 Season Structure

**All values configurable in Admin backend. Zero hardcoded.**

| Setting | Default | Configurable |
|---|---|---|
| Season length (weeks) | 10 | ✅ |
| Match window days | Fri/Sat/Sun | ✅ |
| Max challenges per week | 3 | ✅ |
| Max challenges same opponent/week | 1 | ✅ |
| Max declines per week | 2 | ✅ |
| Max declines same opponent/week | 1 | ✅ |
| No-show expiry (days) | 7 | ✅ |
| Challenge expiry (hours) | 48 | ✅ |
| Min matches for ladder display | 4 | ✅ |
| K-factor | 32 | ✅ |
| Playoff qualification (min matches) | 4 | ✅ |
| ELO reset factor | 0.5 | ✅ |

**Playoff Trigger Logic (auto, admin can override):**
- ≥ 8 qualified players → 8-person bracket
- 4–7 qualified players → 4-person bracket
- < 4 qualified players → no playoff, highest ELO at season end = Season Champion
- Format (Single Elimination / Double Elimination) → configurable per season

---

### 4.5 VOD System

**Philosophy:** VODs are tamper-proof because they come from .rofl files, not player self-reporting. The .rofl contains verifiable game metadata.

**Phase 1 (Spectator bot present every game):**
```
Spectator bot in custom game
→ Game ends → LCU API auto-downloads .rofl
→ .rofl stored: Oracle VPS /data/replays/{seasonId}/{matchId}/
→ Metadata parsed: champion, opponent champion, KDA, duration, winner
→ Match record auto-created with all metadata
→ .rofl enters render queue
→ Render machine (Windows PC) polls VPS every 30s
→ Render machine loads .rofl → Replay API sets camera to Player A POV
→ OBS records → upload to VCLoL official YouTube channel
→ Repeat for Player B POV
→ Two VOD entries auto-created and linked to match
→ .rofl deleted from VPS after YouTube URLs confirmed
```

**Phase 2 (High volume — player submits .rofl):**
```
Player opens LoL client → downloads their .rofl from match history
→ PlayerDashboard: "Upload Replay" button on match row
  (only visible if .rofl not yet submitted AND patch not expired)
→ Player selects .rofl file → uploads to VPS
→ Same render pipeline as Phase 1
→ Player sees queue status: Pending → Processing → Done
```

**Patch expiry warning:** Match rows show countdown if within 3 days of patch expiry. After expiry, Upload button replaced with "Replay expired" indicator.

**Render queue failure:** Admin sees failed jobs in ManageVods. Can retry or manually add YouTube URL.

**YouTube:** All VODs upload to VCLoL official channel. Title auto-generated: "{Player} ({Champion}) vs {Opponent} — VCLoL Season {N}".

---

### 4.6 Events

Events are secondary to the Ladder. Purpose: structured tournaments to create community moments and playoff-style pressure.

**Formats supported:** Single Elimination, Double Elimination, Round Robin, Swiss, In-house, 1v1 Ladder

**Registration:** Players must be registered VCLoL players (linked Discord + RiotID). No free-text registration.

**Participants:** Only `confirmed` registrations shown in participant list. Withdrawn players not shown.

**Match results in events:** Same pipeline as challenge matches. Spectator bot present for playoff/finals.

**Event champion:** Auto-recorded to `season_champions` table on event completion. Shown as trophy on player profile.

---

### 4.7 Player Profile (Public)

Accessible to anyone without login. Contains:
- RiotID, Discord username, ELO, peak ELO, W/L, win rate
- ELO history graph
- Season Champion badges (if any)
- Achievement badges: First Blood, Win Streak (3+), Veteran (20+ matches), Climber (200+ ELO gain in one season)
- Events participated + placement
- Recent matches (last 10, clickable → MatchDetail, opponent names are links to their profiles)
- VOD archive (linked to matches where available)
- Champion pool (from VOD metadata)

---

### 4.8 Ladder Display

Shows all players meeting `minMatchesForDisplay` threshold:
- Rank, RiotID, ELO, W/L, win rate
- Most played champion (from VOD/match metadata)
- Playoff zone divider line (top N highlighted)
- Season name + end date countdown
- Challenge button (logged-in players only, hidden for own row)
- Challenge button disabled when viewer's weekly challenge limit reached

---

## 5. Feature MoSCoW

### MUST HAVE
- Discord OAuth registration + RiotID validation
- ELO Ladder (all values from DB, zero hardcoded)
- Challenge system (full flow: create → accept/decline → play → result → ELO)
- VOD pipeline (.rofl → render → YouTube → auto-linked VOD entries)
- Match result auto-fetch via LCU (Phase 1: bot present, Phase 2: .rofl submit)
- Player profile (public, verifiable)
- Season management (admin configurable schedule)
- Admin backend (full CRUD + render queue management)

### SHOULD HAVE
- Playoff bracket (auto-triggered, format configurable)
- Season champion recording + badge
- Achievement badge auto-awarding
- Notifications (web + email/Discord per player preference)
- H2H record between players
- Events participated + placement on profile
- Event winner podium display
- MatchDetail shows all related VODs
- Opponent names as clickable links in match history
- VOD Archive: filter by player

### COULD HAVE
- Global search (players, VODs, events)
- Recent activity feed
- Rank distribution display
- Series-level match data (individual game scores within BO3/BO5)
- Platform activity signal on homepage
- Multi-city infrastructure

### WON'T HAVE (Now)
- 5v5 team ladder
- Real-time spectating for viewers
- In-platform voice/chat
- Mobile app
- Paid features / player subscriptions (ever)
- Auto-matchmaking (UI stub exists, backend Phase 2)

---

## 6. Technical Architecture

**Stack:** pnpm monorepo, React + Vite + Wouter (frontend), Express + TypeScript (backend), PostgreSQL + Drizzle ORM, OpenAPI spec → Orval codegen.

**Correct development workflow:**
Schema change → OpenAPI spec update → orval codegen → Express route → React page using generated hooks. Never write frontend API calls by hand.

**Absolute principles:**
1. Everything defaults to automatic. Admin can override but automation is always default.
2. Never hardcode any configurable value. Read from `ladderSettings` or `adminScheduleSettings`.
3. Never guess technical details. Read actual source before answering.
4. All ELO changes write to `elo_history` table.
5. .rofl metadata is source of truth for match results (tamper-proof).

**Render machine architecture:**
- Separate Windows application (not part of main codebase)
- Polls `GET /api/replays/queue/next` every 30 seconds
- Processes one job at a time
- Reports status via `PATCH /api/replays/{id}`
- Can be offline without data loss (queue persists in DB)

---

## 7. Data Schema — Key Tables

**New tables needed (not yet in schema):**
```
replay_submissions
- id, match_id → matches, player_id → players
- rofl_file_path, file_size_bytes
- status: pending | processing | done | failed
- render_mode: auto_capture | player_submitted
- youtube_url_a (Player A POV), youtube_url_b (Player B POV)
- error_message, submitted_at, processed_at

(matches table additions)
- game_id (from LCU, for verification)
- result_source: lcu_auto | rofl_parse | admin_manual
```

**Existing tables needing new fields:**
```
ladderSettings (add):
- maxDeclinesPerWeek (default 2)
- maxDeclinesSameOpponentPerWeek (default 1)
- noShowExpiryDays (default 7)
- playoffMinPlayers (default 4)
- playoffSize (default 8)
- playoffFormat (default 'single_elimination')

players (needs):
- discordId (from OAuth, unique)
- registrationStatus: pending_verification | active | suspended
```

---

## 8. Scaling Roadmap

**Phase 1 (Now — ~50 players):** Single open ladder, challenge system, spectator bot every game, admin manual oversight

**Phase 2 (~50–200 players):** Division system (Premier/Challenger/Open), promotion/relegation, auto-matchmaking queue enabled, player .rofl self-submit as primary VOD method

**Phase 3 (200+ players, multi-city):** City instances, cross-city invitational, pro scouting integration, Tournament API as primary result verification

**Platform moat:** Community and trust, not technology. Riot can copy features. They cannot copy two years of Vancouver match history and player relationships.

---

## 9. Competitive Landscape

**Not competing with:**
- PlayVS (school leagues — different market)
- Challonge (one-off brackets — no persistent ladder)
- OP.GG (stats aggregator — no structured competition)

**Unique position:** The only platform combining persistent ELO ladder + verifiable VOD archive + structured competition + discovery pipeline for grassroots → professional pathway. City-scoped, community-owned.

---

## 10. Success Metrics

- 20+ active competitors within 12 months
- Every official match has a verified result
- At least one player scouted or offered tryout using VCLoL profile as evidence
- Platform operates with <2 hours/week admin time at steady state

---

## 11. Outstanding Backend Work (Claude Code)

### P1 — Core flows broken without these
- **C1:** Public player registration endpoint (Discord OAuth + RiotID validation)
- **C2:** Player self-update endpoint (notification preference only, own account)
- **C3:** GET /api/players/by-id/:id for Dashboard
- **C4:** Challenge POST — challengerId from session, not request body
- **C5:** Challenge decline counting + auto-accept when quota reached
- **C6:** No-show auto-expiry (cron/scheduler, 7-day configurable)

### P2 — Data never written
- **C7:** matches POST → write to elo_history
- **C8:** seasons complete → write to season_champions
- **C9:** seasons complete → write to elo_history (reason: season_reset)
- **C10:** Match result → auto-update wins/losses/peakElo (verify this is correct)

### P3 — Settings ignored
- **C11:** calculateElo → read kFactor from ladderSettings
- **C12:** Challenge expiry → read from ladderSettings
- **C13:** Ladder display → read minMatchesForDisplay from ladderSettings

### P4 — Data shapes incomplete
- **C14:** events GET /:slug → include isPlayoff, playerAId, playerBId, ELO fields in matches
- **C15:** players GET /:riotId → include round/bracket fields in recentMatches
- **C16:** EventDetail participants → filter to confirmed only

### P5 — New schema + features
- **C17:** replay_submissions table + schema migration
- **C18:** POST /api/replays (accept .rofl upload, store to /data/replays/)
- **C19:** GET /api/replays/queue/next (render machine polling endpoint)
- **C20:** PATCH /api/replays/:id (render machine status update)
- **C21:** Auto-create VOD entries when render complete (linked to match)
- **C22:** Badge auto-awarding (first_blood, win_streak, veteran, climber, season_champion)
- **C23:** Notification service (web badge + email/Discord per notificationPreference)
- **C24:** ladderSettings new fields (decline limits, no-show expiry, playoff config)
- **C25:** Challenge decline counting logic (per-week, per-opponent tracking)

### P6 — Auth infrastructure
- **C26:** Discord OAuth implementation (replace localStorage stub)
- **C27:** RiotID validation against Riot API on registration
- **C28:** Player session (req.session.playerId) — protect challenge accept/decline/game-ready endpoints

