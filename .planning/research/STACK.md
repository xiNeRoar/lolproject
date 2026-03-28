# Technology Stack — v3.3 Frontend Launch

**Project:** VCLoL Frontend Launch (RSO OAuth pages, career resume, error handling)
**Milestone:** v3.3
**Researched:** 2026-03-28
**Scope:** ADDITIONS AND CHANGES ONLY — existing validated stack is not re-examined.

---

## Validated Existing Stack (Do Not Re-Research)

React 19, TanStack React Query 5, Tailwind CSS 4, shadcn/ui + Radix, Wouter 3, Framer Motion 12,
Recharts 2, Vite 7, Orval-generated hooks (`@workspace/api-client-react`), Zod validators.
All already installed in `artifacts/vclol/package.json`. None of these need changes.

---

## Feature 1: RSO OAuth Connect Page (`/connect?token=...`)

### What Needs to Be Built

The bot's `/connect` command sends users to `https://vclol.gg/connect?token=UUID`. This page
does not exist in the frontend. It must:

1. Extract `token` from the URL query string.
2. Redirect the browser to `GET /api/auth/connect/:token` (server handles validation + RSO redirect).
3. Show loading state while the redirect is in progress.
4. Handle error state if the token is expired or invalid (server returns 4xx instead of redirect).

The backend RSO routes (`GET /api/auth/connect/:token`, `GET /api/auth/rso`,
`GET /api/auth/rso/callback`) are defined in the OpenAPI spec and have generated hooks in
`@workspace/api-client-react`, but the actual route handlers are **not implemented** in
`artifacts/api-server/src/routes/auth.ts` (verified: auth.ts is 134 lines, contains only Discord
OAuth, `/auth/me`, and logout). This means the backend RSO routes must be built alongside the
frontend page.

### Stack Assessment: No New Libraries Needed

The `/connect` page flow is a browser redirect, not a fetch. The correct implementation is:

```typescript
// artifacts/vclol/src/pages/public/RsoConnect.tsx
// On mount: window.location.href = `${API_BASE}/api/auth/connect/${token}`
// No React Query needed — it's a full-page navigation, not an API call.
```

The generated `useAuthConnectToken` hook is not the right tool here. That hook fetches the
endpoint as JSON, but the endpoint returns a `302` redirect. Use `window.location.href` for
the redirect. The hook would follow the redirect inside fetch (same-origin), losing the browser
navigation intent.

**Backend RSO route requirements (new backend work, same commit as frontend page):**

| Route | What It Does |
|-------|-------------|
| `GET /api/auth/connect/:token` | Validate token in `auth_sessions` table, store `discordId` in session, redirect to `GET /api/auth/rso` |
| `GET /api/auth/rso` | Build RSO OAuth URL with `state` CSRF parameter stored in session, redirect to `https://auth.riotgames.com/authorize` |
| `GET /api/auth/rso/callback` | Exchange `code` for token, fetch PUUID from Riot Account API, upsert `players.puuid` + set `rsoOptIn=true`, mark `auth_sessions.completedAt`, redirect to `/dashboard?rso=success` |

**Environment variables required (already documented, not yet used):**

| Variable | Purpose |
|----------|---------|
| `RSO_CLIENT_ID` | Riot OAuth client ID |
| `RSO_CLIENT_SECRET` | Riot OAuth client secret |
| `RSO_REDIRECT_URI` | Full callback URL (e.g. `https://vclol.gg/api/auth/rso/callback`) |
| `PLATFORM_URL` | Already used by bot (e.g. `https://vclol.gg`) |

**Do NOT add:** `passport`, `passport-riot`, or any OAuth library. The existing Discord OAuth
is 80 lines of hand-rolled fetch. RSO follows the same pattern. A library adds indirection with
no benefit for a single additional provider.

**Riot RSO endpoints (HIGH confidence — verified against official Riot developer docs):**

| Step | URL |
|------|-----|
| Authorize | `https://auth.riotgames.com/authorize?client_id=...&redirect_uri=...&response_type=code&scope=openid+offline_access&state=...` |
| Token exchange | `POST https://auth.riotgames.com/token` with Basic auth |
| PUUID fetch | `GET https://americas.api.riotgames.com/riot/account/v1/accounts/me` with Bearer token |

