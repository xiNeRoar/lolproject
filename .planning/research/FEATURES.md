# Feature Landscape

**Domain:** VCLoL v3.3 Frontend Launch — RSO connect flow, player career resume, frontend error handling
**Researched:** 2026-03-28
**Scope:** Narrowed to NEW work only. Existing features (bot, team management, admin panel, Discord OAuth, basic website) are out of scope.

---

## Context: What Is Already Built

Before listing new features, the baseline must be clear:

- `/api/auth/discord` + `/api/auth/discord/callback` — Discord OAuth working, sets `req.session.playerId`
- `/api/auth/me` — returns `{ authenticated, playerId, riotId, discordUsername, hasPuuid, rsoOptIn }`
- `/api/auth/connect/{token}` — in OpenAPI spec, NOT implemented in `auth.ts` (134 lines, only Discord)
- `/api/auth/rso` + `/api/auth/rso/callback` — in OpenAPI spec, NOT implemented in `auth.ts`
- `useAuth()` — returns `playerId, isLoggedIn, riotId, discordUsername` but MISSING `hasPuuid` and `rsoOptIn` (known tech debt)
- `PlayerProfile.tsx` — full page exists with champion pool, events, ELO trajectory, recent matches; private-state UI exists; per-team career cards NOT present
- `Matches.tsx` — uses `useListMatches()` which returns `PaginatedMatches` (`{ data, total, page, totalPages }`) but treats it as flat array (bug)
- `Players.tsx` — same pagination bug: uses `useListPlayers()` which returns `PaginatedPlayers` but treats as flat array
- `PlayerDashboard.tsx` — has "Riot Account not verified" banner pointing users to Discord `/connect`; no website-native RSO connect button
- `/connect` route — does NOT exist in `App.tsx` routing

---

## Table Stakes

Features users expect. Missing = product feels broken or launches incorrectly.

| Feature | Why Expected | Complexity | Dependencies |
|---------|--------------|------------|--------------|
| RSO Connect page (`/connect`) | Players arrive here from bot `/connect` command URL. Without it, identity verification is impossible. Launch blocker. | Medium | Needs: `/api/auth/connect/{token}` backend route + `/api/auth/rso` + `/api/auth/rso/callback` implemented in `auth.ts`. Route must exist in `App.tsx`. |
| `hasPuuid` + `rsoOptIn` in `useAuth()` | Dashboard shows stale banner ("Riot Account not verified") even for verified players because `useAuth()` doesn't forward these fields from `/api/auth/me`. Every part of the UI that needs to know "is this player RSO-verified?" depends on this. | Low | `auth.ts` server already returns these fields. `useAuth()` just needs to forward them from `data`. |
| Login flow RSO connect step | After Discord OAuth login, players without RSO (`hasPuuid=false`) should see a call-to-action to complete RSO verification. Currently the dashboard shows a yellow warning pointing to Discord, but there should be a website-native RSO connect path. | Low-Medium | Depends on `useAuth()` fix (hasPuuid forwarding) + RSO routes existing |
| Paginated response adaptation (`Matches.tsx`, `Players.tsx`) | Both hooks return `{ data: [], total, page, totalPages }` but the pages destructure them as if they're arrays. This is a runtime crash for any user who visits `/matches` or `/players`. Fix = unwrap `.data` before filtering/sorting. | Low | No backend changes needed. Generated client already returns correct type. |
| VOD privacy graceful degradation | `VodDetail.tsx` and `Vods.tsx` likely reference undefined properties when a VOD is access-gated (403). Need null/undefined guard + user-facing "this VOD is private" message. Issue #226. | Low | No backend changes needed. |
| Private profile 403 handling | `PlayerProfile.tsx` currently checks `player?.isPrivate` via a type cast `(player as any)?.isPrivate`. The actual API returns HTTP 403 with `{ error: "Player profile is private" }` for non-opted players. The existing private-state UI exists but it triggers on a field cast, not on the actual 403. Need `isError` + error status code check. Issue #227. | Low | The private-state UI already exists in `PlayerProfile.tsx` (line 162-206). Just needs correct trigger. |

---

## Differentiators

Features that make VCLoL's website worth visiting, not just the Discord bot.

| Feature | Value Proposition | Complexity | Dependencies |
|---------|-------------------|------------|--------------|
| Per-team career resume cards on player profile | Core VCLoL pitch: "team play resume OP.GG cannot provide." Backend is done (`GET /players/:id/team-stats` returns `PlayerTeamStats[]`). Generated hook `useGetPlayerTeamStats(id)` exists. Design spec in `docs/DESIGN_GUIDE.md` is complete. Just needs to be rendered in `PlayerProfile.tsx`. | Low | `useGetPlayerTeamStats` already generated. `PlayerTeamStats` schema fully defined. `PlayerProfile.tsx` already has team section (ELO trajectory, team links) — career cards slot in there. |
| RSO connect page as standalone URL | Players share `/connect?token=XYZ` URLs from the bot. Having a polished landing page (vs a bare redirect) builds trust. Shows "Verifying your Riot identity..." during the OAuth redirect, and a success/error state on return. | Low-Medium | Depends on backend RSO routes being implemented. |
| Post-RSO profile unlock message | After successful RSO connect, show "Your profile is now public-ready. Go to Settings to control visibility." One-time onboarding moment. | Low | Depends on RSO connect success redirect. |
| Dashboard RSO connect CTA (website-native) | Currently dashboard says "use /connect in Discord." After RSO routes are built, replace or supplement this with a direct "Verify with Riot" button that starts the website RSO flow. More user-friendly than requiring Discord. | Low | Depends on `useAuth()` fix + RSO routes |

