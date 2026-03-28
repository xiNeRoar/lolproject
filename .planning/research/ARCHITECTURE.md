# Architecture Patterns

**Domain:** VCLoL v3.3 Frontend Launch — RSO OAuth, Player Career Resume, Error Handling
**Researched:** 2026-03-28
**Confidence:** HIGH (all findings derived from reading actual source files)

---

## Existing Architecture Baseline

The SPA is already a working system. The v3.3 features are integrations, not greenfield. Understand what already exists before touching anything.

### Current Router Structure (`artifacts/vclol/src/App.tsx`)

```
WouterRouter (base: import.meta.env.BASE_URL)
  └── Switch
        ├── /login               → PlayerLogin (Discord OAuth entry)
        ├── /dashboard           → PlayerDashboard (auth-gated content)
        ├── /players/:riotId     → PlayerProfile (existing, needs career resume addition)
        ├── /teams/:id           → TeamProfile
        └── [all other public routes]
```

**Missing routes** (need to be added to App.tsx):
- `/connect` — RSO Connect page (new page component)
- `/connect/:token` — token-prefilled variant of the connect page

The RSO callback (`/auth/rso/callback`) is handled server-side by Express and redirects back to `/dashboard` on success. It does NOT need a frontend route.

### Auth Flow State Machine (current)

```
Unauthenticated
    │
    ▼  GET /api/auth/discord  (full redirect, not fetch)
Discord OAuth
    │
    ▼  Express: /auth/discord/callback
    │   ├── Player exists → set session → redirect /dashboard
    │   └── No player → set discordId in session → redirect /register
    │
    ▼  /dashboard  (session playerId set)
    │
    ?  hasPuuid = false → show RSO banner in dashboard
    │
    ▼  User clicks /connect → RSO Connect page
    │   ├── Bot flow: GET /api/auth/connect/:token (server → RSO redirect)
    │   └── Web flow: GET /api/auth/rso (server → RSO redirect)
    │
    ▼  Riot auth.riotgames.com
    │
    ▼  Express: /auth/rso/callback → sets puuid in DB → redirect /dashboard
```

### `useAuth()` — Current vs Required

**Current shape** (`artifacts/vclol/src/hooks/use-auth.ts`):
```typescript
return {
  playerId,        // string | null
  isLoggedIn,      // boolean
  playerIdNum,     // number
  riotId,          // string | null  (from /auth/me session only)
  discordUsername, // string | null
  isLoading,
  logout,
};
```

**Missing fields** (tech debt from v3.2 — issue in PROJECT.md):
- `hasPuuid: boolean` — available in `data.hasPuuid` from `useGetAuthMe` response, NOT forwarded
- `rsoOptIn: boolean` — available in `data.rsoOptIn` from `useGetAuthMe` response, NOT forwarded

The `AuthMeResponse` schema (confirmed in `api.schemas.ts`) already has both fields:
```typescript
interface AuthMeResponse {
  authenticated: boolean;
  playerId?: number | null;
  riotId?: string | null;
  discordUsername?: string | null;
  hasPuuid: boolean;   // exists in schema, NOT exposed by useAuth()
  rsoOptIn: boolean;   // exists in schema, NOT exposed by useAuth()
}
```

**Fix:** Add both fields to the `useAuth()` return value. This is the first thing to do — all other features depend on it.

---

## Feature 1: useAuth() Tech Debt Fix

**File:** `artifacts/vclol/src/hooks/use-auth.ts`
**Type:** Modification (8 lines changed)
**Blocks:** RSO connect page, login flow RSO step, dashboard banner accuracy

### Change

Add two lines to the return object:
```typescript
hasPuuid: data?.hasPuuid ?? false,
rsoOptIn: data?.rsoOptIn ?? false,
```

### Downstream Impact

After this fix, every component that calls `useAuth()` automatically gets RSO state. No other files need changes to receive this data.

---

## Feature 2: RSO Connect Page (`/connect`)

**New file:** `artifacts/vclol/src/pages/public/RsoConnect.tsx`
**Route change:** Add `<Route path="/connect" component={RsoConnect} />` to App.tsx
**Backend state:** RSO routes (`/api/auth/rso`, `/api/auth/connect/:token`) are defined in OpenAPI spec and have generated hooks, but the routes are NOT yet implemented in `artifacts/api-server/src/routes/auth.ts`

### Two Entry Points, One Page

| Entry | URL | How user gets here |
|-------|-----|--------------------|
| Bot flow | `/connect?token=<tok>` | Bot DM link after `/connect` command |
| Web flow | `/connect` | Dashboard banner or direct nav |