**CSRF state handling:** Generate `crypto.randomUUID()` in `GET /api/auth/rso`, store in
`req.session.rsoState`, verify `state === req.session.rsoState` in the callback. This is the
same pattern already used in Discord OAuth (verified in auth.ts lines 15-21). RSO state is
already included in the OpenAPI `authRsoCallback` params schema.

### Wouter Route Registration

The `/connect` page needs a route entry in `App.tsx`:

```typescript
<Route path="/connect" component={RsoConnect} />
```

The `/auth/discord/callback` redirect is already handled server-side (backend redirects to
`/dashboard` or `/register`). The RSO callback similarly redirects server-side to
`/dashboard?rso=success`. No frontend route needed for either OAuth callback.

---

## Feature 2: Player Profile Career Resume (Per-Team Stats Cards)

### What Needs to Be Built

The `GET /api/players/:id/team-stats` endpoint is already implemented in the backend (v3.2) and
has a generated hook `useGetPlayerTeamStats`. The `PlayerTeamStats` interface is already in
`@workspace/api-client-react`:

```typescript
interface PlayerTeamStats {
  teamId: number;
  teamName: string;
  teamTag: string;
  role?: string | null;
  status: string;
  wins: number;
  losses: number;
  avgKills: number;
  avgDeaths: number;
  avgAssists: number;
  gamesPlayed: number;
  joinedAt: string;
}
```

The existing `PlayerProfile.tsx` shows aggregate totals only. The career resume section needs
per-team stat cards added below the aggregate header. The hook `useGetPlayerTeamStats` is
imported from `@workspace/api-client-react` but not yet consumed anywhere in the frontend
(verified: no occurrences in `artifacts/vclol/src/`).

### Stack Assessment: No New Libraries Needed

All required UI components exist in `artifacts/vclol/src/components/ui/`:
- `card.tsx` — team stat cards (same pattern as existing profile cards)
- `badge.tsx` — role/status badges (already used in PlayerProfile.tsx)
- Lucide icons — already used throughout (Swords, Users, TrendingUp already imported)

The ELO trajectory chart (Recharts LineChart) is already built in `PlayerProfile.tsx`. The
career resume section is additive UI using existing primitives — no new component library.

**Data access pattern for career resume:**

```typescript
// In PlayerProfile.tsx — add alongside existing useGetPlayer call
const { data: teamStats } = useGetPlayerTeamStats(player?.id ?? 0, {
  query: { enabled: !!player?.id && !isPrivate }
});
```

The `useGetPlayerTeamStats` hook is already correctly generated and exports from
`@workspace/api-client-react`. Confirm import path before use.

---

## Feature 3: useAuth() Tech Debt Fix (hasPuuid + rsoOptIn)

### What Needs to Change

`artifacts/vclol/src/hooks/use-auth.ts` currently returns:

```typescript
{ playerId, isLoggedIn, playerIdNum, riotId, discordUsername, isLoading, logout }
```

The `/auth/me` API already returns `hasPuuid: boolean` and `rsoOptIn: boolean` (verified in
`AuthMeResponse` schema). The hook does not forward these fields. This is the tech debt noted
in v3.2.

The fix is additive — read `data?.hasPuuid` and `data?.rsoOptIn` from the existing
`useGetAuthMe` query result and add them to the return object:

```typescript
// Add to use-auth.ts return:
hasPuuid: data?.hasPuuid ?? false,
rsoOptIn: data?.rsoOptIn ?? false,
```

Consumers needing to conditionally show the RSO connect CTA (PlayerDashboard, the new RsoConnect
page) will use `hasPuuid` to gate the prompt rather than the current `player.riotId.startsWith("pending")`
string check, which is fragile.

### Stack Assessment: No Changes Needed

This is a 2-line change to an existing hook. No new libraries.

---

## Feature 4: Frontend Paginated Response Adaptation (Issue #225)

### What Needs to Be Built

`GET /api/players` and `GET /api/matches` now return `PaginatedPlayers` and `PaginatedMatches`
(verified in generated schemas). These have shape `{ data: T[], total, page, totalPages }`.
The existing `Players.tsx` and `Matches.tsx` pages may be destructuring the response directly
as an array, which will break.