---

## Anti-Features

Explicitly out of scope for v3.3.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Pagination UI (page numbers, next/prev buttons) | The immediate bug is that pages destructure the paginated response incorrectly (treating `PaginatedMatches` as array). The fix is to unwrap `.data`. Adding full pagination UI (prev/next, page select) is a separate enhancement that belongs in a later issue. | Unwrap `.data`, render all results from page 1. Mark full pagination UI as future work. |
| RSO token storage | Backend already decided: store PUUID only, never persist RSO access/refresh tokens. This is correct per Riot policy and VCLoL's needs (only PUUID needed for identity). | Keep existing decision. |
| Activity heatmap | Design guide specifies this pattern but it's not in the active milestone. Adds complexity without unlocking anything blocked. | Defer to a polish milestone. |
| Shareable card / screenshot export | Design guide specifies this pattern but it is explicitly marked "deferred to future phase." | Leave in design guide as future work. |
| Player-facing match submission through website | Bot is the match data producer. Website is display-only. The `.rofl` submission endpoint exists for fallback but should not be exposed as a primary UI feature. | Keep submission bot-only. |

---

## Feature Implementation Details

### RSO Connect Flow — How It Works

The flow has two entry points, both of which the backend needs to support:

**Entry Point A: Bot-initiated (`/connect` command)**
1. Player runs `/connect` in Discord
2. Bot generates a short-lived token, stores it in `auth_sessions` table, sends player a URL: `https://vclol.gg/connect?token=TOKEN`
3. Player clicks URL, lands on `/connect` page on the website
4. `/connect` page calls `GET /api/auth/connect/{token}` — backend validates token, associates the Discord session, then redirects to `GET /api/auth/rso` to start the RSO OAuth dance
5. RSO OAuth: `auth.riotgames.com` → `/api/auth/rso/callback?code=CODE&state=STATE`
6. Backend exchanges code for PUUID, saves to `players.puuid`, sets `hasPuuid=true`
7. Redirect to `/dashboard` with success signal

**Entry Point B: Website-initiated (dashboard CTA)**
1. Authenticated player (has session, no PUUID) clicks "Verify with Riot" button
2. Button navigates to `GET /api/auth/rso` directly (no token needed, already has session)
3. Same RSO callback flow as above

**Frontend `/connect` page responsibilities:**
- Display "Connecting your Riot account..." skeleton during the token validation redirect
- Handle error states: expired token (`?error=expired`), already linked (`?error=already_linked`)
- On success redirect from callback, show success state with link to dashboard

**Backend `auth.ts` needs (currently missing):**
- `GET /auth/connect/:token` — validate token, start RSO redirect
- `GET /auth/rso` — build Riot OAuth URL with `state` (CSRF), redirect
- `GET /auth/rso/callback` — exchange code for access token, fetch PUUID via RSO `/userinfo`, save PUUID to DB, destroy RSO tokens, redirect

### Per-Team Career Resume — Expected UI

Based on `docs/DESIGN_GUIDE.md` "Per-Team Career Card" specification:

```
┌─────────────────────────────────────────────┐
│  Team Alpha [TA]           Mid   Active     │
│  32W / 18L                 3.2 / 2.1 / 8.4  │
└─────────────────────────────────────────────┘
```

- Card per team the player has ever been on
- Inactive teams get muted treatment (`text-muted-foreground`, lower visual weight)
- Teams with 0 games played show the membership without stats
- Sorted by `gamesPlayed` descending (backend already does this)
- Each team name links to the team's profile page (`/teams/:id`)
- Role Badge shown if `role` is non-null

Insert location in `PlayerProfile.tsx`: Between the header card and the ELO trajectory section. This is the "career history" anchor — all other stats (champion pool, recent matches) flow naturally after it.

The hook `useGetPlayerTeamStats(player.id)` is available. Enable condition: `!!player?.id && !isPrivate`.

### Pagination Bug — Expected Fix

Both `useListMatches()` and `useListPlayers()` now return `PaginatedMatches` and `PaginatedPlayers` (response shape: `{ data: T[], total, page, totalPages }`).

Current broken code pattern in `Matches.tsx`:
```typescript
const { data: matches } = useListMatches(apiParams);
// then: matches?.length, [...matches], matches.filter(...)
// all wrong — matches is { data: [], total, page, totalPages }
```

