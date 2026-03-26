# VCLoL — Frontend v3.1 Handoff for Replit

**Created by:** Claude | **Date:** March 2026 | **Reference:** `docs/PRD_v3.md` v3.1

PRD v3.1 made major strategic changes. This document lists every frontend change needed, with exact specifications. Read `docs/PRD_v3.md` §7, §8, §11, §18 for full context.

---

## Summary of What Changed (Backend Already Done)

1. **ELO removed from scrims.** ELO only exists for tournament/event matches (not yet live). Launch = W/L record only.
2. **3-layer privacy model.** Scrim match details require login + participant. Player profiles default private.
3. **RSO is launch requirement.** Every player must verify via Riot Sign On OAuth. No trust-based linking.
4. **/add and /link-riot commands deleted.** Teammates auto-added from .rofl. Identity verified via /connect → website RSO OAuth.
5. **Player career = resume model.** No individual ELO number. Show teams + per-team W/L + KDA.

---

## New Pages to Build

### 1. RSO Connect Page (`/connect`)

**Route:** `/connect?token=abc123`
**Purpose:** Bot `/connect` sends user here. Complete Discord OAuth + RSO OAuth in sequence.
**Flow:**
1. Receive `token` query param → `POST /api/auth/connect` to validate token → get `discordId`
2. If user not logged in → Discord OAuth (auto, using discordId from token)
3. Show "Connect Riot Account" button → redirect to `GET /api/auth/rso/authorize`
4. Riot login → redirect back to `/connect/callback` → `GET /api/auth/rso/callback` exchanges code for PUUID
5. Success: show Discord avatar + Riot avatar side-by-side + "✅ Verified! You can close this tab."
6. Token expired: show "This link has expired. Run `/connect` again in Discord."

**Design notes:**
- Riot branding guidelines must be followed for RSO button (see Riot Developer Portal)
- Disclaimer: "By connecting, your custom game match data may be visible to other match participants."
- No nav bar needed — this is a utility page, not part of main site navigation

**OpenAPI endpoints (already defined):**
- `POST /api/auth/connect` — validate bot token
- `GET /api/auth/rso/authorize` — redirect to Riot
- `GET /api/auth/rso/callback` — Riot redirects back here

### 2. Pre-RSO Landing State

**When:** User visits any page without being logged in, or logged in but not RSO verified.
**What:** Show what VCLoL does with example data. CTA: "Connect via Discord Bot (`/connect`) or sign in on the website."
**Used on:** Home page, any empty state.

---

## Existing Pages Needing Changes

### 3. Player Profile (`/players/:riotId`)

**Current:** Shows ELO trajectory, aggregate stats, all publicly visible.
**New behavior:**

| Viewer | rsoOptIn=false | rsoOptIn=true, visibility=private | rsoOptIn=true, visibility=public |
|---|---|---|---|
| Anonymous | "This player has not linked their account." + CTA | "This profile is private." | Full profile |
| Self (logged in) | Full own profile + CTA to /connect | Full own profile | Full profile |
| Other logged-in user | Same as anonymous | "This profile is private." | Full profile |

**Layout change:** Replace ELO trajectory chart with career resume:
```
xiNe#NA1
├── Vancouver Storm [VCS] — Active
│   W/L: 32-18 (64%) | Avg KDA: 4.2 | Champions: Orianna, Syndra, Azir
├── Pacific Wolves [PW] — Left
│   W/L: 12-15 (44%) | Avg KDA: 3.1 | Champions: Viktor, Ahri
└── Career: 44W-33L (57%) | Avg KDA: 3.8 | 77 matches
```

**Data source:** Existing API endpoints. New field `rsoOptIn` in Player schema. New field `profileVisibility`.

### 4. Match Detail (`/matches/:id`)

**Current:** Shows all 10 players' stats to everyone. Shows ELO deltas.
**New behavior:**

| Match Type | Anonymous | Logged in non-participant | Logged in participant |
|---|---|---|---|
| Scrim (matchType=scrim) | Team A vs B + score only | Same as anonymous | Full 10-player stats |
| Tournament/Event | Full 10-player stats | Full 10-player stats | Full 10-player stats |