**Pattern to apply:**

```typescript
// Before (broken if API returns paginated shape):
const { data: players } = useListPlayers();
players?.map(...)

// After:
const { data: paginatedResult } = useListPlayers({ params: { page: 1, limit: 20 } });
const players = paginatedResult?.data ?? [];
const totalPages = paginatedResult?.totalPages ?? 1;
```

For v3.3, simple first-page loading with a "Load More" button or basic pagination controls is
sufficient. Full infinite scroll is not required.

### Stack Assessment: No New Libraries Needed

TanStack React Query's `useQuery` handles paginated data. For basic pagination, the existing
`Button` component plus page state (`useState<number>`) is enough.

**Do NOT add:** `react-infinite-scroll-component`, `react-virtualized`, or any infinite scroll
library. Target audience is Diamond+ competitive players — pages will have at most 100-200
players total at launch. Simple numbered pagination is correct.

---

## Feature 5: VOD Privacy Graceful Degradation (Issue #226)

### What Needs to Be Built

VOD endpoints return `403` when the viewer does not have access (scrim VOD for non-participants,
POV VOD when player has `rsoOptIn=false`). The current `Vods.tsx` and `VodDetail.tsx` pages
likely do not handle 403 gracefully — they will show an empty/broken state.

The correct behavior: detect HTTP 403, show a "This VOD is private" card with the reason
(scrim privacy vs. player consent). No redirect needed.

**Detection pattern with TanStack React Query:**

```typescript
const { data: vod, error } = useGetVod(id);
const is403 = (error as any)?.status === 403;
```

TanStack React Query exposes the error from the customFetch instance. Verify the error shape
from Orval's generated `customFetch` — it likely propagates the HTTP status. Check
`lib/api-client-react/src/lib/custom-instance.ts` if it exists, or the generated fetch wrapper.

### Stack Assessment: No New Libraries Needed

The 403 handling is inline conditional rendering using existing Card + EyeOff icon (already
in the UI library, already used in PlayerProfile.tsx private state). No new library needed.

---

## Feature 6: Private Profile 403 Handling (Issue #227)

### What Needs to Be Built

`GET /api/players/:riotId` returns 403 when the player profile is private and the requester
is not a participant. The existing `PlayerProfile.tsx` detects `(player as any)?.isPrivate`
by checking a field on the response — but this is brittle and depends on the API returning a
partial object rather than a proper 403.

Verify what the backend actually returns for a private profile: if it returns `200` with
`{ isPrivate: true }`, the current pattern is correct. If it returns `403`, the hook's
`isError` flag will be true and the error must be typed correctly.

Check `artifacts/api-server/src/routes/players.ts` around the privacy gate logic before
implementing — the current `PlayerProfile.tsx` code suggests the backend returns `200` with
a stripped object (not `403`), which means the current `isPrivate` check is correct and no
error boundary pattern is needed for this case.

The main gap for issue #227 is likely the **auth-required** case: a player viewing their own
private profile from the dashboard should see full stats. This requires passing session auth
to the API (`credentials: "include"` in the customFetch instance) and the backend checking
`req.session.playerId === player.id` to grant access.

---

## Feature 7: Login Flow RSO Connect Step

### What Needs to Be Built

After Discord OAuth login, the `/dashboard` page already shows an `AlertTriangle` banner
if `player.riotId.startsWith("pending") || !player.puuid` (line 109 in PlayerDashboard.tsx).
The banner tells users to run `/connect` in Discord.

With v3.3, the dashboard should also show a direct "Connect Riot Account" button that links
to `/api/auth/rso` (website-initiated RSO flow, not bot-initiated). This provides a second
path for players who are already logged in but haven't verified.

This requires no new library — it's an anchor tag or Button that navigates to
`${API_BASE}/api/auth/rso`. The button should only appear when `hasPuuid === false` (using
the fixed `useAuth()` hook).

A success callback state: after RSO callback redirects to `/dashboard?rso=success`, the
dashboard should detect this query param and show a toast. Use Wouter's `useSearch()` hook
to read query params, and Sonner toast (already installed) to display the confirmation.