The page reads an optional `token` query param from Wouter's `useSearch()`. If present, it navigates the browser to `/api/auth/connect/:token` (which server redirects to RSO). If absent, it navigates to `/api/auth/rso`.

### Component Structure

```
RsoConnect (page)
  ├── reads: useAuth() → { hasPuuid, isLoading }
  ├── reads: useSearch() → token param
  ├── if already has PUUID → show "Already verified" state with link to /dashboard
  ├── if !isLoggedIn → show "Login required" state with link to /login
  └── default → show connect card
        ├── Riot logo + explanation copy
        ├── "Connect Riot Account" button → window.location.href = /api/auth/rso (or /api/auth/connect/:token)
        └── privacy note (only PUUID saved, no tokens stored)
```

### Data Flow

- No API fetch from the page itself (all OAuth is server-redirect based)
- After RSO callback success, Express redirects to `/dashboard`
- `useGetAuthMe` re-fetches and `hasPuuid` becomes true
- Dashboard banner disappears automatically (reactive via TanStack Query)

### Backend Work Required (not in auth.ts yet)

The auth.ts file currently has Discord OAuth and `/auth/me` only. Three endpoints must be added:

| Endpoint | What it does |
|----------|-------------|
| `GET /api/auth/connect/:token` | Validate bot token, store in session, redirect to RSO |
| `GET /api/auth/rso` | Initiate RSO OAuth (redirect to Riot) |
| `GET /api/auth/rso/callback` | Receive code, exchange for PUUID, update player, redirect `/dashboard` |

These are already in the OpenAPI spec. Generated hooks exist (`useAuthConnectToken`, `useAuthRso`, `useAuthRsoCallback`) but they are GET hooks — the actual redirect flow bypasses them. The page uses `window.location.href` for the redirect initiations, not fetch.

---

## Feature 3: Player Career Resume on PlayerProfile

**Modified file:** `artifacts/vclol/src/pages/public/PlayerProfile.tsx`
**New component file:** `artifacts/vclol/src/components/PlayerTeamStatsCard.tsx` (recommended extraction)
**Hook available:** `useGetPlayerTeamStats(id)` — already generated, returns `PlayerTeamStats[]`

### PlayerTeamStats Shape (from api.schemas.ts)

```typescript
interface PlayerTeamStats {
  teamId: number;
  teamName: string;
  teamTag: string;
  role?: string | null;
  status: string;           // active | inactive | pending
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  gamesPlayed: number;
  joinedAt: string;         // ISO date
}
```

### Integration Point in PlayerProfile.tsx

The existing page already:
- Has `player.teams` from `useGetPlayer(riotId)` — team names/IDs only
- Renders `<EloTrajectory teams={allTeams} />` using those same teams
- Has aggregate stats (career totals across all teams)

The career resume **adds** per-team stat cards between the existing aggregate stats block and the EloTrajectory section. Data comes from `useGetPlayerTeamStats(player.id)`.

**Condition on fetch:** `enabled: !!player?.id && !isPrivate` (consistent with other queries on the page)

### Component Layout for PlayerTeamStatsCard

```
Card (one per team, rendered as a grid or vertical stack)
  ├── Header: TeamName [TAG] · Role badge · Status badge
  ├── Stats row: Wins (green) / Losses (red) · Win% · gamesPlayed
  ├── KDA row: avgKills / avgDeaths / avgAssists
  └── Footer: Joined [date formatted]
```

### Render Position in PlayerProfile

```
[Hero card — riotId, avatar, aggregate stats]   (existing)
[Badges]                                          (existing)
[Per-team Career Cards]                           (NEW — add here)
[EloTrajectory chart]                             (existing)
[Champion Pool]                                   (existing)
[Events]                                          (existing)
[Recent Matches + VODs grid]                      (existing)
```

---

## Feature 4: Login Flow RSO Connect Step

**Modified files:**
- `artifacts/vclol/src/pages/public/PlayerDashboard.tsx` — existing `AlertTriangle` banner
- `artifacts/vclol/src/components/layout/PublicLayout.tsx` — UserDropdown nav (optional)

### Dashboard Banner (already exists, needs link)

`PlayerDashboard.tsx` lines 108–118 already render a yellow warning when `!player.puuid`. The banner currently tells users to use `/connect` in Discord. After the RsoConnect page exists, the banner should link to `/connect` on the website.

**Change:** Add `<Link href="/connect">` as a CTA button in the existing banner. The banner copy can also be updated: "Use /connect in Discord OR connect here."