Correct fix:
```typescript
const { data: matchesPage } = useListMatches(apiParams);
const matches = matchesPage?.data ?? [];
// then use matches normally
```

Same pattern for `Players.tsx` with `useListPlayers()`.

No backend changes. No pagination UI needed now. Just unwrap the `.data` property everywhere.

### Private Profile 403 — Expected Fix

Current code in `PlayerProfile.tsx` (line 127):
```typescript
const isPrivate = !!(player as any)?.isPrivate;
```

This relies on a field that may not exist. The actual API returns HTTP 403 with body `{ error: "Player profile is private" }`.

TanStack Query behavior: When a request returns 403, `isError` becomes `true`. The `error` object contains the response details.

Correct approach — check error status:
```typescript
const { data: player, isLoading, isError, error } = useGetPlayer(riotId ?? "");
const isPrivate = isError && (error as any)?.status === 403;
```

The private-state UI already exists in the file (lines 162-206). The only change is the condition that triggers it.

### VOD Privacy Graceful Degradation

Expected behavior when a VOD is access-gated (403):
- VOD list: skip or show locked indicator for gated VODs
- VOD detail: "This VOD is private. The captain has restricted access to this replay." with back link
- Do not crash with undefined property access

---

## Feature Dependencies (v3.3 Specific)

```
useAuth() hasPuuid/rsoOptIn fix
  → Dashboard RSO connect CTA shows correctly
  → Login flow RSO step shows/hides correctly

Backend RSO routes (auth.ts: /auth/connect/:token, /auth/rso, /auth/rso/callback)
  → /connect page can function
  → RSO OAuth dance completes
  → players.puuid gets set
  → hasPuuid=true in /auth/me response

/connect page (new route in App.tsx + new component)
  → RSO verification entry point works for bot-initiated flow

Pagination unwrap fix (Matches.tsx, Players.tsx)
  → No runtime crash on /matches and /players pages

useGetPlayerTeamStats(player.id) added to PlayerProfile.tsx
  → Per-team career resume cards visible on profile

isError 403 check in PlayerProfile.tsx
  → Private profiles show correct state instead of relying on type cast
```

---

## Complexity Breakdown

| Feature | Effort | Risk | Blocker For |
|---------|--------|------|-------------|
| `useAuth()` hasPuuid/rsoOptIn fix | 15 min | None — just forward two fields | Dashboard CTA, login flow |
| Pagination unwrap fix (2 files) | 30 min | None — mechanical change | /matches and /players working |
| Private profile 403 fix | 30 min | Low — UI already exists | Profile page correctness |
| VOD privacy graceful degradation | 1-2 hr | Low — null guard + message | VOD pages not crashing |
| Per-team career resume in PlayerProfile | 2-3 hr | Low — hook + design spec both exist | Core differentiator visible |
| Backend RSO routes (auth.ts) | 3-4 hr | Medium — Riot OAuth integration, CSRF state | RSO connect flow |
| `/connect` page (frontend) | 1-2 hr | Low — mostly loading/error states | Bot-initiated RSO flow |
| Dashboard RSO connect CTA | 1 hr | None | Website-native RSO path |

**Total estimated effort:** 10-14 hours. Feasible in one focused execution phase.

---

## Ordering Rationale

Build order should be:

1. **Tech debt first** (`useAuth()` fix, pagination fix, 403 fix, VOD graceful degradation) — zero risk, unblocks everything else, fixes existing broken pages
2. **Backend RSO routes** — needed before any RSO frontend can work; self-contained in `auth.ts`
3. **Per-team career resume** — backend done, hook generated, design spec complete; highest-value visible feature
4. **RSO connect page + dashboard CTA** — depends on backend RSO routes; completes the launch requirement

---

## Sources

All findings are HIGH confidence (derived from direct codebase inspection, not external research):

- `artifacts/vclol/src/hooks/use-auth.ts` — confirmed hasPuuid/rsoOptIn not forwarded
- `artifacts/api-server/src/routes/auth.ts` (134 lines) — confirmed RSO routes not implemented
- `lib/api-spec/openapi.yaml` lines 193-235 — RSO routes specified but not yet backed by implementation
- `lib/api-client-react/src/generated/api.ts` lines 2902-2963 — `useGetPlayerTeamStats` confirmed generated
- `artifacts/vclol/src/pages/public/PlayerProfile.tsx` lines 127-128 — confirmed `(player as any)?.isPrivate` type cast
- `artifacts/vclol/src/pages/public/Matches.tsx` lines 17-18 — confirmed flat array usage of paginated response
- `artifacts/vclol/src/pages/public/Players.tsx` lines 38-39 — confirmed flat array usage of paginated response
- `artifacts/vclol/src/App.tsx` lines 43-84 — confirmed no `/connect` route exists
- `docs/DESIGN_GUIDE.md` lines 177-228 — confirmed Per-Team Career Card and Shareable Card specs
- `lib/api-spec/openapi.yaml` lines 3550-3585 — confirmed PlayerTeamStats schema shape
