# VCLoL — Product Requirements Document v3.1

**Version:** 3.1 | **Date:** March 2026 | **Status:** Active — Strategic redesign (ELO, Privacy, Identity)

**Changes from v3.0:** Scrim ELO removed (tournament/event only). 3-layer privacy model for Riot compliance. RSO as launch requirement. /add + /link-riot deleted. /connect added. Player career = resume model.

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
- 100 Thieves' Poome: "There is actually NA talent, but not a lot of work is being done to scout people."
- Winter (4x Scouting Grounds qualifier): Retired because teams won't invest in developing amateur talent.
- 100 Thieves has exited competitive LoL entirely as of 2025.
- NA pro scene contracting: LCS down to 8 teams, LTA experiment failed, viewership declining 18-39% YoY.
- 40,000+ players active across LOL scrim Discord servers (Esport Scrim: 19,728; LoL Scrim Finder: 8,732; LoL Scrim NA: 6,640).

---

## 3. Target Users

**Primary — The Serious Independent Player**
Diamond+ (or aspiring), NA server. Wants structured 5v5 team competition, tracked progress, and something to show for it.

**Secondary — The Amateur Team Captain**
Organizes a team, schedules scrims on Discord, currently tracks results manually (if at all).

**Tertiary — Scouts, Coaches, NACL Team Managers**
Looking for amateur talent with verifiable team play experience.

**Out of Scope (Now)**
Casual players, players below Platinum, non-NA servers, other games.

---

## 4. Core Value Propositions

1. **Verified Scrim Records** — .rofl-parsed match results that cannot be faked. Champion, KDA, duration, winner — extracted from Riot's own replay format, not self-reported.

2. **Persistent Competitive Resume** — Every player accumulates a profile showing their organized team play history across all teams: roles played, champion pool, aggregate KDA, win rate. Not a single ELO number — a full career record showing which teams, what roles, what results. The "team play resume" that OP.GG cannot provide.

3. **Spectator VOD Archive** — Every scrim automatically generates a permanent spectator-view video. Players can review macro, teamfights, and objectives. Within the two-week patch window, .rofl download enables free-camera POV review.

4. **Zero-Friction Team Management** — Teams form naturally from .rofl data. Captain submits replay → teammates auto-identified and added. Cross-server. No manual roster maintenance needed.

---

## 5. Product Architecture

### Identity Foundation: RSO (Riot Sign On)

**RSO is a launch requirement, not a future phase.** Every player who claims a VCLoL profile must verify their Riot Account through RSO OAuth. This guarantees zero impersonation — PUUID returned by Riot is cryptographically verified and cannot be faked.

The RSO verification flow is a one-time browser redirect:
1. Player runs `/connect` in Discord (or clicks link on website)
2. Browser opens → Riot login page → player authenticates
3. Riot returns PUUID to VCLoL → player record verified
4. Player returns to Discord → all commands unlocked

This is identical to how every app handles "Login with Google" — expected behavior, not friction.

### Discord Bot = Convenience Feature

The bot reduces friction for daily operations. Players discover VCLoL through the bot in their scrim server. `.rofl` submission is bot-only (preserving the viral loop). But the bot is not the identity layer — RSO is.

**Bot responsibilities:** .rofl submission, match result announcements, quick stats lookup, team management commands, visibility settings.

**Bot does NOT do:** Identity verification (RSO), player profile management (website), detailed analytics (website).

### Website = Identity + Management + Display Layer

The website is where identity verification happens (RSO OAuth callback), where players manage their profiles, and where all data is displayed with appropriate privacy gates.

### Why `.rofl` submission stays bot-only

- Players are already in Discord immediately after a scrim — no context switch
- Each public `/submit` is visible to all server members → organic growth mechanism
- If web upload were equally convenient, captains would bypass Discord and the viral loop breaks

---

## 6. Key Flows

### 6.1 First-Time Setup (~2 minutes, one-time)

```
Captain in any Discord server with VCLoL bot:

Captain: /connect
Bot: 🔗 Verify your Riot Account to get started:
     https://vclol.gg/connect?token=abc123
     (link expires in 10 minutes)

Captain clicks link → browser opens →
  → "Login with Discord" (links Discord account)
  → "Connect Riot Account" → auth.riotgames.com login
  → ✅ Verified as xiNe#NA1! You can close this tab.

Back in Discord:
Captain: /register-team VancouverStorm VCS
Bot: ✅ Team "VancouverStorm" [VCS] created! Ready to /submit.
```

### 6.2 Match Submission (~30 seconds, every scrim)

```
Captain: /submit [drags and drops .rofl]
Bot: ⏳ Parsing...

Bot: ✅ Match recorded: VancouverStorm vs PacificRift
     📊 32:14 | MVP: alex (Orianna) — 8/2/11
     4 new players added to VancouverStorm ✅
     🎬 VOD entering render queue (ETA: ~35 min)
```

Teammates auto-added from .rofl (PUUID + RiotId). No /add needed. Cross-server. Teammates claim their profile later via /connect or website RSO.