### UserDropdown (optional enhancement)

The UserDropdown in PublicLayout does not surface the RSO status. After `useAuth()` exposes `hasPuuid`, a small indicator can be added to the "My Profile" menu item to nudge unverified players toward `/connect`.

**This is optional** — the dashboard banner is the primary CTA.

### Post-Login Redirect Logic

Currently `PlayerLogin.tsx` redirects to `/dashboard` after login (via `useEffect` on `isLoggedIn`). No change needed there. The RSO step is surfaced via the dashboard banner, not an automatic redirect to `/connect`.

---

## Feature 5: Frontend Error Handling (Issues #225, #226, #227)

### #225 — Pagination Adaptation (`Players.tsx`, `Matches.tsx`)

**Root cause:** `useListPlayers()` now returns `PaginatedPlayers` (`{ data: Player[], total, page, totalPages }`), but `Players.tsx` line 46 calls `players.filter(...)` treating it as an array. This is a TypeScript-invisible runtime bug because the filter call silently returns undefined or empty.

**Files affected:**
- `artifacts/vclol/src/pages/public/Players.tsx` — change `players` → `players?.data ?? []`
- `artifacts/vclol/src/pages/public/Matches.tsx` — same pattern for `useListMatches()` → `PaginatedMatches`
- `artifacts/vclol/src/pages/public/Vods.tsx` — verify `useListVods()` return shape

**Fix pattern:**
```typescript
const { data: playersResponse, isLoading } = useListPlayers();
const players = playersResponse?.data ?? [];
// Rest of existing filter/sort logic unchanged
```

Pagination controls (page navigation) are deferred — the fix is just unwrapping `.data` so current behavior works. Actual pagination UI is out of scope for v3.3.

### #226 — VOD Privacy Graceful Degradation

**Scenario:** A VOD exists but the underlying match is private. The API returns 403 on match detail fetch. The VodDetail page crashes or shows a broken state.

**File:** `artifacts/vclol/src/pages/public/VodDetail.tsx`

**Fix pattern:** Check `isError` on the match query, render a graceful "Match details restricted" state with the VOD still playable. The VOD itself is not gated — only the match stats panel.

### #227 — Private Profile 403 Handling

**Scenario:** `GET /players/:riotId` returns either a full profile or a restricted shape with `isPrivate: true`. The current `PlayerProfile.tsx` already handles this (lines 162–206) with an `EyeOff` card. However, some secondary queries (`useGetPlayerBadges`, `useGetPlayerChampions`) may fire and return 403.

**Status:** The `enabled: !!player?.id && !isPrivate` guards (lines 128–131) are already in place for badges, events, and champions. The `isPrivate` flag is read as `(player as any)?.isPrivate` (line 127) — this cast is tech debt but functionally correct. Verify the guards prevent 403 requests before closing the issue.

---

## Component Dependency Graph for Build Order

```
useAuth() fix
    │
    ├── RsoConnect page (/connect)        [depends on hasPuuid from useAuth]
    │
    ├── Dashboard banner link to /connect [depends on useAuth hasPuuid]
    │
    └── PlayerProfile career resume       [depends on player.id, independent of auth]
         └── PlayerTeamStatsCard component

Pagination fix (#225)                      [independent — just unwrap .data]
VOD privacy fix (#226)                     [independent]
Profile 403 fix (#227)                     [independent, existing guards may be sufficient]
```

---

## New Files to Create

| File | Type | Purpose |
|------|------|---------|
| `artifacts/vclol/src/pages/public/RsoConnect.tsx` | New page | RSO connect entry point |
| `artifacts/vclol/src/components/PlayerTeamStatsCard.tsx` | New component | Per-team career stats card |

## Files to Modify

| File | Change | Scope |
|------|--------|-------|
| `artifacts/vclol/src/hooks/use-auth.ts` | Add `hasPuuid` + `rsoOptIn` to return | 8 lines |
| `artifacts/vclol/src/App.tsx` | Add `/connect` route | 2 lines |
| `artifacts/vclol/src/pages/public/PlayerProfile.tsx` | Insert career resume section | ~40 lines added |
| `artifacts/vclol/src/pages/public/PlayerDashboard.tsx` | Link RSO banner to `/connect` | ~5 lines |
| `artifacts/vclol/src/pages/public/Players.tsx` | Unwrap `.data` from PaginatedPlayers | ~3 lines |
| `artifacts/vclol/src/pages/public/Matches.tsx` | Unwrap `.data` from PaginatedMatches | ~3 lines |
| `artifacts/vclol/src/pages/public/VodDetail.tsx` | Handle 403 on match detail fetch | ~15 lines |
| `artifacts/api-server/src/routes/auth.ts` | Add RSO OAuth endpoints | ~80 lines |