---

## New Routes to Add to App.tsx

| Route | Component | Notes |
|-------|-----------|-------|
| `/connect` | `RsoConnect` | New page. Handles `?token=...` query param, redirects to backend. |

No other routes needed. RSO callback is server-side redirect.

---

## New Dependencies: None Required

| Feature | Why No New Dependency |
|---------|----------------------|
| RSO Connect page | `window.location.href` redirect + existing UI primitives |
| Career resume cards | Existing Card, Badge, Lucide icons |
| useAuth fix | 2-line change to existing hook |
| Pagination adaptation | `useState` + existing Button |
| VOD 403 handling | Inline conditional + existing EyeOff icon |
| Profile 403 handling | Existing pattern (isPrivate check) likely correct |
| Login RSO CTA | Anchor tag + Sonner toast (both installed) |

**The entire v3.3 frontend milestone requires zero new npm packages.**

---

## What NOT to Add

| Library | Reason to Avoid |
|---------|-----------------|
| `react-error-boundary` | Overkill. 403/privacy states are expected application states, not runtime crashes. Handle inline with conditional rendering. |
| `react-infinite-scroll-component` | Launch scale is ~100-200 players. Simple page state handles this. |
| `passport` / `passport-riot` | Adds session serialization complexity for a hand-rolled flow that already works for Discord. |
| `@tanstack/react-router` | Wouter is already installed and validated. Migrating routing is a distraction. |
| `zustand` / `jotai` | No shared global state needed. TanStack Query cache covers server state. `useAuth()` hook covers auth state. |
| `react-query-devtools` | Dev dependency already available via TanStack; add to vite.config if needed, not package.json. |

---

## Backend Changes Required (Alongside Frontend Work)

The frontend build depends on these backend routes being implemented. They are OpenAPI-specced
and have generated hooks, but the handler code does not exist yet.

| File | Change |
|------|--------|
| `artifacts/api-server/src/routes/auth.ts` | Add `GET /connect/:token`, `GET /rso`, `GET /rso/callback` handlers |
| `artifacts/api-server/src/routes/index.ts` | No change needed — `/auth` prefix already mounts `authRouter` |
| `docs/DEPLOYMENT.md` | Add `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI` entries |

The RSO backend routes must ship in the same phase as the `/connect` frontend page. There is
no value in shipping the page without the backend handler.

---

## Integration Points Summary

| Component | Consumes | Depends On |
|-----------|---------|------------|
| `RsoConnect.tsx` (new) | `useParams` (Wouter), `window.location.href` | Backend RSO routes (new) |
| `PlayerProfile.tsx` (updated) | `useGetPlayerTeamStats` (already generated) | `GET /players/:id/team-stats` (already built, v3.2) |
| `use-auth.ts` (updated) | `useGetAuthMe` (existing) | `hasPuuid`/`rsoOptIn` in `/auth/me` response (already v3.2) |
| `Players.tsx` (updated) | `useListPlayers` paginated response | `PaginatedPlayers` shape (already v3.2) |
| `Matches.tsx` (updated) | `useListMatches` paginated response | `PaginatedMatches` shape (already v3.2) |
| `PlayerDashboard.tsx` (updated) | `useAuth().hasPuuid` (fixed hook) | `/api/auth/rso` backend route (new) |

---

## Sources

- Codebase verification: `artifacts/api-server/src/routes/auth.ts` (134 lines, no RSO handlers)
- Codebase verification: `lib/api-client-react/src/generated/api.schemas.ts` (AuthMeResponse, PlayerTeamStats, PaginatedPlayers, PaginatedMatches)
- Codebase verification: `artifacts/vclol/src/hooks/use-auth.ts` (missing hasPuuid/rsoOptIn forwarding)
- Codebase verification: `artifacts/vclol/src/pages/public/PlayerProfile.tsx` (no useGetPlayerTeamStats call)
- Codebase verification: `artifacts/discord-bot/src/commands/connect.ts` (token URL pattern confirmed)
- Codebase verification: `lib/api-spec/openapi.yaml` lines 193-230 (RSO route specs)

---

*Stack analysis: 2026-03-28 — v3.3 Frontend Launch*
