# Domain Pitfalls

**Domain:** 5v5 LoL scrim recording platform — frontend feature additions (v3.3)
**Researched:** 2026-03-28
**Focus:** Adding RSO connect page, player career resume, frontend error handling, and login flow to existing React SPA with generated API hooks
**Supersedes:** 2026-03-26 version (general backend/infra pitfalls). See git history for archived version.

---

## How to Read This File

Pitfalls are sorted from most-likely-to-cause-a-rewrite to least. Each has a "Phase" callout so the roadmap can address it at the right time.

---

## Critical Pitfalls

Mistakes that cause a feature to be wrong from day one, require rewrites, or violate security/compliance.

---

### Pitfall 1: useAuth() Drops hasPuuid and rsoOptIn — Every Consumer Will Be Wrong

**What goes wrong:** The backend `GET /auth/me` returns `hasPuuid: boolean` and `rsoOptIn: boolean`. The generated `AuthMeResponse` type in `api.schemas.ts` (line 45-52) includes both fields. But `useAuth()` in `artifacts/vclol/src/hooks/use-auth.ts` only returns `playerId`, `isLoggedIn`, `playerIdNum`, `riotId`, `discordUsername`, `isLoading`, and `logout`. The two new fields are silently discarded at line 44-52 of that hook.

Every component written for v3.3 that needs to know whether the player has verified their RSO identity will either:
1. Call `useGetAuthMe()` directly (duplication, two in-flight requests per render), or
2. Assume `hasPuuid = false` permanently (UI always shows "verify your account" warning even for verified players).

The RSO connect page gating logic, the dashboard warning banner, and the "Connect Riot" CTA all depend on this field.

**Why it happens:** v3.2 added the fields to the backend and codegen but marked the frontend hook fix as deferred tech debt. Any new component written before this fix will hard-code its own data-fetching workaround.

**Consequences:** After fixing useAuth(), every workaround written before the fix will need to be removed. This is a rewrite-after-merge situation if the fix lands after components are built.

**Prevention:** Fix `useAuth()` first — before writing any component that depends on RSO state. The fix is one line: add `hasPuuid: data?.hasPuuid ?? false` and `rsoOptIn: data?.rsoOptIn ?? false` to the return object.

**Detection:** Grep for `useGetAuthMe` in `artifacts/vclol/src/` — any direct call from a page component (not the hook itself) means someone worked around the missing fields.

**Warning sign:** A component that imports both `useAuth` and `useGetAuthMe` is a strong signal that useAuth was found to be missing something.

**Phase:** Phase 1 (tech debt cleanup). Must complete before any RSO-gated component is written.

**Confidence:** HIGH — verified by reading use-auth.ts lines 44-52 and api.schemas.ts lines 45-52 side by side.

---

### Pitfall 2: RSO Connect Page Built as a Route, Not a State Machine — OAuth Flows Break Silently

**What goes wrong:** The `/connect?token=<uuid>` page involves three sequential async steps:
1. Validate the token against `auth_sessions` table via `GET /api/auth/connect/:token`
2. Redirect to Riot's auth server (`GET /api/auth/rso`)
3. Handle the callback at `GET /api/auth/rso/callback`

Steps 2 and 3 are server-side redirects — the user's browser leaves and returns. If the page is built as a simple React component that fires an effect on mount, the sequence breaks:

- The component fires `authConnectToken(token)`, which is a `302 Redirect`. Fetch follows the redirect but the browser never leaves the SPA. The RSO flow silently does nothing because `fetch()` follows `302` as a GET request within the same tab, losing the SPA context and ending up at whatever URL Riot redirects back to — which may not be handled by the SPA router.
- Even if the server responds with JSON `{ redirectUrl }` instead of a raw 302, a component that renders while the redirect is in progress will flash loading states or error states because `data` is undefined mid-redirect.
- The CSRF `state` parameter set in `req.session.oauthState` during `GET /api/auth/rso` must survive the round-trip through Riot's servers and back. If the session store is in-memory (current state), a server restart during the OAuth flow loses the state, causing a 403 on callback.

**Why it happens:** Developers treat OAuth as a data-fetch operation (call API, get data back). OAuth with server-side redirects is a navigation operation, not a data fetch.

