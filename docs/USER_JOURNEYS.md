# VCLoL — User Journey Contract

**Purpose:** Every page design, every API endpoint, every bot command must serve one of these journeys.
If a feature doesn't appear in this document, it doesn't get built.

**Rule:** Each journey has a maximum step count. If implementation exceeds it, redesign — don't add steps.

---

## Stakeholders

| ID | Who | Primary motivation |
|----|-----|--------------------|
| S1 | Anonymous Visitor | Clicked a match/team/player link from Discord. Evaluating whether to join. |
| S2 | Registered Player (non-captain) | Wants to track personal performance and review VODs. |
| S3 | Team Captain | Manages their team, controls match privacy, monitors roster. |
| S4 | Scout / Coach / NACL Manager | Evaluating amateur talent with verifiable team play records. |
| S5 | Platform Admin | Maintains platform health, handles edge cases. |
| S6 | Discord Server Owner | Deciding whether to add the bot to their scrim server. |

---

## Journeys

### S1 — Anonymous Visitor

#### J-01: Arrive via Discord match link, understand what I'm seeing
**Entry:** `vclol.gg/matches/42` (link posted by bot in Discord)
**Max steps:** 1
**Journey:**
1. MatchDetail page is self-explanatory: shows teams, result, stats, AND a "What is VCLoL?" micro-explainer