---

## Backend Gap: RSO Routes Not Implemented

The OpenAPI spec defines these endpoints. The generated hooks exist. But `artifacts/api-server/src/routes/auth.ts` has none of them:

| Endpoint | Generated Hook | Backend Status |
|----------|---------------|----------------|
| `GET /api/auth/connect/:token` | `useAuthConnectToken` | NOT IN auth.ts |
| `GET /api/auth/rso` | `useAuthRso` | NOT IN auth.ts |
| `GET /api/auth/rso/callback` | `useAuthRsoCallback` | NOT IN auth.ts |

These three must be added to auth.ts before the `/connect` page can function end-to-end. The frontend page can be built first with a disabled/placeholder state for the RSO button — but the button must work before launch.

RSO env vars required: `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI`. With placeholder values, the flow will fail gracefully at Riot's end (redirect to error page).

---

## Anti-Patterns to Avoid

### Do Not Add a Frontend Route for RSO Callback

The RSO callback is a server-side Express route that redirects. Adding a React page at `/auth/rso/callback` would intercept the redirect and break the flow. The Express route handles `/api/auth/rso/callback` — no frontend route needed.

### Do Not Use `useAuthRso` Hook for the Connect Button

`useAuthRso` is a GET hook that would fetch the redirect URL and return nothing useful (the API returns 302). Use `window.location.href = \`${API_BASE}/api/auth/rso\`` directly for the button action.

### Do Not Fetch Player Stats Before player.id Is Available

`useGetPlayerTeamStats(player.id ?? 0)` with `enabled: !!player?.id` is the correct pattern. Do not call with ID = 0 — the API will return 404 and TanStack Query will mark it as an error state.

### Do Not Break the Existing Private Profile Guard

`PlayerProfile.tsx` already handles `isPrivate` correctly. Do not refactor the privacy gate when adding the career resume — just add the new section under the existing `!isPrivate` check.

---

## Build Order Recommendation

1. `useAuth()` fix — unlocks all auth-aware features, zero risk
2. Pagination unwrap (#225) — independent quick fix, unblocks Players/Matches pages
3. RSO backend endpoints in auth.ts — required before `/connect` page can be tested end-to-end
4. `RsoConnect` page + App.tsx route — needs backend + useAuth fix
5. Dashboard banner link to `/connect` — 5-line change, needs useAuth fix and /connect page to exist
6. `PlayerTeamStatsCard` component — independent, no auth dependency
7. Career resume section in `PlayerProfile.tsx` — uses the new component
8. VOD privacy graceful degradation (#226) — independent, low risk
9. Profile 403 guard validation (#227) — verify existing guards are sufficient, close if yes

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| useAuth() missing fields | HIGH | Read source — data.hasPuuid exists, not returned |
| RSO backend not implemented | HIGH | Read auth.ts — no RSO routes present |
| Pagination mismatch (#225) | HIGH | Players.tsx line 46 vs PaginatedPlayers shape in schema |
| RsoConnect page shape | HIGH | OpenAPI spec + bot connect flow in PROJECT.md |
| Career resume integration point | HIGH | Read PlayerProfile.tsx structure directly |
| RSO redirect flow (no frontend route needed) | HIGH | HTTP 302 flow from OpenAPI spec |

---

## Sources

- `artifacts/vclol/src/hooks/use-auth.ts` — actual useAuth shape
- `artifacts/vclol/src/App.tsx` — router structure
- `artifacts/vclol/src/pages/public/PlayerProfile.tsx` — existing career page structure
- `artifacts/vclol/src/pages/public/PlayerDashboard.tsx` — RSO banner location (lines 108-118)
- `artifacts/vclol/src/pages/public/PlayerLogin.tsx` — Discord OAuth flow
- `artifacts/vclol/src/components/layout/PublicLayout.tsx` — UserDropdown, nav structure
- `artifacts/api-server/src/routes/auth.ts` — confirmed RSO routes absent
- `lib/api-client-react/src/generated/api.schemas.ts` — AuthMeResponse, PlayerTeamStats shapes
- `lib/api-client-react/src/generated/api.ts` — generated hooks availability
- `lib/api-spec/openapi.yaml` — endpoint definitions
- `.planning/PROJECT.md` — v3.3 milestone scope, open issues list
