# VCLoL — Replit Reference (Frontend Agent)

Read this file before every session.

---

## Project Identity

5v5 team scrim recording platform. Discord Bot handles all user actions (register team, add players, submit match results). Website is the data display layer (team profiles, player profiles, match stats, leaderboard, VOD archive, admin panel).

**Your role:** Frontend + Design ONLY. You own page files, components, hooks, styling, and layout. You do NOT own or edit backend routes, database schema, OpenAPI spec, or Discord bot code. If you need a backend change, document it in `docs/REQUESTS.md` for the backend agent.

---

## Architecture

**Stack:** React 19 + Vite + Wouter (routing) + Tailwind CSS 4 + shadcn/ui + Recharts + Framer Motion

**Fonts:** Outfit (headings, `font-display`) + Inter (body)

**API Client:** `@workspace/api-client-react` — React Query hooks auto-generated from OpenAPI spec by Orval. Import from `@workspace/api-client-react`.

**Example:**
```tsx
import { useListTeams, useGetTeam, useGetMatchPlayers } from "@workspace/api-client-react";
```

Prefer generated hooks where available. For endpoints not in OpenAPI (e.g. visibility toggle, replay download, POV request), direct `fetch()` is acceptable.

---

## File Ownership

**You own:**
- `artifacts/vclol/src/pages/**` — all page files
- `artifacts/vclol/src/components/**` — all component files (except `components/ui/` which is shadcn, don't edit)
- `artifacts/vclol/src/lib/` — utility files
- `artifacts/vclol/src/hooks/` — custom hooks
- `artifacts/vclol/src/App.tsx` — routing
- `artifacts/vclol/src/index.css` — theme
- `replit.md` — this file

**You do NOT own (never edit):**
- `lib/db/src/schema/*` — database schema (Backend Agent)
- `lib/api-spec/openapi.yaml` — API spec (Backend Agent)
- `lib/api-client-react/src/generated/*` — auto-generated (codegen)
- `artifacts/api-server/**` — backend routes (Backend Agent)
- `artifacts/discord-bot/**` — Discord bot (Backend Agent)
- `CLAUDE.md` — Backend Agent's reference
- `docs/SCHEMA_CONTRACT.md` — Backend Agent's schema contract
- `docs/BOT_SPEC.md` — Backend Agent's bot spec

---

## Key Model Changes from v1

**Before (1v1):** Players have ELO. Matches are Player A vs Player B. Ladder shows players.
**After (5v5):** Teams have ELO. Matches are Team A vs Team B with 10 per-player stat rows. Ladder shows teams. Players have aggregate stats derived from match_players.

**Deleted features (remove all references):**
- Challenge system (ChallengeModal, ManageChallenges, challenge buttons, challenge notifications)
- Matchmaking queue
- Interest submissions
- Admin schedule settings
- Player ELO display (currentElo, peakElo on player objects)
- Player wins/losses counts

**New features:**
- Team profile page (`/teams/:id`)
- Team leaderboard (replaces player ladder)
- 10-player match stats table (replaces 2-player match view)
- Team management in admin

---

## Auth Pattern

**Current (stub):** `localStorage.getItem("vclol_player_id")` in 9 locations.
**Target:** `useGetAuthMe()` hook → session-based via Discord OAuth.

Until Discord OAuth is live, keep localStorage for dev. But wrap in a shared hook:
```tsx
// src/hooks/use-auth.ts
export function useAuth() {
  // Phase 1: localStorage stub
  const id = localStorage.getItem("vclol_player_id");
  return { playerId: id ? Number(id) : null, isLoggedIn: !!id };
  // Phase 2: replace with useGetAuthMe() when Discord OAuth lands
}
```
Use `useAuth()` everywhere instead of raw localStorage.

---

## Page Responsibilities (5v5 model)

### Public Pages
| Route | Page | Data Source |
|-------|------|-------------|
| `/` | Home | `useListEvents`, `useListVods`, `useListMatches` — update hero copy + CTAs |
| `/teams` | Teams (NEW) | `useGetLadder` → team leaderboard |
| `/teams/:id` | TeamProfile (NEW) | `useGetTeam` → team detail + members + match history |
| `/players` | Players | `useListPlayers` → searchable/filterable player directory |
| `/players/:riotId` | PlayerProfile | `useGetPlayer` → aggregate stats, ELO trajectory (via team), champion pool |
| `/matches/:id` | MatchDetail | `useGetMatch` → 10-player stats, .rofl download, POV request, visibility toggle |
| `/events` | Events | `useListEvents` — unchanged |
| `/events/:slug` | EventDetail | `useGetEvent` — update participants to show teams |
| `/vods` | Vods | `useListVods` — only shows VODs from public matches (`visibleAfter <= now`) + own-team matches |
| `/vods/:id` | VodDetail | `useGetVod` — check visibility before rendering |
| `/dashboard` | PlayerDashboard | Simplified: team list, recent results, notifications, quick links to profile/team. |
| `/login` | PlayerLogin | Keep Discord OAuth button |
| `/register` | Register → Landing | Replace form with "How to register via Discord bot" guide |
| `/about` | About | Update copy |
| `/contact` | Contact | Unchanged |

### Admin Pages
| Route | Page | Notes |
|-------|------|-------|
| `/admin` | Dashboard | Replace "Interests" stat with "Teams" |
| `/admin/players` | ManagePlayers | Remove ELO/W-L columns. Add role column. |
| `/admin/teams` | ManageTeams (NEW) | Team CRUD, member management |
| `/admin/seasons` | ManageSeasons | Unchanged |
| `/admin/seasons/:id` | ManageSeasonDetail | Remove Challenges tab. Standings → team-based. Match form → team dropdowns. |
| `/admin/events` | ManageEvents | Minor format changes |
| `/admin/events/:id` | ManageEventDetail | Match form → team dropdowns. Registrations → team-based. |
| `/admin/vods` | ManageVods | Unchanged |
| `/admin/ladder-settings` | ManageLadderSettings | Remove 7 challenge fields + schedule section |
| `/admin/login` | Login | Unchanged |

**Deleted pages:** ManageChallenges ✓, Interest ✓, Ladder ✓ (redirects to /teams)
**Deleted components:** ChallengeModal ✓

---

## Design System — Unified Standard

### DS-1: Page Titles (h1)

```
Listing pages (Teams/Players/Events/Vods):
  text-4xl font-display font-bold mb-2
  NO icons. Ever.

Marketing pages (Home/About/Contact):
  text-4xl md:text-5xl font-display font-bold mb-6
  NO icons.

Detail pages (PlayerProfile/TeamProfile/VodDetail):
  text-2xl to text-3xl font-display font-bold
  NO icons.
```

### DS-2: Section Headers — CardTitle (inside Card components)

```
className="text-base font-display flex items-center gap-2"
Icon: w-4 h-4 text-primary (ALWAYS required)
Every CardTitle MUST have a Lucide icon.
```

### DS-3: Section Headers — h2 (free-standing, e.g. EventDetail/About)

```
className="text-2xl font-display font-semibold mb-4 border-b border-border pb-2 flex items-center gap-2"
Icon: w-5 h-5 text-primary
```

### DS-4: Cards

```
Standard content:    bg-card/40 border-border/40
Auth/elevated:       bg-card/60 border-border/40
Subtle/nested:       bg-card/30 border-border/40
NEVER use border-border/50 on public pages.
```

### DS-5: Empty States

```
List page (full page empty):
  Container: border border-dashed border-border rounded-lg py-20 text-center
  Icon: w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50
  Title: text-xl font-medium mb-2
  Description: text-muted-foreground text-sm

Inline section empty (inside a Card):
  px-6 py-8 text-center text-muted-foreground text-sm
  No icon, no container
```

### DS-6: Loading States

```
List page:   5 rows of h-16 bg-card rounded-xl with animate-pulse
Detail page: 2 blocks (h-40 + h-48) bg-card rounded-xl with animate-pulse
Grid page:   Grid of h-48/h-72 bg-card rounded-xl with animate-pulse
NEVER use text "Loading..." on public pages.
```

### DS-7: Text Colors

```
text-primary           — accent, links, interactive elements
text-yellow-400        — gold, peak values, captain badge
text-purple-400        — special rankings
text-green-400         — wins, positive values
text-red-400           — losses, negative values
text-blue-400          — info links
text-muted-foreground  — secondary/body text
NO -500 variants. Ever.
```

### DS-8: Icon Sizing

```
CardTitle section icons:           w-4 h-4 text-primary
Page h1 titles:                    NO icons
About/EventDetail h2 prose icons:  w-5 h-5 text-primary
```

### DS-9: Intentional Design Exceptions (NOT violations)

- Home hero title uses `text-5xl md:text-6xl` — marketing page treatment
- Register step headers use numbered circles — onboarding pattern, icons redundant
- Home CTA/hero banners skip icons — visual hierarchy via background treatment
- EventDetail uses h2 with border-b instead of CardTitle — free-standing sections
- Admin pages use `bg-card` solid + `border-border/50` for tables — separate admin scope

---

## Pending Frontend Fixes (Approved Rules, Not Yet Executed)

These are violations of the Design System standard above. Do NOT execute until explicitly approved.

| # | File | Issue | Fix |
|---|---|---|---|
| 1 | PlayerDashboard.tsx | 4 CardTitles missing `font-display` | Add `font-display` to all 4 CardTitle classNames |
| 2 | TeamProfile.tsx | Current Roster icon missing `text-primary` | Add `text-primary` to Users icon |
| 3 | VodDetail.tsx | Timestamps + Related VODs icons missing `text-primary` | Add `text-primary` to Clock and Video icons |
| 4 | Events.tsx | Card uses `border-border/50` | Change to `border-border/40` |
| 5 | Contact.tsx | Card uses `border-border/50` and `bg-card` solid | Change to `bg-card/40 border-border/40` |
| 6 | Vods.tsx | Empty state missing icon | Add Video icon to empty state |
| 7 | EventDetail.tsx | Loading uses text "Loading event..." | Replace with pulse skeleton blocks |

---

## Utility Files

- `src/lib/lol-utils.ts` — CHAMP_IDS, champPortraitUrl, eloBadgeColor, rankLabel, rankIcon, BADGE_META, ROLES
- `src/hooks/use-auth.ts` — shared auth hook (wraps localStorage stub)

---

## Handoff Protocol

1. Backend Agent pushes backend work with commit `[HANDOFF-REPLIT] Phase X done — <description>`
2. User tells you to pull
3. You run `pnpm install` then check generated hooks in `lib/api-client-react/src/generated/`
4. Build frontend pages using those hooks
5. When done, commit with `[HANDOFF-CLAUDE] <description of what you did and what you need next>`

If you need a backend change:
- Do NOT edit route/schema files
- Create or append to `docs/REQUESTS.md` with the request details
- Backend Agent picks it up in next session

---

## Admin Credentials (Dev)

- Email: `admin@vclol.gg`
- Password: `admin123`

## DB Migration Status (2026-03-19)

All DB schema changes from SCHEMA_CONTRACT.md have been applied:
- `season_champions`: migrated from `player_id` to `team_id`/`team_name`
- `players`: dropped `current_elo`/`peak_elo`/`wins`/`losses`
- `matches`: dropped `player_a_id`/`player_b_id`/`player_a_elo_before/after`/`player_b_elo_before/after`
- `event_registrations`: added `team_id` FK
- Dropped tables: `challenges`, `matchmaking_queue`, `interest_submissions`, `admin_schedule_settings`
- Seed data: 2 teams (Alpha/Beta), 10 players, 4 matches, 1 event, 1 VOD — all 5v5

## Important Constants

- **gameDuration**: stored as milliseconds — divide by 60000/1000 for MM:SS display
- **ELO history API path**: `/api/elo-history/team/:teamId` (NOT `/api/teams/:id/elo-history`)
- **Seed data IDs**: Team Alpha id=8, Team Beta id=9; players ids 39-48; xiNe#NA1=id39 (captain, mid)
- **Champion API**: `GET /api/players/:id/champions` returns `{champion, games, wins, avgKda}`
- **Codegen command**: `pnpm --filter @workspace/api-spec run codegen`
- **DB push**: Use direct `psql` SQL instead of `pnpm --filter @workspace/db run push`