**Current state:** ⚠️ Needs v3.1 update. Scrim matches: non-participants see Team A vs B + score only (no per-player stats). Tournament matches: fully public. Auth gate required (#8 redaction logic needs updating for 3-layer privacy).

---

#### J-02: Discover platform and decide to join
**Entry:** Any public page
**Max steps:** 3
**Journey:**
1. Read what VCLoL does (explainer on any page)
2. Go to /register — see bot guide + Discord invite link
3. Add bot to their server

**Current state:** ⚠️ Needs v3.1 update. /register page needs update: remove /link-riot reference, add /connect + RSO flow explanation. Step 3 adds bot → Step 3.5 run /connect to verify Riot Account.

---

#### J-03: Find a specific player or team
**Entry:** Any page
**Max steps:** 2
**Journey:**
1. Use search bar (global search)
2. Land on PlayerProfile or TeamProfile

**Current state:** ⚠️ Needs v3.1 update. Player search must only return RSO opt-in players (rsoOptIn=true). Non-opted players invisible in search. Team search unaffected (team aggregate always public).

---

### S2 — Registered Player (non-captain)

#### J-04: See my recent match performance after a scrim
**Entry:** Login → Dashboard
**Max steps:** 2
**Journey:**
1. Login via Discord OAuth → land on Dashboard
2. Dashboard shows recent matches directly (no extra navigation)

**Current state:** ✅ Dashboard shows recent matches directly. Captain onboarding checklist for new captains (#68). #16 done.

---

#### J-05: Watch VOD of my last match
**Entry:** Dashboard
**Max steps:** 3
**Journey:**
1. Dashboard → see recent matches list
2. Click match → MatchDetail
3. VOD thumbnail card visible on MatchDetail → click → VodDetail (/watch/:id)

**Current state:** ✅ Dashboard → recent match → MatchDetail → VOD thumbnail → VodDetail. MatchDetail shows thumbnail grid (not inline embeds); VodDetail is the sole video player. Route renamed /vods/:id → /watch/:id by Replit (#108 architecture).

---

#### J-06: Request a POV render for my match
**Entry:** MatchDetail page
**Max steps:** 1 (already on page)
**Journey:**
1. Click "Request My POV" button on MatchDetail

**Current state:** ✅ POV button is now inline in the player stats table row (contextual, per player). Replit #124 moved it from the match header to each player's row.

---

#### J-07: Verify my Riot Account (claim my profile)
**Entry:** Discord (any server with VCLoL bot) or website
**Max steps:** 2
**Journey (Discord path):**
1. `/connect` → bot sends one-time link
2. Click link → browser: Discord OAuth + RSO OAuth → verified

**Journey (website path):**
1. Visit vclol.gg → "Login with Discord" → "Connect Riot Account"
2. RSO OAuth → Riot login → redirect back → verified

**Current state:** ⚠️ /connect command built (#191). Website RSO OAuth handler not yet built. Replaces /link-riot (deleted — trust-based = impersonation risk).

---

#### J-08: See my competitive resume (for sharing with scouts)
**Entry:** `/players/RiotName`
**Max steps:** 1
**Journey:**
1. Share URL. PlayerProfile shows: career resume (teams played for, per-team W/L + KDA), champion pool with portrait icons, match dates, VODs. Only visible if player has opted in via RSO.

**Current state:** ⚠️ Needs v3.1 update. Remove ELO trajectory. Add career resume layout (per-team stats). Add RSO opt-in gate: profile only visible to others if player opted in. Non-opted profiles show "This player has not linked their account."

---

### S3 — Team Captain

#### J-09: Set a single match to public after a scrim
**Entry:** Dashboard or Captain Hub
**Max steps:** 2
**Journey:**
1. Go to Captain Hub (`/teams/:id/manage`) — linked from "Manage Team" in nav dropdown
2. Match list shows inline visibility toggle per row → click → done

**Current state:** ✅ Dashboard → CaptainHub → inline toggle per match row = 2 steps. "Manage Team" button visible on TeamProfile for captains (#62). #14 + #15 done.

---

#### J-10: Set all future matches to private by default
**Entry:** Captain Hub
**Max steps:** 2
**Journey:**
1. Captain Hub → Team Settings section
2. Toggle "Default Match Visibility" → Private → Save

**Current state:** ✅ CaptainHub → Team Settings → Default Match Visibility dropdown. #14 + #15 done.

---

#### J-11: Bulk-set all matches from an event to public
**Entry:** Captain Hub
**Max steps:** 3
**Journey:**
1. Captain Hub → Match Visibility section
2. Filter by event
3. Select all → "Set Public" → confirm

**Current state:** ✅ CaptainHub → Match Visibility section → checkbox select → bulk set. #14 + #15 done.

---

#### J-12: See all my team's VODs in one place
**Entry:** TeamProfile page
**Max steps:** 1
**Journey:**
1. TeamProfile Recent Matches section links to /watch?teamId=N for full VOD archive

**Current state:** ✅ TeamProfile VODs section removed (Replit #108 architecture — VodDetail is sole video player). Team VODs accessible via Watch page (/watch) with team filter. Step count unchanged: 1 step from TeamProfile to team VODs via Watch page.

---

#### J-13: Add a new player to my roster
**Entry:** Automatic via .rofl submission
**Max steps:** 1
**Journey:**
1. Captain `/submit` .rofl → bot auto-identifies teammates via PUUID → captain confirms ✅ per player → added to roster with status active

Cross-server: teammates don't need to be in same Discord server. Teammates claim their profile later via `/connect` or website RSO.

**Current state:** ⚠️ Needs v3.1 update. /add command deleted (#191). .rofl auto-discovery with captain confirmation buttons is the only path. CaptainHub web "Add Member" needs removal or redesign.

---

#### J-14: Transfer captain to another player
**Entry:** Discord (primary) or Captain Hub (secondary)
**Max steps:** 1 (Discord) / 3 (web)
**Journey (Discord):**
1. `/transfer-captain @player`

**Journey (web):**
1. Captain Hub → Team Settings
2. "Transfer Captain" → select player → confirm

**Current state:** ✅ Bot /transfer-captain built (#4). CaptainHub Transfer Captain section with confirmation (#14, #15).

---

#### J-15: Know which teammates haven't linked their Riot ID
**Entry:** Captain Hub
**Max steps:** 1
**Journey:**
1. Captain Hub → Roster section shows RSO verification status per member (✅ verified / ⚠️ unlinked)

**Current state:** ⚠️ Needs v3.1 update. Change indicator from /link-riot status to RSO verification status. ✅ = RSO verified (puuid set). ⚠️ = unverified (auto-added from .rofl).

---

### S4 — Scout / Coach / NACL Manager

#### J-16: Find Diamond+ mid laners with 50+ games of organized play
**Entry:** `/players`
**Max steps:** 2
**Journey:**
1. Players page — filter by role: Mid
2. Scan list showing: riotId, team, games played, win rate — shortlist candidates

**Current state:** ⚠️ Needs v3.1 update. Players page must only show RSO opt-in players. Non-opted players invisible. Add note: "Only players who have verified their Riot Account appear here."

---

#### J-17: Verify a player's team play record
**Entry:** `/players/RiotName`
**Max steps:** 1
**Journey:**
1. PlayerProfile shows: all teams, aggregate stats, champion pool, public VODs

**Current state:** ⚠️ Needs v3.1 update. Profile only visible if player opted in. Non-opted: show placeholder page with CTA to /connect.

---

#### J-18: Watch a player's VOD to assess mechanics
**Entry:** PlayerProfile
**Max steps:** 2
**Journey:**
1. PlayerProfile → VODs section
2. Click VOD → VodDetail (/watch/:id) with embedded video

**Current state:** ✅ Works if VODs are public (dependent on team visibility setting). Route renamed /vods/:id → /watch/:id.

---

### S5 — Platform Admin

#### J-19: See platform health at a glance
**Entry:** `/admin`
**Max steps:** 1
**Journey:**
1. Dashboard shows: active teams, matches recorded, bot online status, render queue status, recent admin actions

**Current state:** ✅ Complete. Bot status, render queue, recent admin actions all present in Admin Dashboard.

---

#### J-20: Handle a banned player appeal
**Entry:** `/admin/players`
**Max steps:** 3
**Journey:**
1. ManagePlayers → find player → view ban history
2. Review reason
3. Lift ban → confirm

**Current state:** ✅ Complete. Ban button + dialog in ManagePlayers and ManageTeams. Lift ban via admin panel.

---

#### J-21: Assign a new captain to an orphaned team
**Entry:** `/admin/teams`
**Max steps:** 3
**Journey:**
1. ManageTeams → find team (filter: no captain)
2. Edit team → assign captainPlayerId
3. Save

**Current state:** ManageTeams exists with edit form. Works. ✅

---

### S6 — Discord Server Owner

#### J-22: Evaluate whether to add VCLoL bot to my scrim server
**Entry:** Heard about VCLoL from another server / saw bot in action
**Max steps:** 3
**Journey:**
1. Visit vclol.gg — see: what it does, how many teams are using it, what bot commands look like
2. Visit /register — see bot guide and install instructions
3. Click "Add Bot to Discord" → OAuth flow

**Current state:** ✅ Complete. Home stats visible (#41), OG link previews (#56), bot invite link enabled (#37). Step count: 3.

---

## Step Count Summary

| Journey | Max Steps | Current Steps | Gap |
|---------|-----------|---------------|-----|
| J-01 Match link → understand context | 1 | 1 | ⚠️ v3.1 privacy gate needed |
| J-02 Discover → join | 3 | 3.5 | ⚠️ v3.1: add /connect step |
| J-03 Find player/team | 2 | 2 | ⚠️ v3.1: opt-in gate on player search |
| J-04 See recent match performance | 2 | 2 | ✅ #16 + #68 done |
| J-05 Watch match VOD | 3 | 3 | ✅ #16 done |
| J-06 Request POV render | 1 | 1 | ✅ |
| J-07 Verify Riot Account | 2 | 2 | ⚠️ /connect built, website RSO pending |
| J-08 Competitive resume | 1 | 1 | ⚠️ v3.1: remove ELO, add resume layout + opt-in gate |
| J-09 Set match public | 2 | 2 | ✅ #14 + #15 + #62 done |
| J-10 Set visibility default | 2 | 2 | ✅ #14 + #15 done |
| J-11 Bulk set visibility | 3 | 3 | ✅ #14 + #15 done |
| J-12 See team VODs | 1 | 1 | ✅ #17 done |
| J-13 Add player (auto from .rofl) | 1 | 1 | ⚠️ /add deleted, .rofl auto-add built |
| J-14 Transfer captain | 1/3 | 1/3 | ✅ #4 + #14 + #15 done |
| J-15 Check teammate verify status | 1 | 1 | ⚠️ v3.1: RSO status not link-riot |
| J-16 Find players by criteria | 2 | 2 | ⚠️ v3.1: opt-in gate |
| J-17 Verify player record | 1 | 1 | ✅ |
| J-18 Watch player VOD | 2 | 2 | ✅ |
| J-19 Platform health overview | 1 | 1 | ✅ #18 done |
| J-20 Handle ban | 3 | 3 | ✅ #18 done |
| J-21 Fix orphaned team | 3 | 3 | ✅ |
| J-22 Evaluate → install bot | 3 | 3 | ✅ #37 + #41 + #56 done |
