# Project Research Summary

**Project:** VCLoL v3.3 Frontend Launch
**Domain:** React SPA feature additions — RSO OAuth flow, player career resume, frontend error handling
**Researched:** 2026-03-28
**Confidence:** HIGH

## Executive Summary

VCLoL v3.3 is a targeted feature addition milestone on top of an already-working system. The core platform (Discord bot, API server, database, auth) is built and deployed. This milestone closes the gap between what the system can do and what users can actually access: RSO identity verification has been promised since v3.1 (the bot sends users to `/connect`) but the page does not exist; the career resume backend was built in v3.2 but is not rendered anywhere; and two public pages (`/matches`, `/players`) silently show no data because they treat paginated API responses as flat arrays. All research was conducted from direct codebase inspection — all findings are HIGH confidence with specific line references.

The recommended approach is sequential: fix tech debt first, then implement RSO backend routes, then build the career resume, then wire up the connect page. This order is not optional — `useAuth()` is missing `hasPuuid`/`rsoOptIn` fields, so any RSO-gated component written before the fix will need to be rewritten. The paginated response bug causes `Matches.tsx` and `Players.tsx` to display nothing with no error. Both must be fixed before any other frontend work is merged to avoid user-visible regressions landing on top of active broken states.

The single highest-risk item for RSO launch is the Express-session `MemoryStore`: every Portainer redeploy wipes all sessions. An RSO OAuth round-trip (user leaves the site to authenticate with Riot, then returns) takes 3–5 seconds. A deploy during that window destroys the CSRF `state` parameter in the session — the callback returns 403 and the user's connect token is spent. `connect-pg-simple` must be added before RSO ships. This is the only new npm dependency required for the entire milestone.

---

## Key Findings

### Recommended Stack

The entire v3.3 milestone requires zero new npm packages for frontend work. All required primitives (Card, Badge, Lucide icons, Sonner toasts, Wouter routing, TanStack Query) are already installed and validated. The RSO OAuth backend follows the exact same hand-rolled fetch pattern as Discord OAuth in `auth.ts` — no `passport` or OAuth library is needed. Adding `connect-pg-simple` for persistent session storage is the single required dependency addition (backend only).

**Core technology decisions for v3.3:**
- `window.location.href` (browser navigation) for RSO connect redirect — OAuth is navigation, not a data fetch. Using the generated `useAuthRso` React hook will silently break the flow by following the 302 redirect inside fetch.
- `useGetPlayerTeamStats` (already generated in `@workspace/api-client-react`) for career resume data — the backend route was built in v3.2, the hook exists, but it has never been consumed in the frontend.
- `connect-pg-simple` for session persistence — pre-requisite for RSO OAuth state surviving the Riot auth server round-trip.
- Two-line `useAuth()` fix (`hasPuuid: data?.hasPuuid ?? false`, `rsoOptIn: data?.rsoOptIn ?? false`) — unblocks all RSO-gated UI from a single change point.

**Do NOT add:** `passport`/`passport-riot` (unnecessary indirection), `react-infinite-scroll-component` (launch scale is ~200 players, simple page-1 load is correct), `zustand`/`jotai` (TanStack Query cache covers all server state), `react-error-boundary` (403/privacy states are expected application states, not crashes).

### Expected Features

All features grounded in verified codebase state — not inferred from requirements documents alone.

**Must have (table stakes — launch blockers or active regressions):**
- RSO Connect page (`/connect`) — bot has been sending users here since v3.1; currently renders `NotFound`
- `useAuth()` `hasPuuid` + `rsoOptIn` forwarding — all RSO-gated UI is wrong without this; fix must land first
- Paginated response unwrap in `Matches.tsx` and `Players.tsx` — both pages show "No results" silently; pure frontend bug
- Backend RSO routes in `auth.ts` (`/connect/:token`, `/rso`, `/rso/callback`) — unimplemented despite being in OpenAPI spec since v3.1
- Persistent session store (`connect-pg-simple`) — in-memory store makes RSO OAuth unreliable across deploys

**Should have (differentiators — high-value, backend already done):**
- Per-team career resume cards on `PlayerProfile.tsx` — core product pitch; hook generated, design spec complete, 2–3 hours of UI work
- Dashboard "Connect Riot Account" CTA button — removes Discord detour for already-logged-in players
- Post-RSO success toast on `/dashboard?rso=success` — one-time onboarding moment; uses already-installed Sonner

**Defer (explicitly out of scope for v3.3):**
- Pagination UI (prev/next buttons) — the fix is just unwrapping `.data`; navigation controls belong in a later issue
- Activity heatmap and shareable card export — in design spec but not active milestone
- Player-facing match submission through website — bot remains sole match data producer
- Infinite scroll — wrong solution for launch scale

### Architecture Approach

