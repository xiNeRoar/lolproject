# VCLoL — Replit Session Reference

## Overview
VCLoL is a project focused on building a web platform for a League of Legends competitive scene. The platform aims to provide features for players to manage teams, track matches, view statistics, and consume VODs. Key capabilities include team management, match tracking, player profiles, ladders/rankings, and administrative tools. The overall vision is to create a robust and engaging platform for the community.

## User Preferences
Frontend + Design ONLY. You own `artifacts/vclol/src/` and `replit.md`.
Never edit: schema, OpenAPI, backend routes, `CLAUDE.md`, `docs/` (except `docs/REQUESTS.md`).
Never fix silently without a record.
Do NOT edit backend files.
Update `docs/USER_JOURNEYS.md` if the journey step count improved.
`replit.md` is a living document. Update it in the same commit when you learn something about the design system or discover a pattern that should be standardized.

## ABSOLUTE BOUNDARY — NEVER VIOLATE
1. **Files you MUST NOT touch:** `lib/db/src/schema/`, `lib/api-spec/openapi.yaml`, `artifacts/api-server/`, `artifacts/discord-bot/`, `CLAUDE.md`, `docs/` (except `docs/REQUESTS.md`)
2. **NO SQL execution** — never run db:push, db:migrate, psql, or any database-modifying command
3. **NO backend infrastructure** — never run migration scripts, schema sync, seed commands, or any backend tooling
4. **Diagnose only, never fix** — when backend/DB issues cause frontend symptoms (skeletons, 500s, missing data), DIAGNOSE and REPORT the root cause. NEVER attempt to fix it.
5. **User questions are not instructions** — when the user asks "why is X broken?", answer the question. Do not treat it as a request to fix X if fixing requires crossing boundaries.
6. **Scope is absolute** — no matter how simple the fix appears, if it touches anything outside `artifacts/vclol/src/`, `replit.md`, or `docs/REQUESTS.md`, it is out of scope. Document it in REQUESTS.md instead.

## System Architecture
The project utilizes a modern web stack: React 19, Vite, Wouter for routing, Tailwind CSS 4 for styling, shadcn/ui for UI components, Recharts for data visualization, and Framer Motion for animations. Fonts used are Outfit (`font-display`) and Inter (body).

### UI/UX Decisions
- **Page Titles (h1):**
    - Listing: `text-4xl font-display font-bold mb-2` (no icons)
    - Marketing: `text-4xl md:text-5xl font-display font-bold` (no icons)
    - Detail: `text-2xl` to `text-3xl font-display font-bold` (no icons)
- **CardTitle:** `text-base font-display flex items-center gap-2` with a required `Icon: w-4 h-4 text-primary`.
- **Cards:** Defined styles for `Standard`, `Elevated`, `Subtle`, and `Admin` cards.
- **Empty States:** Specific styling for full-page and inline empty states, including icon and text guidelines.
- **Loading States:** Uses `animate-pulse` skeletons (`bg-card rounded-xl animate-pulse`) for lists and details. Never use "Loading..." text.
- **Text Colors:** Specific Tailwind classes for `primary`, `yellow-400` (gold/peak ELO), `green-400` (wins), `red-400` (losses), and `muted-foreground` (secondary). No `-500` variants.
- **Icon Sizing:** Defined sizes for `CardTitle` (w-4 h-4), `h2 prose` (w-5 h-5), and no icons for `h1` titles.
- **Mutations:** Use `toast` from `sonner` for success/error messages. Never silent.
- **Admin Tables:** Specific styling for containers, `thead`, and `rows`.
- **Mobile Responsiveness:** All designs must be mobile-responsive at 375px.

### Technical Implementations
- **Authentication:** Managed via `useAuth()` from `src/hooks/use-auth.ts`, providing `playerId`, `isLoggedIn`, and `riotId`. Captain checks are done by verifying `player.teams.some(t => t.teamId === id && t.isCaptain)`.
- **Utilities:** `src/lib/lol-utils.ts` contains helper functions like `eloBadgeColor`, `rankLabel`, `rankIcon`, `champPortraitUrl`, `CHAMP_IDS`, and `BADGE_META`.
- **Constants:** `API_BASE` is derived from `VITE_API_URL`. `gameDuration` is in milliseconds (MM:SS format). `visibleAfter null` defaults to 7 days.
- **Notification System:** Web notifications are working. Dashboard displays notifications, and a nav indicator shows unread counts. Player preferences for notification channels (web/email/discord) are available.
- **Badge System:** `first_blood`, `veteran`, `win_streak`, and `season_champion` badges are auto-awarded with defined logic. `climber` badge logic is pending.

### Feature Specifications
- **Global Search UI:** Nav search bar (desktop visible, mobile icon expand), debounced 300ms, grouped dropdown with keyboard navigation.
- **Player & Team Pages:** Enriched data (team name, total games, win rate), sorting and filtering options for players, VOD sections, ELO charts.
- **Match Details:** Displays scores prominently, team names, champion icons, and includes CTAs for captains to claim unregistered sides.
- **Dashboard:** Features recent matches, captain quick-links, and actionable notifications.
- **Admin Features:** Manage players and teams (ban/lift ban, member management), bot status, render queue, and admin action logs.
- **Registration:** Bot invite link (if configured), and a clear "Log in here" link for existing users.
- **Navigation:** Updated labels for "Ladder" to "Ranking" and "VODs" to "Watch".

## External Dependencies
- **API Client:** `@workspace/api-client-react` for generated hooks based on OpenAPI. Direct `fetch` can be used for endpoints not in OpenAPI.
- **GitHub API:** Used for managing issues (opening, commenting, closing) and retrieving issue details.
- **Sonner:** For `toast` notifications in mutations.
- **Vite:** Build tool.
- **Wouter:** Routing library.
- **Tailwind CSS 4:** CSS framework.
- **shadcn/ui:** UI component library.
- **Recharts:** Charting library.
- **Framer Motion:** Animation library.
- **Riot Games API:** Implicitly used for game data (e.g., champion portraits).
- **YouTube:** For embedding VODs.
- **Discord:** For bot functionality and potential direct messages (though `notifyPlayer()` is currently not called for DMs).
- **Resend:** Intended for email notifications (though `notifyPlayer()` is currently not called).

## Issues Closed by Replit

- **#148** Player profile privacy: Dashboard toggle + PlayerProfile gate (frontend follow-up to #132)

## Profile Privacy Implementation

- **Dashboard toggle:** `PlayerDashboard.tsx` — "Profile Privacy" card with Public/Private radio, calls `PUT /api/players/:id/profile` with `{ profileVisibility }`
- **PlayerProfile gate:** `PlayerProfile.tsx` — Checks `(player as any)?.isPrivate`, shows redacted view (riotId + teams only) with EyeOff icon message
- **Query gating:** All supplementary queries (`badges`, `champions`, `events`, `seasonChamps`) disabled via `enabled: !isPrivate` when profile is private
- **Backend contract:** Private profiles return `{id, riotId, isPrivate: true, teams}` — no stats, champion pool, or match history

## Pending Riot ID Check Fix

- `PlayerDashboard.tsx` uses `riotId.startsWith("pending")` (not `=== "pending"`) for compatibility with Claude's `pending_${discordId}` format (#134)