# VCLoL — Replit Reference

Read this file before every session.

---

## Project Identity

5v5 team scrim recording platform. Discord Bot handles all user actions (register team, add players, submit match results). Website is the data display layer (team profiles, player profiles, match stats, leaderboard, VOD archive, admin panel).

**Your role:** Full-stack. Frontend pages/components consume API data via generated React Query hooks. Backend routes, schema files, and API endpoints are also maintained here.

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
- `lib/db/src/schema/*` — database schema (Claude)
- `lib/api-spec/openapi.yaml` — API spec (Claude)
- `lib/api-client-react/src/generated/*` — auto-generated (codegen)
- `artifacts/api-server/**` — backend routes (Claude)
- `artifacts/discord-bot/**` — Discord bot (Claude)
- `CLAUDE.md` — Claude's reference (Claude)

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
| `/players/:riotId` | PlayerProfile | `useGetPlayer` → aggregate stats from match_players, teams list |
| `/matches/:id` | MatchDetail | `useGetMatch` → 10-player stats, .rofl download, POV request, visibility toggle |
| `/events` | Events | `useListEvents` — unchanged |
| `/events/:slug` | EventDetail | `useGetEvent` — update participants to show teams |
| `/vods` | Vods | `useListVods` — only shows VODs from public matches (`visibleAfter <= now`) + own-team matches |
| `/vods/:id` | VodDetail | `useGetVod` — check visibility before rendering |
| `/dashboard` | PlayerDashboard | Simplified: team list, recent results, notifications. No ELO, no challenges. |
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

## Utility Files

- `src/lib/lol-utils.ts` — CHAMP_IDS, champPortraitUrl, eloBadgeColor, rankLabel, rankIcon, BADGE_META, ROLES
- `src/hooks/use-auth.ts` — shared auth hook (wraps localStorage stub)

---

## Handoff Protocol

1. Claude pushes backend work with commit `[HANDOFF-REPLIT] Phase X done — <description>`
2. User tells you to pull
3. You run `pnpm install` then check generated hooks in `lib/api-client-react/src/generated/`
4. Build frontend pages using those hooks
5. When done, commit with `[HANDOFF-CLAUDE] <description of what you did and what you need next>`

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

## Design System

- Dark theme (charcoal + steel blue). CSS vars in `src/index.css`.
- Primary: `hsl(210 80% 55%)` (blue)
- Cards: `bg-card/40 border-border/40`
- Tables: `bg-card border border-border/50 rounded-lg overflow-x-auto`
- Thead: `text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50`
- Rows: `border-b border-border/20 hover:bg-muted/20`
- Empty states: centered icon + text in dashed border container
- Loading: `animate-pulse` skeleton blocks