All v3.3 work is additive onto an established SPA architecture. Two new files (`RsoConnect.tsx`, `PlayerTeamStatsCard.tsx`) and modifications to eight existing files. The auth state machine has a precise gap: `useAuth()` is the single provider of auth state across the entire frontend, but it discards two fields that the server already returns. One hook fix propagates correct RSO state to every consumer via TanStack Query's shared cache — no component-level workarounds needed.

The RSO backend follows the existing Discord OAuth pattern: validate state, redirect to provider, exchange code, update player record, redirect to dashboard. No new middleware, no OAuth library. The only structural addition is routing the session store through PostgreSQL.

**Major components and their changes:**
1. `artifacts/vclol/src/hooks/use-auth.ts` — add `hasPuuid` + `rsoOptIn` to return object (2 lines); blocks all RSO UI if deferred
2. `artifacts/api-server/src/routes/auth.ts` — add three RSO OAuth handlers (~80 lines); currently 134 lines with no RSO code
3. `artifacts/vclol/src/pages/public/PlayerProfile.tsx` — insert career resume section between aggregate stats and ELO trajectory; hook already generated
4. `artifacts/vclol/src/App.tsx` — add `/connect` route (2 lines); currently causes NotFound for all bot-generated links
5. `artifacts/vclol/src/pages/public/Players.tsx` + `Matches.tsx` — unwrap `.data` from paginated responses (3 lines each)

**New files:**
- `artifacts/vclol/src/pages/public/RsoConnect.tsx` — RSO connect landing page
- `artifacts/vclol/src/components/PlayerTeamStatsCard.tsx` — per-team career stat card component

### Critical Pitfalls

1. **`useAuth()` drops `hasPuuid` and `rsoOptIn` — every RSO-gated component will be wrong** — Any component written before this fix will either duplicate `useGetAuthMe()` calls (two in-flight requests) or permanently show "not verified." Fix this hook before writing any other v3.3 component. Verified: `use-auth.ts` lines 44–52 vs `api.schemas.ts` lines 45–52. Fix is two lines.

2. **RSO OAuth implemented as data-fetch instead of browser navigation — flow silently fails** — Using the generated `useAuthConnectToken()` or `useAuthRso()` hooks fires a `fetch()` that follows the `302` redirect internally. The browser never leaves the SPA. The RSO authorization page at `auth.riotgames.com` is never reached. Use `window.location.href = \`${API_BASE}/api/auth/rso\`` instead. Architecture rule: OAuth = navigation, not fetch.

3. **In-memory session store destroyed on every Portainer redeploy — RSO flow unrecoverable** — Express-session defaults to `MemoryStore`. The RSO callback checks `req.query.state !== req.session.oauthState`. If the server restarts during the OAuth round-trip, the state is gone, the callback returns 403, and the used token cannot be reused. Add `connect-pg-simple` before shipping RSO. Verified: `app.ts` has no session store config; `DEPLOYMENT.md` documents the git-fetch-on-start redeploy behavior.

4. **Paginated API response spread as array — silent empty-page bug** — `[...matches]` where `matches` is `{ data: [], total, page, totalPages }` produces an empty array in JavaScript with no error thrown. Both `/matches` and `/players` currently show "No results." Fix: `const list = response?.data ?? []`. Verified: `Matches.tsx` lines 17–40, `api.schemas.ts` lines 737–742.

5. **Duplicate team rows in career resume — same team shown twice with identical stats** — `team_members` has no uniqueness constraint on `(playerId, teamId)`. A player who left and rejoined a team gets two membership rows. The career resume UI shows "Team Alpha" twice. Deduplicate by `teamId` before rendering (keep most recent `joinedAt`). Verified: `players.ts` lines 790–862, `.planning/v3.2-REVIEWS.md` MEDIUM severity finding.

---

## Implications for Roadmap

Based on combined research, four phases with clear dependency gates:

### Phase 1: Tech Debt Cleanup
**Rationale:** Three of the five critical pitfalls are pre-existing bugs that contaminate everything built after them. The `useAuth()` fix is a hard prerequisite — any RSO-gated component built before it will require rework after. These fixes are mechanical (no design decisions, no new patterns), take hours not days, and create a clean foundation. Ship these as a single batch before any feature work.
**Delivers:** Working `/matches` and `/players` pages; accurate RSO state available in `useAuth()`; VOD and private profile error states handled correctly; `vods.ts` TS errors resolved
**Addresses:** Pagination silent crash (Issues #225), `hasPuuid`/`rsoOptIn` forwarding, private profile 403 (Issue #227), VOD privacy graceful degradation (Issue #226)
**Avoids:** Pitfall 1 (useAuth drops fields — must fix before RSO UI), Pitfall 3 (pagination silent empty page), Pitfall 6 (vods.ts 21 TS errors block VOD work)

### Phase 2: RSO Backend + Session Store
**Rationale:** The RSO connect page cannot be tested end-to-end without the backend handlers. The session store must be persistent before any OAuth flow ships. Both are backend-only changes that unblock all Phase 4 frontend work. Building backend first allows isolated testing of the OAuth dance before wrapping it in React.
**Delivers:** Working `/api/auth/connect/:token`, `/api/auth/rso`, `/api/auth/rso/callback` handlers; PostgreSQL-backed session store via `connect-pg-simple`; `DEPLOYMENT.md` updated with `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI` entries
**Uses:** Existing hand-rolled fetch OAuth pattern from Discord auth in `auth.ts`; `connect-pg-simple` (only new dependency)
**Avoids:** Pitfall 2 (OAuth as fetch vs navigation — backend redirects, frontend navigates), Pitfall 9 (in-memory session destroyed on redeploy — P0 blocker for RSO), Pitfall 14 (no error URL for RSO failures — design redirect-to-`/connect?error=` pattern upfront)

### Phase 3: Player Career Resume
**Rationale:** Backend is done, hook is generated, design spec is complete. This is the highest-value visible feature with the lowest implementation risk. Independent of RSO — can ship to users as soon as Phase 1 is merged. No auth dependency means no blocking on Phase 2 timeline.
**Delivers:** Per-team career stat cards on PlayerProfile; `PlayerTeamStatsCard.tsx` component; `useGetPlayerTeamStats(player.id)` consumed for the first time
**Implements:** Career card layout per `docs/DESIGN_GUIDE.md` spec; sorted by `gamesPlayed` desc; inactive teams muted; team name links to `/teams/:id`
**Avoids:** Pitfall 4 (duplicate team rows — deduplicate by teamId before rendering), Pitfall 10 (N+1 ELO waterfall — use single `/team-stats` call, add `staleTime` to existing `useQueries`), Pitfall 15 (`isPrivate` type cast — verify generated type before building on top of PlayerProfile)

### Phase 4: RSO Connect Page + Dashboard CTA
**Rationale:** Final assembly — wire the frontend connect page to the working backend from Phase 2. Depends on Phase 1 (`useAuth()` fix) and Phase 2 (RSO backend routes). Lowest-complexity remaining work: the page is mostly loading/error states around a single `window.location.href` call. This phase completes the launch requirement.
**Delivers:** Working `/connect?token=<uuid>` page; App.tsx route registration; dashboard "Verify with Riot" button; post-RSO success toast on `/dashboard?rso=success`; expired token error state
**Addresses:** RSO Connect page (table stakes — launch blocker since v3.1), Login flow RSO connect step
**Avoids:** Pitfall 11 (route missing from App.tsx — add in same commit as component), Pitfall 12 (no RSO prompt after Discord login — surface CTA in dashboard banner), Pitfall 2 (OAuth as navigation — `window.location.href`, never hook), Integration 2 (bot/connect coupling — token expiry error message must be user-friendly)

### Phase Ordering Rationale

- Phase 1 is unconditional first: `useAuth()` fix is a hard blocker; pagination fix makes public pages functional now. These are hours of work with no design decisions. Get them out of the way immediately.
- Phase 2 before Phase 4: RSO frontend is a UI shell without the backend. Build and test the OAuth dance in isolation first. The session store fix is also a prerequisite — it cannot be retrofitted after the connect page ships.
- Phase 3 is independent: No auth dependency, no backend gaps. Can be developed in parallel with Phase 2 by a different workstream, or sequenced after Phase 1. Insert before Phase 4 to ensure the profile page is stable before adding another layer.
- Phase 4 is the integration gate: RSO is the launch requirement. No public launch until the connect flow works end-to-end. Phase 4 validates all prior phases.

### Research Flags

Phases needing implementation-time verification (not additional research, but first-use caution):

- **Phase 2 (RSO backend):** Production RSO client ID requires Riot approval. Build with development credentials; the flow will fail gracefully at `auth.riotgames.com` until the production key is approved. Track approval separately — it is a Riot dependency, not a code dependency. RSO endpoints are documented with HIGH confidence in STACK.md.

- **Phase 3 (Career resume first use):** `useGetPlayerTeamStats` has never been called from a frontend component. Call it and log the actual response before committing to the card layout. If fields are missing relative to `PlayerTeamStats` in `api.schemas.ts`, the OpenAPI spec and route are out of sync — fix spec, run codegen, then build UI.

- **Phase 4 (Connect page testing):** The bot sends users to `PLATFORM_URL/connect?token=`. In local development this points to production. To test the connect page locally, manually insert a row into `auth_sessions` with a known token value rather than waiting for a Discord bot interaction.

Phases with well-documented patterns (no additional research needed):
- **Phase 1 (Tech debt):** All fixes are mechanical changes to known files with known bugs. No design decisions required.
- **Phase 3 (Career resume component):** Design spec complete in `docs/DESIGN_GUIDE.md`. Backend contract verified. Standard Card/Badge pattern with existing UI primitives.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All findings from direct `package.json` and source file inspection. Zero speculation. No new dependencies required except `connect-pg-simple`. |
| Features | HIGH | Every feature verified against actual source files — what exists, what is broken, what is missing. Line numbers cited throughout FEATURES.md. |
| Architecture | HIGH | Auth state machine read from `App.tsx`, `auth.ts`, `use-auth.ts`. Component tree from direct file inspection. Build order derived from actual dependency graph. |
| Pitfalls | HIGH | All critical pitfalls verified by reading the specific lines where bugs exist. Severity grounded in concrete failure modes with reproduction steps. |

**Overall confidence:** HIGH

### Gaps to Address

- **RSO production key:** Riot must approve the RSO client ID before the flow can be tested against a real account. All backend code can be built and tested with a development key (or placeholder values). Track RSO production key approval separately from code delivery.

- **VOD error object shape from Orval custom fetch:** PITFALLS.md notes that the exact shape of the error object from the generated `customFetch` wrapper is unverified. Before implementing 403 handling in `VodDetail.tsx`, check `lib/api-client-react/src/lib/custom-instance.ts` to confirm whether `error.status` or `error.response?.status` is the correct accessor. Five-minute verification before writing the error branch.

- **`isPrivate` field in generated Player schema:** `PlayerProfile.tsx` uses `(player as any)?.isPrivate` (line 127), suggesting the field may not be in the generated `Player` type. Verify in `api.schemas.ts` before Phase 3 adds more sections to that component. If absent, add to `openapi.yaml`, run codegen, then proceed.

- **Session table for `connect-pg-simple`:** The `sessions` table is not in the Drizzle schema. Two options: let `connect-pg-simple` create it with `createTableIfMissing: true` (simplest, not tracked by Drizzle), or add a Drizzle migration (preferred for consistency). Decide at Phase 2 start.

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)