**Changes:**
- Remove ELO delta display section entirely (no ELO for scrims)
- Add auth gate: if `matchType === "scrim"` and user is not participant → show header only (Team A vs B, score, duration) + "Login to see match details" CTA
- Tournament matches: fully public, no gate needed
- Check `matchType` field in match response (new field, already in OpenAPI)

**Design note:** Auth gate should feel natural. "Sign in to see full match details" not "ACCESS DENIED."

### 5. Team Profile (`/teams/:id`)

**Current:** Shows ELO prominently.
**New behavior:**
- W/L record is the primary stat (large, prominent)
- ELO only shown if team has tournament matches (check: if `teamElo !== 1000` or team has matches with `matchType !== 'scrim'`)
- Roster: RSO-verified members show RiotId + link to profile. Unverified show "Player (unlinked)" — no link to profile
- Empty state design: "This team has played 15 scrims. No tournament matches yet."

### 6. Leaderboard (`/ladder`)

**Current:** Sorted by ELO.
**New behavior:**
- Sort by wins descending (W/L record board)
- Columns: Rank, Team, Record (W-L), Win %
- ELO column only shown when tournament data exists (future)
- Minimum matches threshold to appear (from ladder_settings.minMatchesForDisplay)

### 7. Search

**Current:** Returns all players.
**New behavior:**
- Player search: only return players with `rsoOptIn=true`
- Team search: unchanged (team aggregate always public)
- Note on empty results: "Only players who have verified their Riot Account appear in search."

### 8. Captain Hub (`/teams/:id/manage`)

**Current:** Has "Add Member" section with RiotId input.
**New behavior:**
- Remove "Add Member" form entirely. Replace with info section: "Team members are automatically added when they appear in match replays submitted by a captain."
- Roster section: show RSO verification status per member (✅ verified / ⚠️ unverified) instead of link-riot status
- Match visibility: only `public` and `private` options (remove `default`/7-day option)

### 9. Login Flow

**Current:** Discord OAuth only.
**New behavior:** Two-step:
1. "Login with Discord" → Discord OAuth → session established (discordId)
2. "Connect Riot Account" → RSO OAuth → PUUID linked

Step 2 is optional for browsing but required for: creating teams, viewing own stats, appearing in search.

Show prompt: "Connect your Riot Account to unlock all features" on dashboard if logged in but no PUUID.

### 10. VOD Pages

**Current:** All VODs accessible.
**New behavior:**
- Scrim VODs: follow match visibility (login + participant only, unless captain set public)
- Tournament VODs: public
- POV button: only show for RSO opt-in players
- "Request My POV" button: only visible to the player themselves

---

## Fields Changed in API Responses

| Schema | New Fields | Changed Fields |
|---|---|---|
| Match | `matchType` (scrim/ranked_tournament/event), `tournamentCode` | `resultSource` now includes `tournament_api` |
| Player | `rsoOptIn`, `rsoLinkedAt` | `profileVisibility` default is now `"private"` (was `"public"`) |
| Team | — | `defaultMatchVisibility` default is now `"private"` (was `"default"`) |
| VodEntry | `teamEloAtTime` | renamed from `playerEloAtTime` |

**Orval codegen already regenerated** — new types are in `lib/api-client-react/src/generated/`.

---

## Design Principles (from PRD v3.1 §18)

1. **Empty states matter.** Most teams will have 0 tournament matches at launch. Design for "Record: 15W-8L" being the primary data, not ELO.
2. **Privacy gates should feel natural.** "Login to see full match details" not "ACCESS DENIED."
3. **RSO connect = reward unlock.** "See your stats, appear in search, build your resume" — not a chore.
4. **Career resume > ELO number.** Player profiles show per-team history, not a single rating.

---

## Priority Order

1. **Match detail auth gate** — core privacy compliance (launch blocker)
2. **RSO Connect page** — identity flow (launch blocker)
3. **Player profile redesign** — career resume + opt-in gate
4. **Leaderboard** — W/L sort (quick change)
5. **Search opt-in gate** — filter by rsoOptIn
6. **Captain Hub** — remove Add Member
7. **Login flow** — add RSO step
8. **Team profile** — conditional ELO display
9. **VOD visibility** — follow match settings
10. **Pre-RSO landing** — polish