**Consequences:** The RSO connect flow silently fails for some users. No error is shown because the component thinks the request succeeded (no `isError` flag on a redirect).

**Prevention:**
- The `/connect?token=<token>` page should use `window.location.href = /api/auth/connect/${token}` — a full-page navigation, not a fetch. Let the server handle the redirect chain entirely.
- The page's job is: show "connecting..." state, then navigate away. Not to receive a callback.
- The RSO callback lands on a server route. That route redirects to `/dashboard?rso=success` or `/connect?error=<reason>`. The React page at `/dashboard` reads the query param and shows a success toast.
- Fix the in-memory session store (Pitfall 9 in the previous research) before implementing RSO. A session that dies mid-OAuth flow causes a confusing 403 and leaves the user stuck.

**Warning sign:** Any use of `useAuthConnectToken()` or `useAuthRso()` React hooks (generated in api.ts) inside the connect page component. These are GET hooks that will not trigger browser navigation.

**Detection:** Check if `GET /api/auth/connect/:token` in auth.ts returns JSON or redirects. If it currently returns nothing (routes not implemented yet), this pitfall must be designed correctly from the start.

**Phase:** Phase 2 (RSO connect page). Architecture decision before implementation starts.

**Confidence:** HIGH — verified by reading auth.ts (RSO routes not implemented), connect.ts bot command, and api.ts generated hooks (lines 744, 831).

---

### Pitfall 3: Paginated API Response Used as Array — Matches Page Silently Shows Nothing

**What goes wrong:** `GET /api/matches` and `GET /api/players` now return `PaginatedMatches` and `PaginatedPlayers` objects:
```typescript
{ data: Match[], total: number, page: number, totalPages: number }
```

The `Matches.tsx` page (line 17) calls `useListMatches()` and then does `const filtered = useMemo(() => { if (!matches) return []; let list = [...matches]; ... }`. This spreads `matches` as if it were an array. When the API returns `{ data: [...], total: 17, page: 1, totalPages: 2 }`, `matches` is an object. `[...matches]` produces `[]` (spreading an object via array spread is a no-op in JS). The page silently shows "No matches yet" with no error.

The same applies to `Players.tsx` and any other paginated endpoint consumer.