- `artifacts/vclol/src/hooks/use-auth.ts` lines 44–52 — confirmed `hasPuuid`/`rsoOptIn` not forwarded
- `artifacts/api-server/src/routes/auth.ts` (134 lines) — confirmed RSO routes absent
- `lib/api-client-react/src/generated/api.schemas.ts` — `AuthMeResponse`, `PlayerTeamStats`, `PaginatedPlayers`, `PaginatedMatches` shapes
- `lib/api-client-react/src/generated/api.ts` lines 2902–2963 — `useGetPlayerTeamStats` hook confirmed generated, never consumed
- `artifacts/vclol/src/pages/public/Matches.tsx` lines 17–40 — confirmed flat array usage of `PaginatedMatches`
- `artifacts/vclol/src/pages/public/Players.tsx` lines 38–39 — confirmed flat array usage of `PaginatedPlayers`
- `artifacts/vclol/src/pages/public/PlayerProfile.tsx` line 127 — confirmed `(player as any)?.isPrivate` type cast
- `artifacts/vclol/src/App.tsx` lines 43–84 — confirmed `/connect` route absent
- `artifacts/discord-bot/src/commands/connect.ts` line 59 — confirmed bot sends users to `${PLATFORM_URL}/connect?token=`
- `lib/api-spec/openapi.yaml` lines 193–235 (RSO route specs), lines 3550–3585 (`PlayerTeamStats` schema)
- `artifacts/api-server/src/routes/players.ts` lines 790–862 — no uniqueness constraint on `(playerId, teamId)` in career stats query
- `artifacts/api-server/src/app.ts` — confirmed no `connect-pg-simple` session store config
- `.planning/v3.2-REVIEWS.md` — Codex peer review: duplicate team rows (MEDIUM), localStorage ambiguity (LOW)
- `docs/DESIGN_GUIDE.md` lines 177–228 — Per-Team Career Card and Shareable Card specs
- `artifacts/vclol/src/pages/public/PlayerDashboard.tsx` lines 108–118 — RSO banner location verified

### Secondary (cross-referenced)

- Riot RSO OAuth endpoints (STACK.md, marked HIGH) — authorize URL, token exchange at `https://auth.riotgames.com/token`, PUUID fetch via `https://americas.api.riotgames.com/riot/account/v1/accounts/me`
- `connect-pg-simple` PostgreSQL session store — standard Express-session adapter, existing pattern in ecosystem

---
*Research completed: 2026-03-28*
*Supersedes: 2026-03-26 SUMMARY.md (v3.2-era general backend/security research)*
*Ready for roadmap: yes*