### 6.3 Viewing Data (Website)

**Public (anyone, no login):**
- Team profiles: name, tag, W/L record, roster (opt-in members show RiotId)
- Team leaderboard (W/L record; tournament ELO when available)
- Match results: Team A vs Team B, score (no per-player stats for scrims)
- Tournament/Event match details: full 10-player stats (public by design)

**Logged in + match participant:**
- Full match detail with all 10 players' stats (same as LoL client behavior)
- Own aggregate stats (career KDA, champion pool, team history)

**RSO opt-in player (profile set to public):**
- Profile searchable by other users
- Aggregate stats publicly visible
- Visibility settings: public / private / participants-only

---

## 7. Privacy & Riot Policy Compliance

### Riot's Core Policy

> "Products may not publicly display a player's match history from the custom match queue unless the player opts in."
> "Leaderboards or rankings based off of a third party platform's community tournaments or challenges that would not reasonably be interpreted as official are allowed."

### 3-Layer Privacy Model

#### Layer 1 — Scrim (.rofl Upload)

Custom game data is **private by default**.

**Discord bot (semi-private context):**
- Scoreboard in Discord channel shows all 10 players ✅ (all players just played together, server-members-only)
- `/stats` shows invoker's own stats ✅
- `/stats player OtherPerson#TAG` only shows data if OtherPerson has opted in

**Website:**
- Match detail: login + participant → all 10 players' full stats ✅ (identical to LoL client)
- Match detail: non-participant → Team A vs Team B + score only
- Player profile: visible only to self (until opt-in)
- Team aggregate (name, W/L, roster) → always public

#### Layer 2 — RSO Opt-in (Player Consent)

Opt-in players choose to make their profile public.

**Unlocks:** Profile searchable. Aggregate stats visible. Their row in match details visible to non-participants. Other non-opted players in same match stay masked.

**Visibility settings (website + Discord `/visibility`):**
- `public` — anyone can see profile + match history
- `private` — only the player themselves
- `participants-only` — only same-match players

#### Layer 3 — Tournament Code (Public by Design)

Players enter tournament code in lobby = implicit consent to organized competition.

**All tournament match data public by default.** Full 10-player stats, ELO changes, VODs. Captain can override to private.

### What This Protects

- ✅ Player A cannot search Player B's scrim history (unless B opted in)
- ✅ Player A views own match → sees all 10 players (same as LoL client)
- ✅ Team aggregate (W/L, ELO from tournaments) on leaderboard
- ✅ Tournament match data fully public

---

## 8. Rating & Ranking System

### Design Principles

**Scrim ≠ Ranked.** Industry standard (FACEIT, ESEA, PlayVS): practice never counts toward ranking.

**Team ELO, not player ELO.** ELO belongs to the team entity. Players have career stats (resume), not a rating number.

### What Counts

| Match Type | ELO? | Reason |
|---|---|---|
| Scrim (.rofl) | ❌ | Opponent may not be in system. Can be gamed. Practice shouldn't penalize experimentation. |
| Tournament Code | ✅ | Riot auto-callback. Both teams in system. Verified. Cannot be gamed. |
| VCLoL Event | ✅ | Admin managed. Integrity guaranteed. |

### Scrim W/L Record

Always tracked on .rofl submission. Visible on team profile. Used for launch leaderboard. NOT used for ELO.

### Player Career (Resume Model)

No individual ELO. Player profile shows career history per team: W/L, KDA, champion pool. Changing teams adds a new chapter — doesn't erase history.

### Seasons

Tied to tournament/event series, not calendar. Seasons only exist when VCLoL runs organized competitions. Include: ELO tracking, season champion, ELO soft reset, badges.

### Badges

| Badge | Criteria | Requires ELO? |
|---|---|---|
| Win Streak | 5+ consecutive wins | No |
| Season Champion | #1 ELO at season end | Yes |
| Veteran | 50+ matches | No |
| Iron Will | Win after 5+ kill deficit at 15 min | No |

---

## 9. Team Lifecycle

### Roster Building

Primary: .rofl auto-discovery. Captain submits replay → bot identifies teammates via PUUID → captain confirms → `status:'active'`. Works cross-server. Teammates don't need Discord. They claim profile later via /connect or website RSO.

### Activity
- Match within 30 days = **Active** (on leaderboard)
- 30+ days no match = **Inactive** (off leaderboard, data preserved)
- New match = automatically **Active** again

### Roster Changes
- New player in .rofl → bot asks captain to confirm
- Absent from N consecutive matches → auto-marked inactive member
- `/remove` for manual removal. `/leave` for voluntary departure.

---

## 10. VOD Pipeline

### Automatic (every match)
1. .rofl uploaded → parsed → stored on VPS (2-week download window)
2. Render queue → Windows PC → spectator auto-camera → upload
3. Permanent VOD linked on match detail page

### On-Demand POV
- "Request My POV" button on match detail. 2-3 per match, first-come.
- POV requires player RSO opt-in consent.

