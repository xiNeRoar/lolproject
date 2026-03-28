# VCLoL — Product Requirements Document v3.0

**Version:** 3.0 | **Date:** March 2026 | **Status:** Active — .rofl format validated via roflxd.cs source code

---

## 1. Mission

Build the missing infrastructure between solo queue and organized competitive play — giving serious amateur League of Legends players a place to form teams, practice in structured scrims, accumulate a verified competitive record, and be discoverable.

Not profit-driven. A contribution to the esports ecosystem. Long-term vision: the platform where a player's organized team play resume lives — complementing OP.GG (solo queue resume) with something no tool currently provides.

---

## 2. The Gap We Fill

There is a documented, well-evidenced gap in the NA League of Legends competitive pipeline:

**Below us:** PlayVS serves high school and college players through school-sanctioned leagues. Players who graduate, lack a school program, or are independent have nowhere to go.

**Above us:** NACL (North American Challengers League) requires a stable 5-person roster to enter a 64-team open qualifier. Players need organized team experience to be competitive, but have no structured way to get it.

**The gap:** Independent Diamond+ players who want organized 5v5 team experience have no platform that helps them form teams, practice through scrims, and build a verifiable competitive record. They currently rely on fragmented Discord servers for LFG and scrim matching, with results disappearing into chat history.