**Why it happens:** The backend was paginated in v3.2 (#225) but the frontend pages were not updated. The generated hook returns whatever the endpoint returns — if the shape changed, the consumer breaks silently (TypeScript would catch this IF the generated types are used, but `useListMatches` infers its return type from the schema, and the schema change from `Match[]` to `PaginatedMatches` should cause a TS error — but only if the consumer actually types the variable, which `const { data: matches }` with destructuring does not enforce without explicit typing).

**Consequences:** Zero matches displayed on the public matches page. No error, no explanation. Users see "No matches recorded yet." and leave.

**Prevention:**
- When consuming paginated endpoints, always access `.data`: `const list = matches?.data ?? []`
- Add `totalPages`, `total`, and `page` to local state to enable pagination controls
- Check the generated `PaginatedMatches` type before writing any list page

**Detection:** Run `tsc --noEmit` in `artifacts/vclol/`. Any type error on `useListMatches` return value spreading into an array is this bug. Alternatively, open the network tab and compare actual API response shape to what the page renders.

**Phase:** Phase 1 (tech debt) or Phase 4 (frontend error handling). Fix before shipping the matches page publicly.

**Confidence:** HIGH — verified by reading Matches.tsx lines 17-40 and api.schemas.ts lines 737-742.

---

### Pitfall 4: Team-Stats Endpoint Returns Duplicate Rows — Career Resume Shows Same Team Twice

**What goes wrong:** The `GET /players/:id/team-stats` endpoint (players.ts lines 764-869) queries `team_members` with `.where(eq(teamMembersTable.playerId, id))` and returns one row per membership record. The `team_members` table has no uniqueness constraint on `(playerId, teamId)`. A player who left a team and was re-added (e.g., join, leave for a tournament, re-join) will have two rows for the same team, both returning identical aggregate stats (because stats are aggregated by teamId, then merged onto every membership row via `statsMap.get(m.teamId)`).

The career resume UI will show "Team Alpha" twice with identical W/L stats, making the player look like they were on two different teams with the same name.

**Why it happens:** Documented in v3.2-REVIEWS.md (Codex, MEDIUM severity). The fix was deferred to v3.3. The data model decision is: "one row per membership stint OR one row per team."

**Consequences:** Career resume page looks like a bug. Players with re-join history see duplicate team cards.

**Prevention:** Deduplicate in the API response before returning. Group by `teamId`, pick the highest-gamesPlayed membership (or latest by `joinedAt`), or explicitly document that multiple rows are intentional (one per stint) and label them with dates in the UI. The simplest safe fix: deduplicate by `teamId` before returning, keeping the row with the most recent `joinedAt`.

**Warning sign:** If the career resume component uses `teamId` as the React key for a list, duplicate teamIds cause React warnings ("duplicate key") which are visible in the browser console.

**Detection:** Query: `SELECT player_id, team_id, count(*) FROM team_members GROUP BY player_id, team_id HAVING count(*) > 1`. If any rows return, affected players will see duplicates.

**Phase:** Phase 3 (player profile / career resume). Fix in the API or UI before the career resume section is implemented.

**Confidence:** HIGH — verified by reading players.ts lines 790-862 and v3.2-REVIEWS.md.

---

### Pitfall 5: localStorage playerId Conflicts With Session Auth — Login State Is Ambiguous

**What goes wrong:** `useAuth()` currently treats a player as logged in if EITHER `localStorage.getItem("vclol_player_id")` is set OR `data?.authenticated` is true (line 40: `const isLoggedIn = !!localPlayerId || sessionAuth`). `playerIdNum` resolves to `localPlayerId` if set, otherwise `sessionPlayerId`.

This creates ambiguity in three scenarios:
1. A player logs in via Discord OAuth (sets session), then opens a second browser tab. The second tab has no localStorage entry for the new session, so `isLoggedIn` = false until localStorage is manually set. The player sees the logged-out state briefly.
2. A player's session expires (server restart, 24h TTL), but localStorage still has their old `vclol_player_id`. `isLoggedIn` = true, but all authenticated API calls fail with 401. The player sees their name but their data won't load.
3. During RSO connect flow, the page needs to know whether the player is logged in via Discord OAuth (session-based) BEFORE deciding to show the "verify riot" step. If localStorage playerId is from a previous session that no longer exists server-side, the page may incorrectly skip the Discord login step.

**Why it happens:** The localStorage fallback was added to support dev login flows where the session wasn't populated (documented in v3.2-REVIEWS.md, LOW severity). It is now a permanent split-source-of-truth.

**Consequences:** Stale localStorage causes phantom "logged in" state. Users see their name but API calls fail. RSO connect flow may skip required auth steps.

**Prevention:**
- For RSO gating, rely ONLY on `data?.authenticated` (server session), not `isLoggedIn`. The session is the authoritative source for "is this player currently authenticated."
- Add `hasPuuid` and `rsoOptIn` to useAuth() return (Pitfall 1) — these come from the server and are always accurate.
- When implementing the connect page flow, use `data?.authenticated` directly via `useGetAuthMe()` or the fixed `useAuth()` — never localStorage.
- Long-term: Remove localStorage altogether and rely on session. The Codex review flagged this explicitly (v3.2-REVIEWS.md, LOW).

**Detection:** In browser devtools, manually set `localStorage.setItem('vclol_player_id', '999')` for a non-existent player. The dashboard should show an error state, not a loading skeleton forever. If it shows loading forever, the localStorage override is masking a 404 from the player API.

**Phase:** Phase 1 (tech debt). Understanding this pitfall is essential before writing any RSO-gated UI.

**Confidence:** HIGH — verified by reading use-auth.ts lines 25-52 and v3.2-REVIEWS.md.

---

## Moderate Pitfalls

---

### Pitfall 6: vods.ts Has 21 TypeScript Errors — Build Fails If TS Is Run Strictly

**What goes wrong:** `artifacts/api-server/src/routes/vods.ts` has 21 `TS7006` errors (implicit `any` on function parameters), documented in `.planning/phases/04.1-v3.1-bug-fixes/04.1-01-VERIFICATION.md` and confirmed unresolved in v3.2-REVIEWS.md. These are suppressed at runtime because `tsx` (used in dev) does not enforce type checking, and `esbuild` (used in production build) ignores TypeScript errors. However:

1. Running `tsc --noEmit` at the repo level as a pre-commit check or CI step will fail, blocking automated deploys.
2. The errors make it harder to add VOD privacy features (#226) because the IDE reports noise in vods.ts, obscuring real type errors in new code.
3. If the project ever adds `strict: true` to tsconfig, these become blocking.

**Prevention:** Fix the 21 errors before adding VOD privacy handling. Each `TS7006` is a missing parameter type annotation. Add explicit types for all callback parameters in the `filter()`, `map()`, and similar array method calls in vods.ts.

**Detection:** Run `cd artifacts/api-server && npx tsc --noEmit` and count errors in vods.ts.

**Phase:** Phase 1 (tech debt). Fix before writing any VOD privacy feature (#226).

**Confidence:** HIGH — documented in multiple planning artifacts.

---

### Pitfall 7: Private Profile Returns 403 — Frontend Crashes Instead of Showing "Profile is Private"

**What goes wrong:** `GET /api/players/:riotId` returns `403 { error: "Player profile is private" }` for private profiles viewed by non-owners (issue #227). `PlayerProfile.tsx` currently checks `isError` which is `true` for any error status including 403, and renders "Player not found." (line 149-159).

A private player's profile shows "Player not found." with a back link. This is:
1. Incorrect: the player exists, their profile is just private
2. Confusing for users who received a link to someone's profile
3. The wrong UX for the privacy model (the player wants others to know they exist but not see their stats)

**Prevention:** Distinguish 403 from 404 in the error handler. TanStack Query exposes the HTTP status via `error.response?.status` (for Axios) or `error.status` (if the generated client uses fetch and returns errors with a status field). Check the actual error object shape from Orval-generated hooks and branch: `isPrivate` → show locked profile card (the private state UI already exists in PlayerProfile.tsx lines 162-206). `isNotFound` → show "Player not found."

**Warning sign:** If the generated hook throws all errors as the same type without exposing the HTTP status code, additional plumbing is needed (custom query error transformer or checking the raw response).

**Detection:** Navigate to a private player's profile while logged out. If you see "Player not found." rather than a locked profile card, this bug is active.

**Phase:** Phase 4 (frontend error handling, issue #227).

**Confidence:** HIGH — verified by reading PlayerProfile.tsx lines 149-159 and players.ts privacy gate logic.

---

### Pitfall 8: VOD Privacy — Private Match VODs Are Requested and Fail, No Graceful Degradation

**What goes wrong:** `VodDetail.tsx` and `Vods.tsx` fetch VOD data and render video embeds. For VODs linked to private matches, the server returns a filtered response (no `videoUrl`) or a 403 depending on match visibility. The current frontend has no branch for "I have a VOD record but cannot access the video" (issue #226).

Two failure modes:
1. `videoUrl` is present in the VOD record but the match is private → The embed iframe loads but shows a "this video is private" error from the video host (e.g., YouTube). Confusing UX.
2. The API returns 403 for the VOD entirely → The component crashes into the generic error state.

**Prevention:** Check for the absence of `videoUrl` and render a "VOD not available" placeholder instead of an empty iframe. For 403 responses, render a locked-card UI similar to the private player profile.

**Detection:** Navigate to a VOD linked to a private match. If an empty iframe or a video host error is shown, this is active.

**Phase:** Phase 4 (frontend error handling, issue #226).

**Confidence:** MEDIUM — behavior depends on whether the API filters `videoUrl` out or returns 403. Requires testing against the actual API.

---

### Pitfall 9: In-Memory Session Store Loses Sessions on Deploy — RSO Flow Is Broken at Launch

**What goes wrong:** Express-session defaults to `MemoryStore`. Every Portainer container restart (which happens on every deploy via the git-fetch-on-start mechanism in `entrypoint.bot.sh`) destroys all active sessions. For most features this is annoying (users have to log in again). For RSO OAuth, it is a hard failure:

The RSO flow sets `req.session.oauthState` during the redirect to Riot's auth server. If the server restarts between the user leaving the site (redirect to Riot) and returning (callback), the `oauthState` is gone. The callback handler checks `req.query.state !== req.session.oauthState` and returns 403. The user sees a generic error and their RSO verification fails permanently (the token they used is now spent, so they must request a new one from Discord).

**Prevention:** Add `connect-pg-simple` as the session store before implementing RSO. The PostgreSQL database is already available. This is a one-time setup:
```typescript
import pgSession from "connect-pg-simple";
const PgStore = pgSession(session);
// store: new PgStore({ pool, tableName: "sessions" })
```
This was identified as a P1 risk in the previous PITFALLS.md (Pitfall 9, 2026-03-26 version). It must be resolved before the RSO connect page ships.

**Detection:** Log in via Discord. Restart the API server via Portainer. Attempt to access the dashboard. If redirected to login, sessions are in-memory.

**Phase:** Phase 2 (RSO connect page, pre-requisite). Cannot ship RSO without this.

**Confidence:** HIGH — verified in codebase (app.ts, no store config), Portainer restart behavior documented in DEPLOYMENT.md.

---

### Pitfall 10: Career Resume Page Fetches Per-Team ELO History via useQueries — N+1 Waterfall

**What goes wrong:** `PlayerProfile.tsx` contains `EloTrajectoryInner` (lines 20-121) which uses `useQueries` to fetch ELO history for each team the player has been on:
```typescript
const eloQueries = useQueries({
  queries: teams.map((t) => ({
    queryKey: getGetTeamEloHistoryQueryKey(t.teamId),
    queryFn: ({ signal }) => getTeamEloHistory(t.teamId, { signal }),
  }))
});
```

For a player on 3 teams, this fires 3 sequential ELO history requests after the player profile loads. For a player on 5 teams (the max roster size limit is 15, but a player could have been on many teams over time), this is 5 requests. Each request is ~20-50ms on a fast connection but 200-500ms on a slow one. The visual result is a chart that loads noticeably late after the profile data appears.

The career resume cards (`GET /players/:id/team-stats`) add another request. Total page load can involve 7+ serial requests.

**Prevention:**
- For the v3.3 career resume addition: the `useGetPlayerTeamStats` hook from generated code provides per-team stats in a single request. Use this for the career cards, not separate ELO history fetches.
- For ELO charts specifically: keep `useQueries` but add `staleTime: 5 * 60 * 1000` (5 minutes) so repeat visits don't re-fetch.
- Consider whether the ELO chart is needed for v3.3 MVP. If the data is already fetched via existing code and the chart exists, keep it. If adding it new, defer to a polish phase.

**Detection:** Open the browser network tab while loading a player profile with 3+ teams. Count requests fired in the waterfall. More than 5 requests is a flag.

**Phase:** Phase 3 (player profile). Awareness issue — don't add more per-team fetches on top of the existing waterfall.

**Confidence:** HIGH — verified by reading PlayerProfile.tsx lines 20-35.

---

### Pitfall 11: RSO Connect Page Route Does Not Exist in App.tsx — 404 on Link Click

**What goes wrong:** The bot's `/connect` command sends `${PLATFORM_URL}/connect?token=${token}` to users. There is no `<Route path="/connect" />` in `App.tsx` (lines 44-86). Visiting `/connect?token=<uuid>` renders the `NotFound` component.

This is the most user-visible possible failure: the first interaction players have with the website is a 404 page.

**Why it happens:** The RSO connect page is listed as a v3.3 target (PROJECT.md Active requirements). It has not been built yet. But the bot has been directing users to this URL since v3.1 (connect.ts line 59).

**Prevention:** Add the route to App.tsx in the same commit that creates the Connect page component. Route: `<Route path="/connect" component={Connect} />`. Also confirm the bot's `PLATFORM_URL` env var matches the production domain.

**Detection:** Run the bot `/connect` command in Discord and click the generated link. If it shows "not found," the route is missing.

**Phase:** Phase 2 (RSO connect page). Day-one requirement.

**Confidence:** HIGH — verified by reading App.tsx and connect.ts.

---

### Pitfall 12: Login Flow Has No RSO Prompt Step — Players Land on Dashboard Without PUUID

**What goes wrong:** After Discord OAuth login, `auth.ts` redirects directly to `/dashboard` (line 74-76). The dashboard currently checks `player.riotId.startsWith("pending") || !player.puuid` (PlayerDashboard.tsx line 108) and shows a warning banner. But the warning is dismissible-by-scrolling — there is no forced step that tells the player "you must connect Riot before continuing."

The issue (#199 based on PROJECT.md context) is that the login flow needs an RSO connect step. Without it:
1. Players complete Discord login, land on dashboard
2. See the pending-PUUID warning but don't understand what to do
3. Don't run `/connect` in Discord
4. Their profile stays in `pending_*` state permanently

**Prevention:** After Discord OAuth, check `player.puuid`. If null, redirect to `/connect-riot` (or show a modal) explaining the RSO step. The RSO step can be optional for returning users (they can skip it), but it must be surfaced prominently on first login.

**Alternatively:** The `GET /api/auth/discord/callback` server route can detect `!existing.puuid` and redirect to `/connect-riot` instead of `/dashboard`.

**Detection:** Create a test player with `puuid = null`. Log in via Discord. If you land directly on the dashboard with only a yellow banner, the RSO prompt step is missing.

**Phase:** Phase 2 (RSO connect page) or a dedicated login-flow phase.

**Confidence:** HIGH — verified by reading auth.ts lines 71-81 and PlayerDashboard.tsx lines 108-118.

---

## Minor Pitfalls

---

### Pitfall 13: Generated Hook staleTime Not Set — auth/me Refetches on Every Tab Focus

**What goes wrong:** `useAuth()` sets `staleTime: 30_000` (line 20-23), which is good. But if any component calls `useGetAuthMe()` directly (a workaround for Pitfall 1), it uses the default `staleTime: 0`. Every time the user focuses the browser tab, TanStack Query refetches `/api/auth/me`. For a session-based endpoint, this is wasted traffic and can cause visual flickering (authenticated → loading → authenticated).

**Prevention:** If any component must call `useGetAuthMe()` directly, always pass `{ query: { staleTime: 30_000, retry: false } }`. After Pitfall 1 is fixed and `useAuth()` forwards `hasPuuid`/`rsoOptIn`, there should be no need to call `useGetAuthMe()` directly from components.

**Phase:** Phase 1 (tech debt).

**Confidence:** MEDIUM — based on TanStack Query defaults behavior.

---

### Pitfall 14: RSO Callback Error State Has No User-Facing Route

**What goes wrong:** When RSO fails (invalid state, Riot rejects the token, user denies permission), the server needs to redirect to an error page. There is no `/connect/error` or `/connect?error=<reason>` route in App.tsx. Errors during RSO callback currently result in either a JSON response (if no redirect is implemented) or a redirect to `/` (if a default fallback is used).

**Prevention:** Decide on the error URL pattern before implementing the RSO callback handler. Recommend: redirect to `/connect?error=<reason>` and have the Connect page component read the `error` query param to show an appropriate message.

**Phase:** Phase 2 (RSO connect page). Design decision before implementation.

**Confidence:** MEDIUM — auth.ts RSO routes are not yet implemented, so the error handling pattern is still open.

---

### Pitfall 15: Player Profile Page Uses (player as any).isPrivate — TypeScript Bypassed

**What goes wrong:** `PlayerProfile.tsx` line 127: `const isPrivate = !!(player as any)?.isPrivate`. Using `as any` means TypeScript cannot catch if the API removes or renames the `isPrivate` field. If `GET /api/players/:riotId` changes to return a different privacy indicator (e.g., `profileVisibility: "private"` instead of `isPrivate: true`), the privacy gate silently stops working — private profiles show as public.

**Prevention:** Check the actual generated type for `useGetPlayer` response. If `isPrivate` is defined in the schema, access it via the typed interface. If it is not in the generated schema (meaning it is added ad-hoc in the route response), add it to `openapi.yaml` and regenerate.

**Detection:** Run `tsc --noEmit` in `artifacts/vclol/`. An `as any` cast that bypasses a missing property will not produce an error — but the property not being in the generated type IS the signal. Check `api.schemas.ts` for `isPrivate` on the `Player` interface.

**Phase:** Phase 3 (player profile) — verify the type contract before building on top of this component.

**Confidence:** HIGH — verified by reading PlayerProfile.tsx line 127.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation | Priority |
|-------------|---------------|------------|----------|
| Tech debt cleanup | useAuth() drops hasPuuid/rsoOptIn | Fix hook before writing RSO-gated components | P0 |
| Tech debt cleanup | vods.ts 21 TS errors | Fix type annotations before adding VOD privacy | P1 |
| Tech debt cleanup | Paginated API used as array | Access `.data` property in all list consumers | P0 |
| Tech debt cleanup | localStorage/session ambiguity | Understand the dual-source logic before RSO | P1 |
| RSO connect page | OAuth flow uses fetch instead of navigation | Use `window.location.href`, not hooks | P0 |
| RSO connect page | Route missing from App.tsx | Add route in same commit as component | P0 |
| RSO connect page | In-memory session dies during OAuth round-trip | Add connect-pg-simple before shipping RSO | P0 |
| RSO connect page | No error URL for RSO callback failure | Design error redirect pattern upfront | P1 |
| Login flow | No RSO prompt after Discord login | Detect puuid=null in callback, surface connect step | P1 |
| Player career resume | Duplicate team rows from team_members | Deduplicate by teamId in API or UI | P1 |
| Player career resume | N+1 ELO history fetches in useQueries | Add staleTime, don't add more per-team fetches | P2 |
| Player career resume | `as any` isPrivate cast | Verify type contract against generated schema | P2 |
| Frontend error handling | 403 vs 404 conflated on private profile | Branch on status code in PlayerProfile.tsx | P1 |
| Frontend error handling | VOD iframe empty for private match VOD | Check videoUrl presence, show placeholder | P1 |

---

## Integration Pitfalls

These arise specifically from adding new features ON TOP OF the existing system.

### Integration 1: New Pages That Call useAuth() Will Get Stale hasPuuid Until the Hook Is Fixed

Any page committed before Pitfall 1 is resolved will either have a workaround (direct `useGetAuthMe()` call) or will render incorrect RSO state. The fix must be merged first, not alongside new pages.

**Recommended commit order:** `fix: forward hasPuuid and rsoOptIn in useAuth()` → then any RSO-gated page.

### Integration 2: The /connect Page and the Bot /connect Command Are a Coupled System

The `/connect?token=<uuid>` URL is generated by the Discord bot (connect.ts line 59). The token expires in 10 minutes (TOKEN_EXPIRY_MS). The frontend page must validate the token server-side (`GET /api/auth/connect/:token`) before redirecting to RSO. A token that arrives at the frontend after expiry must show a clear "this link has expired — run /connect again" message, not a generic error.

The bot generates the URL for `process.env.PLATFORM_URL` which defaults to `https://vclol.gg`. In development, this means the dev server receives no tokens from the bot unless `PLATFORM_URL` is overridden locally.

**Prevention:** During development, test the connect page by constructing a token manually in the database or by temporarily pointing `PLATFORM_URL` to `http://localhost:5173`.

### Integration 3: Team-Stats Career Cards Need a New Generated Hook Not Currently Consumed

`GET /api/players/:id/team-stats` was implemented in v3.2 and codegen was run — the hook `useGetPlayerTeamStats` exists in `api.ts`. But it has never been called from a frontend component. First use may surface type mismatches between the documented response shape and what the hook actually returns (v3.2-REVIEWS.md MEDIUM: "delivered a contract, not a proven UI path").

**Prevention:** Before designing the career resume card layout, call `useGetPlayerTeamStats` and log the actual response shape. Validate against the `PlayerTeamStat[]` type in `api.schemas.ts`. If any field is missing, the OpenAPI spec and route response are out of sync — fix spec first, run codegen, then build UI.

---

## Sources

- Codebase inspection: `artifacts/vclol/src/hooks/use-auth.ts`, `artifacts/vclol/src/pages/public/PlayerProfile.tsx`, `artifacts/vclol/src/pages/public/PlayerDashboard.tsx`, `artifacts/vclol/src/pages/public/Matches.tsx`, `artifacts/vclol/src/App.tsx`, `artifacts/api-server/src/routes/auth.ts`, `artifacts/api-server/src/lib/session.ts`, `artifacts/discord-bot/src/commands/connect.ts`
- `lib/api-client-react/src/generated/api.schemas.ts` — AuthMeResponse, PaginatedMatches, PaginatedPlayers types
- `.planning/v3.2-REVIEWS.md` — Codex peer review identifying HIGH and MEDIUM risks carried into v3.3
- `.planning/PROJECT.md` — Active requirements list for v3.3, known tech debt
- Previous PITFALLS.md (2026-03-26) — In-memory session store, OAuth state parameter, architectural pitfalls