### VOD Visibility
- Scrim: login + participant. Captain can set public.
- Tournament/Event: public by default. Captain can override to private.
- POV: always requires individual player consent regardless of match visibility.

---

## 11. Identity & Authentication

### RSO — Launch Requirement

Zero impersonation tolerance. Every profile claim requires RSO.

**Via bot:** `/connect` → bot sends URL → browser: Discord OAuth + RSO OAuth → verified.

**Via website:** vclol.gg → "Login with Discord" → "Connect Riot Account" → RSO → verified.

**Without Discord:** vclol.gg → "Login with Riot Account" → RSO → can view stats, no Discord DM.

### Unverified Players (.rofl Auto-Discovery)

.rofl submission creates player records with PUUID + RiotId. These exist but are unclaimed:
- Stats recorded. Appear on Discord scoreboard. Appear in match detail for participants.
- NOT searchable. NOT public profile. Can be claimed later.

### Pre-Launch (Riot Application)

Build complete site + bot. RSO button shows "pending Riot approval." Placeholder data. Submit to Riot. Upon approval → swap credentials → launch.

---

## 12. Schema Changes from v3.0

### New Columns
- `matches.matchType` — `scrim | ranked_tournament | event` (default: scrim)
- `matches.tournamentCode` — nullable text
- `players.rsoOptIn` — boolean default false
- `players.rsoAccessToken`, `rsoRefreshToken`, `rsoLinkedAt` — RSO session
- `players.profileVisibility` — default changed from `"public"` to `"private"`

### New Table
- `auth_sessions` — token, discordId, expiresAt, completedAt, puuid

### Changed
- `vod_entries.playerEloAtTime` → `teamEloAtTime` or removed

### Removed Concepts
- ELO calculation on scrim submission
- `eloHistory` entries with reason `registration`
- `/add` command
- `/link-riot` command (trust-based verification)

---

## 13. Technical Risks & Mitigations

1. **.rofl fields** — VALIDATED via roflxd.cs. Remaining: confirm in real .rofl file.
2. **.rofl format change** — Community parsers adapt quickly. Long-term: Tournament API.
3. **.rofl parsing legality** — Grey area. Ask Riot directly when applying.
4. **Cold start** — Bot in scrim servers provides immediate value without critical mass.
5. **RSO application rejected** — Riot accepts prototypes/mockups. Apply early.
6. **Low opt-in rate** — Platform value exists without opt-in (team W/L, captain's match history).

---

## 14. Bot Commands (Final)

**Core:** `/register-team`, `/submit`, `/stats`, `/roster`, `/connect`
**Management:** `/visibility`, `/transfer-captain`, `/leave`, `/remove`
**Situational:** `/register-event`, `/claim-match`
**Deleted:** ~~/add~~ (→ .rofl auto-discovery), ~~/link-riot~~ (→ RSO /connect)

---

## 15. Execution Roadmap

1. **Pre-Launch:** Build complete platform (site + bot + RSO UI placeholder). Deploy to real domain.
2. **Riot Application:** Submit site for Production Key. Upon approval, get RSO client.
3. **Launch:** RSO live. Target scrim Discord servers. First teams register.
4. **Growth:** Tournament API (ELO activates). First VCLoL event. VOD pipeline. Organic bot spread.

---

## 16. Success Metrics

- **Pre-Launch:** Site + bot deployed. Riot application submitted.
- **Launch:** RSO live. 3+ teams. First .rofl parsed.
- **Month 1:** 10+ teams. 50+ matches. 1 scrim server approves bot.
- **Month 3:** First tournament (ELO live).
- **Month 6:** 25+ teams. 200+ matches.
- **Year 1:** Referenced by amateur player/team as competitive identity.

---

## 17. What This Platform Is NOT

- Not a replacement for solo queue or ranked
- Not an LFG platform (Discord handles team finding)
- Not a scrim matchmaker (Discord handles scheduling)
- Not primarily a tournament platform (Events are periodic, not daily)
- Not an official ranking system (community leaderboard, not Riot substitute)
- Not a guaranteed path to pro play

---

## 18. UX/UI Recommendations for Replit

### New Pages
1. **RSO Connect page** — Discord + Riot avatar side-by-side after link. Disclaimer about data visibility.
2. **Pre-RSO landing** — Explain VCLoL, show example profiles, CTA to connect.

### Redesigned Pages
3. **Player profile** — Career resume layout. Teams as timeline. Per-team stats. Opt-in gate with CTA.
4. **Match detail** — Auth gate for scrims (Team A vs B public, stats gated). Tournament: fully public.
5. **Leaderboard** — W/L record board. Filter tabs for tournament-ranked when available.
6. **Team profile** — W/L prominent. ELO only if tournament data exists. Linked vs unlinked members.

### Design Principles
- Empty states matter — design for W/L as primary data, not ELO
- Privacy gates should feel natural ("Login to see details"), not blocking
- RSO connect = reward unlock ("See your stats, appear in search"), not a chore
- Bot `/submit` embed: no ELO. Focus on result + MVP + auto-add