**Evidence:**
- 100 Thieves' Poome: "There is actually NA talent, but not a lot of work is being done to scout people. There are promising players that are just Grandmaster or Master, but they can still be developed."
- Winter (4x Scouting Grounds qualifier): Retired because teams won't invest in developing amateur talent. Over 3 years of Scouting Grounds, only 5 attendees had strong LCS careers.
- 100 Thieves (one of NA's most scout-focused orgs) has exited competitive LoL entirely as of 2025.
- NA pro scene is contracting: LCS down to 8 teams, LTA experiment failed after one year, viewership declining 18-39% year-over-year.
- Meanwhile, 40,000+ players are active across LOL scrim Discord servers (Esport Scrim: 19,728 members; LoL Scrim Finder: 8,732; League of Legends Scrim NA: 6,640).

---

## 3. Target Users

**Primary — The Serious Independent Player**
Diamond+ (or aspiring), NA server. Plays ranked but wants structured 5v5 team competition. May or may not have pro aspirations. Wants to play organized scrims with committed teammates, track progress, and have something to show for it.

**Secondary — The Amateur Team Captain**
Organizes a team, schedules scrims on Discord, currently tracks results manually (if at all). Wants an easy way to record scrim results and maintain a team record.

**Tertiary — Scouts, Coaches, NACL Team Managers**
Looking for amateur talent with verifiable team play experience. Currently limited to solo queue rank and word-of-mouth.

**Out of Scope (Now)**
Casual players, players below Platinum, non-NA servers, other games (architecture will be game-agnostic for future expansion but launch is LoL-only).

---

## 4. Core Value Propositions

1. **Verified Scrim Records** — .rofl-parsed match results that cannot be faked. Champion, KDA, duration, winner — extracted from Riot's own replay format, not self-reported.

2. **Persistent Competitive Resume** — Every player accumulates a public profile showing their organized team play history across all teams: roles played, champion pool, aggregate KDA, win rate, ELO trajectory. This is the "team play resume" that OP.GG cannot provide.

3. **Spectator VOD Archive** — Every scrim automatically generates a permanent spectator-view video. Players can review macro, teamfights, and objectives. Within the two-week patch window, .rofl download enables free-camera POV review for detailed laning analysis.

4. **Zero-Friction Team Management** — Teams form, evolve, and go dormant naturally. Roster changes detected automatically from .rofl data. No one needs to "maintain" anything.

---

## 5. Product Architecture

**Discord Bot = Interaction Layer.** All user actions happen in Discord: register team, add players, submit match results, receive notifications. Users never need to leave Discord to use the platform.

**Website = Data & Display Layer.** Team profiles, player profiles, match details, VODs, leaderboard. Users visit the website to view data, not to perform actions. The only web-side actions are: link Riot ID (one-time), set profile visibility.

**Why this split:**
- Players are already in Discord for scrim coordination. Meeting them where they are eliminates adoption friction.
- Discord cannot provide persistent, publicly-accessible web profiles. A website can.
- This combination is what no existing tool offers: Team Up Bot has Discord ELO but no web profiles; Curry.gg has web profiles but no verified match data; Collision Time Bot has auto-detection but no persistent storage.

---

## 6. Key Flows

### 6.1 First-Time Team Registration (Discord, ~30 seconds)

```
Captain: /register-team VancouverStorm
Bot: ✅ Team "VancouverStorm" created. Team ID: #T-0042
     Add players: /add @player1 @player2 ...

Captain: /add @alex @bob @charlie @dave
Bot: ✅ 4 players added to VancouverStorm.
     Players will receive a DM to link their Riot ID for full stats tracking.
     You can /submit match results now — Riot ID linking is optional and doesn't block submissions.
```

Each added player receives a DM with a one-time web link to connect their Riot ID (verified via Riot API). This is non-blocking — match submissions work immediately.

### 6.2 Match Submission (Discord, ~75 seconds)

```
(After scrim ends)
Captain: /submit
Bot: Upload your .rofl file.
Captain: [drags and drops .rofl]
Bot: ⏳ Parsing...

Bot: ✅ Match recorded: VancouverStorm 1-0 PacificRift
     📊 Duration: 32:14
     🏆 MVP: alex (Orianna) — 8/2/11

     Stats parsed for 8/10 players.
     ⚠️ 2 unknown players:
       • SummonerX — Add to VancouverStorm? ✅ / ❌
       • SummonerY — Add to PacificRift? ✅ / ❌

     🎬 Spectator VOD entering render queue (ETA: ~35 min)
     📥 .rofl available for download: [link]
```

### 6.3 Viewing Data (Website)

- **Team Profile:** Team name, ELO, W/L, roster (current + historical), match history, VOD archive. Visibility controlled by team captain.
- **Player Profile:** All teams played for, aggregate stats across teams (champion pool, KDA, win rate), ELO trajectory, role(s). Default public (player can set private).
- **Match Detail:** Per-player stats, champion picks, spectator VOD, .rofl download (2-week window). Visibility controlled by team.
- **Leaderboard:** All active teams ranked by team ELO. Only shows teams with minimum N matches.

---

## 7. Visibility & Privacy

Design principle: **Team strategy is private. Individual competitive identity is public.**

### Player Profile (player controls)
- **Default: Public.** Aggregate stats (champion pool, KDA, win rate, ELO trajectory, teams participated in, total organized matches played).
- Player can set to private if desired.
- Rationale: Users join this platform to build a visible competitive record. Default-public aligns with the core value proposition.
- Aggregate stats do not expose specific match strategy — they show "this person mains Orianna and has a 58% win rate across 47 scrims," not "this person picked Orianna against Team X last Tuesday."

### Match Details (team controls, per-match)
- **Default: Private.** Specific champion picks, draft, per-player KDA, VOD for that match visible only to the two participating teams.
- Team captain can set individual matches to **Public** (e.g., showcase matches, tournament games).
- **Team-only stats** option: W/L visible publicly, but specifics hidden.
- ELO changes always count regardless of visibility setting — leaderboard always reflects true competitive standing.

### Riot Policy Compliance
This design satisfies Riot's requirement: "Third party sites may not publicly display a player's match history from the custom match queue unless the player opts in." Players opt in by registering. Match-level details require additional team-level opt-in to make public.

---

## 8. Team Lifecycle

Design principle: **No explicit lifecycle management. .rofl data is the source of truth for all roster and activity state.**

### Activity
- Team with a match submitted within the last 30 days = **Active** (appears on leaderboard).
- Team with no match in 30+ days = **Inactive** (removed from leaderboard, profile still accessible, historical data preserved).
- Inactive team that submits a new match = automatically **Active** again.

### Roster Changes
- New player appears in .rofl but not in roster → Bot asks captain to confirm addition.
- Existing roster member absent from N consecutive .rofl submissions → automatically marked **Inactive member**.
- No `/remove` or `/disband` commands needed. Roster state is derived from actual match participation.

### Player Career History
- A player's profile shows all teams they've been part of, with stats per team.
- Changing teams doesn't erase history — it adds a new chapter.
- One player can be active in multiple teams simultaneously.

---

## 9. VOD Pipeline

### Automatic (every match)
1. .rofl uploaded → metadata parsed (instant, ~3 seconds)
2. .rofl file stored on VPS → available for download for ~2 weeks (patch window)
3. Match enters render queue → render machine (Windows PC) polls queue
4. Render machine loads .rofl → spectator auto-camera view → records → uploads
5. Permanent spectator VOD linked on match detail page

### On-Demand (player requests)
- Each player has a "Request My POV" button on match detail page.
- Capped at 2-3 POV renders per match, first-come-first-served.
- Enters same render queue, processed by same render machine.

### Capacity Planning
- 1 spectator video per match: ~35 minutes render time
- 5 scrims/day = ~3 hours render time (overnight batch)
- 2-3 on-demand POVs/day = ~1.5 hours additional
- Total: ~4.5 hours/day — one Windows PC handles this comfortably

### .rofl vs. Rendered Video (why both matter)
- **.rofl (2-week window):** Superior for detailed review — free camera, slow motion, fog of war toggle, zoom. Best for laning phase analysis, individual mechanics review.
- **Spectator video (permanent):** Captures macro, teamfights, objectives via Riot's AI-directed camera. Permanent reference after .rofl expires.
- **On-demand POV video (permanent):** For high-demand matches or players who want permanent record of their individual POV.

### Learning & Discovery (Phase 2, volume-dependent)
- Players can browse other teams/players and watch their public match VODs.
- High-ELO players' public matches serve as learning material for lower-ELO players.
- Platform tracks which profiles/matches get most views → selectively render more POVs for high-demand content.

---

## 10. Technical Architecture

### Stack (existing, reusable)
- **Frontend:** React + Vite + Wouter (SPA), Shadcn UI + Tailwind CSS v4
- **Backend:** Express.js REST API + TypeScript
- **Database:** PostgreSQL + Drizzle ORM
- **API Contract:** OpenAPI spec → Orval codegen → React Query hooks
- **Deployment:** Oracle Cloud ARM64 VPS, Portainer UI
- **Render Machine:** User's Windows PC (separate from VPS)

### New Components
- **Discord Bot:** discord.js, hosted on same VPS or separate lightweight service
- **.rofl Parser:** Node.js service reading ROFL2 metadata header (JSON, no encrypted payload)
- **File Storage:** .rofl files stored on VPS `/data/replays/{matchId}/`

### Data Flow
```
Discord Bot ←→ Express API ←→ PostgreSQL
                    ↑
              .rofl upload → Parser → match_players + match result
                    ↓
              Render Queue → Windows PC polls → YouTube upload → VOD linked
```

### Development Workflow (unchanged)
Schema change → OpenAPI spec update → Orval codegen → Express route → React page using generated hooks. Never write frontend API calls by hand.

---

## 11. Schema Changes from v2

### New Tables
```
teams: id, name, tag, captainDiscordId, teamElo, wins, losses, createdAt, lastMatchAt, isActive
team_members: id, teamId, playerId, role, joinedAt, lastActiveAt, isActive
match_players: id, matchId, playerId, teamId, champion, kills, deaths, assists, cs, role, side
```

### Modified Tables
```
matches: remove playerAId/playerBId, add teamAId/teamBId, keep gameId/resultSource
players: add primaryRole, secondaryRole, discordId (already planned)
elo_history: add teamId (nullable — team ELO changes)
```

### Removed Concepts
- challenges table (1v1 challenge system — removed entirely)
- Individual ELO as primary ranking (replaced by team ELO; individual stats become aggregate secondary data)
- matchmaking_queue (not needed)

### Preserved
- seasons, season_champions, player_badges (reframed for team context)
- replay_submissions (core of .rofl pipeline)
- vod_entries (linked to matches)
- events, registrations (for periodic tournaments)
- notifications (scrim confirmed, match recorded, etc.)
- admin tables and tools

---

## 12. Technical Risks & Mitigations

### Risk 1: .rofl ROFL2 metadata may not contain needed fields
- **Impact:** Critical — without champion/KDA data, platform has no verified individual stats.
- **Mitigation:** Phase 0 validation — download a current-patch .rofl, run parser, confirm fields. Go/no-go decision.
- **Fallback:** If metadata insufficient, explore Collision Time Bot's approach (Riot Match API auto-detection via linked Riot accounts + Development API key for non-custom data).

### Risk 2: Riot changes .rofl format again
- **Impact:** High — parser breaks, no new match data until fixed.
- **Mitigation:** Community parsers (fraxiinus/roflxd.cs) have historically adapted within days of format changes. Monitor ReplayBook GitHub for updates.
- **Long-term fix:** RSO + Match API (official, format-stable). Requires Production API Key → apply after platform has users and is deployed.

### Risk 3: .rofl metadata parsing legality (grey area)
- **Impact:** Medium — Riot's policy states "reverse engineering spectator files is against ToS" but this refers to encrypted payload, not plaintext metadata header. Community tools (ReplayBook) have operated for years without action.
- **Mitigation:** When applying for Production API Key, explicitly ask Riot about metadata header parsing. Migrate to RSO + Match API when approved.

### Risk 4: Cold start — not enough teams
- **Impact:** High — leaderboard meaningless with <5 teams.
- **Mitigation:** Discord bot designed to be added to any server. Target existing scrim Discord servers (40,000+ members across NA). Bot provides immediate value (match recording) without requiring critical mass on the platform itself.

---

## 13. Competitive Landscape

| Platform | What it does | What it doesn't do |
|----------|-------------|-------------------|
| OP.GG / U.GG | Solo queue stats from Riot API | No custom game / scrim data, no team context |
| Challonge / Challengermode | Tournament brackets, event management | No persistent team record, no verified results, no VOD |
| Curry.gg | LFG, team finder, scrim finder | Scrim finder empty ("No scrims to book"), no post-match recording |
| Team Up Bot | Discord ELO leaderboard (manual entry) | No verification, no web profiles, no individual stats, no VOD |
| Collision Time Bot | Auto-detect match results, scouting reports | Private, single-team, no persistent storage, resets on restart |
| Insights.gg | Gameplay recording + VOD review tool | Requires each player to install app, no competitive record / ELO |
| PlayVS | School-sanctioned esports leagues | School-only, no independent players, no portable record |
| Discord scrim servers | LFG + scrim matching (40,000+ users) | Results vanish in chat history, no tracking, no verification |
| **This platform** | Verified scrim recording, persistent team + player profiles, spectator VOD, team ELO leaderboard | Not an LFG tool, not a scrim matcher, not a tournament host (initially) |

**Our unique position:** The only platform that captures what happens AFTER the scrim — verified results, persistent records, VODs — while every existing tool focuses on what happens BEFORE (finding people, matching teams, scheduling).

---

## 14. Events (Secondary Feature, Preserved)

The existing Events system (ManageEvents, EventDetail, bracket components) is preserved for periodic tournaments.

**Role:** Events are not the daily activity of the platform. They are community moments — a quarterly or monthly tournament that gives teams a concrete goal to practice toward.

**How it connects:**
- Tournament seeding based on team ELO from the leaderboard (automated, data-driven).
- Tournament matches submitted via same .rofl flow → same verified results → same VOD pipeline.
- Tournament results count toward team ELO and player profiles.
- Bot pushes tournament announcements to all servers where the bot is installed.

**Future potential:** Sponsored tournaments as monetization channel. A tournament with verified brackets, automated seeding, and spectator VODs is significantly more attractive to sponsors than a Discord-only bracket.

---

## 15. Execution Roadmap

### Phase 0 — Validate .rofl Parsing (1 week)
- Download current-patch .rofl from a custom game
- Test with existing parser libraries (fraxiinus/roflxd or community Python parsers)
- Confirm ROFL2 metadata contains: winning team, player names, champions, KDA, game duration
- **Go/no-go decision point**

### Phase 1 — Discord Bot MVP (2-3 weeks)
- `/register-team`, `/add`, `/submit` (upload .rofl), `/profile`
- .rofl metadata parsing → match result recording
- Basic team + player data in PostgreSQL
- Bot can be added to any Discord server

### Phase 2 — Web Display Layer (2-3 weeks)
- Team profile page, player profile page, match detail page
- Team leaderboard
- .rofl download link (2-week window)
- Minimal but functional UI (reuse existing component library)

### Phase 3 — VOD Pipeline (2 weeks)
- Render queue system (reuse existing replay_submissions schema)
- Windows render machine polling + spectator video generation
- VOD linked to match detail page
- On-demand POV request system

### Phase 4 — Community Seeding (ongoing)
- Join top NA scrim Discord servers, observe, build relationships
- Pitch bot to server owners: "Your scrim results are disappearing. This bot captures them for free."
- Target: 10 active teams within first 2 months

### Phase 5 — Riot API Integration (after Phase 4 traction)
- Deploy platform publicly
- Apply for Riot Production API Key with functioning app + user base
- Upon approval, apply for RSO integration
- Migrate from .rofl-only to RSO + Match API (auto-detect custom game results, no manual upload needed)
- .rofl upload remains as supplementary option

### Phase 6 — Growth & Events
- First community tournament (use existing Events system)
- Bot in 10+ Discord servers, organic spread
- Learning/discovery features (browse high-ELO player VODs)
- Evaluate expansion to other games based on demand

---

## 16. Success Metrics

- **Phase 1-2:** Bot functional, 3+ teams registered, first .rofl successfully parsed and recorded
- **Phase 4:** 10+ active teams, 50+ matches recorded, at least 1 scrim Discord server owner approves bot
- **Phase 5:** Riot Production API Key application submitted with evidence of real usage
- **6 months:** 25+ active teams, 200+ matches recorded, leaderboard has competitive meaning
- **12 months:** Platform referenced by at least one amateur player or team as part of their competitive identity

---

## 17. What This Platform Is NOT

- **Not a replacement for solo queue or ranked.** We track organized team play, not matchmade games.
- **Not an LFG platform.** We don't compete with Discord for team finding. Discovery happens through browsing team/player profiles on the website.
- **Not a scrim matchmaker.** We don't compete with Discord for scrim scheduling. Teams continue using Discord servers to find opponents.
- **Not a tournament platform.** We don't compete with Challonge for bracket management (though we preserve Events for periodic community tournaments).
- **Not an official ranking system.** Our team ELO is a community leaderboard, not a substitute for Riot's ranked ladder.
- **Not a guaranteed path to pro play.** We enable visibility and verifiable records, but scouting is never promised.
