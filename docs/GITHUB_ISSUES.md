# VCLoL GitHub Issues — Paste these into GitHub

Go to: https://github.com/xiNeRoar/lolproject/issues/new

Create each issue below. Set Labels and Milestone as indicated.

---

## MILESTONE: Bot MVP
Label options to create first: `claude`, `replit`, `bug`, `backend`, `frontend`, `blocked`

---

### Issue #1
**Title:** [Claude] .rofl parser lib
**Labels:** claude, backend
**Milestone:** Bot MVP

**Body:**
Create `artifacts/discord-bot/src/lib/rofl-parser.ts`.

.rofl format: ROFL2 magic bytes `52 49 4F 54 02 00` at offset 0. Metadata JSON located near end of file — scan backward from EOF for `{`. Deserialize as `PlayerStats2[]` array (10 entries for 5v5).

Required output per player entry:
- `RIOT_ID_GAME_NAME` + `RIOT_ID_TAG_LINE` → display name
- `PUUID` → identity resolution key
- `SKIN` → champion name
- `TEAM` (100 = blue, 200 = red)
- `WIN` (boolean)
- `CHAMPIONS_KILLED`, `NUM_DEATHS`, `ASSISTS`
- `MINIONS_KILLED`, `NEUTRAL_MINIONS_KILLED` → CS
- `GOLD_EARNED`, `TOTAL_DAMAGE_DEALT_TO_CHAMPIONS`, `VISION_SCORE`, `LEVEL`
- `ITEM0`–`ITEM6`, `SUMMONER_SPELL_1`, `SUMMONER_SPELL_2`
- `gameMode`, `mapId` (for validation — must be CLASSIC + mapId 11)

Also extract from top-level metadata: `gameLength` (duration in ms), `gameVersion` (patch), `gameId`.

**Acceptance criteria:**
- Parse a real current-patch .rofl file
- All 10 player entries returned with above fields populated
- Function throws with descriptive error on invalid magic bytes
- Function throws on non-CLASSIC gameMode or mapId ≠ 11

**Reference:** `docs/BOT_SPEC.md` → /submit flow steps 2-4

---

### Issue #2
**Title:** [Claude] team-matcher lib
**Labels:** claude, backend
**Milestone:** Bot MVP

**Body:**
Create `artifacts/discord-bot/src/lib/team-matcher.ts`.

Given 10 parsed player entries (from rofl-parser), identify which registered team each side belongs to.

Algorithm:
1. For each side (TEAM=100 and TEAM=200), collect all PUUIDs from that side's 5 players
2. Query `team_members` JOIN `players` for matching PUUIDs (`players.puuid IN (...)`)
3. Also query by riotId as fallback: `players.riotId IN (...)` where riotId = `RIOT_ID_GAME_NAME#RIOT_ID_TAG_LINE`
4. For each team in results, count how many of that team's members appear in this side
5. Team with 3+ matches = identified. Return `teamId` or `null`.

Output: `{ sideA: { teamId: number | null, matchedPlayers: MatchedPlayer[] }, sideB: { ... } }`

Where `MatchedPlayer = { puuid, riotId, playerId: number | null }` — includes players even if unmatched to a team.

**Acceptance criteria:**
- Returns correct teamIds when both teams are registered
- Returns null for unregistered side (graceful, not error)
- Minimum 3 PUUID matches required (not just 1)
- Falls back to riotId match when puuid not yet in DB

**Reference:** `docs/BOT_SPEC.md` → /submit flow step 8, Defect 2 design

---

### Issue #3
**Title:** [Claude] Bot: /register-team command
**Labels:** claude, backend
**Milestone:** Bot MVP

**Body:**
Create `artifacts/discord-bot/src/commands/register-team.ts`.

Full flow per `docs/BOT_SPEC.md` → /register-team section.

Key requirements:
- Rate limit: check `SELECT COUNT(*) FROM teams WHERE captainPlayerId = ? AND createdAt > NOW() - INTERVAL '24 hours'`. If > 0, reject.
- If invoker has no player record: create one (`discordId` + `discordUsername` set, `riotId = "pending"`)
- Validate: team name unique, tag is 2-5 uppercase alphanumeric, tag unique (both have UNIQUE constraints — catch 23505 error code)
- Insert `teams` row, insert `team_members` row (captain as first member)
- Reply embed: team created confirmation + "Use /add to add teammates. Link your Riot ID: /link-riot YourName#TAG"

Error messages per BOT_SPEC.md Error Handling table.

**Acceptance criteria:**
- Creates team + team_members row in DB
- Rate limit blocks second team within 24h
- Duplicate name → clear error
- Tag validation enforced

---

### Issue #4
**Title:** [Claude] Bot: /add command (dual-mode)
**Labels:** claude, backend
**Milestone:** Bot MVP

**Body:**
Create `artifacts/discord-bot/src/commands/add.ts`.

Full flow per `docs/BOT_SPEC.md` → /add section.

Key requirements:
- Accept BOTH `@DiscordMention` AND `RiotName#TAG` as input
- If captain is captain of multiple teams: show Discord select menu "Which team?"
- If player record doesn't exist: create shell record (Discord mention → discordId set; RiotId → riotId set, discordId null)
- Check: already on team? → reject
- Insert `team_members` row
- DM the added player (if discordId known): "You've been added to {team}. Link your Riot ID: /link-riot. If mistake: /leave."

**Acceptance criteria:**
- Both input modes work
- Multi-team captain gets disambiguation menu
- DM sent to added player when discordId available
- Existing member rejected with clear message

---

### Issue #5
**Title:** [Claude] Bot: /submit command (core match recording flow)
**Labels:** claude, backend
**Milestone:** Bot MVP

**Body:**
Create `artifacts/discord-bot/src/commands/submit.ts`.

This is the core of the entire platform. Full flow per `docs/BOT_SPEC.md` → /submit section.

Key requirements:
1. Download .rofl attachment (reject if > 8MB with fallback message)
2. Validate magic bytes (via rofl-parser from #1)
3. Validate gameMode=CLASSIC + mapId=11
4. Check ban status for all 10 players (query `player_bans` table)
5. Identity resolution per player (PUUID → player record, then riotId fallback) via team-matcher from #2
6. **Both teams identified:** Create match row + 10 match_players rows + calculate ELO for both teams + write elo_history + store .rofl file
7. **One/both teams unidentified:** Create match row with null teamId(s) + 10 match_players rows + NO ELO update + inform with `/claim-match` hint
8. Notification: for each of 10 players with known playerId + discordId, create notification row (bot poller will DM)
9. Embed reply: match summary with linked vs unlinked player indicators

ELO update: use `lib/elo.ts` calculateElo(), read kFactor from ladderSettings table.
Update `teams.wins`, `teams.losses`, `teams.lastMatchAt`.

**Acceptance criteria:**
- Match recorded in DB with 10 match_players rows
- ELO updated for both known teams
- Graceful handling when one team not registered (no crash, match still recorded)
- Embed reply shows match result with team names and ELO deltas

---

### Issue #6
**Title:** [Claude] Bot: /link-riot command
**Labels:** claude, backend
**Milestone:** Bot MVP

**Body:**
Create `artifacts/discord-bot/src/commands/link-riot.ts`.

Full flow per `docs/BOT_SPEC.md` → /link-riot section.

Key requirements:
- Find invoker's player record by discordId
- If no record: reject "Ask a team captain to /add you first"
- Check riotId uniqueness (UNIQUE constraint — catch 23505)
- If RIOT_API_KEY env var set: validate via Riot ACCOUNT-V1 API, get PUUID
- Update `players.riotId` and `players.puuid`
- Retroactive claim: `UPDATE match_players SET playerId = {id} WHERE puuid = {puuid} AND playerId IS NULL`
- Reply with count of claimed match records

**Acceptance criteria:**
- Updates player riotId and puuid in DB
- Retroactively claims match_players rows
- Duplicate riotId rejected with clear error
- Works without RIOT_API_KEY (trust-based mode)

---

### Issue #7
**Title:** [Replit] Wire use-auth.ts to Discord OAuth session
**Labels:** replit, frontend
**Milestone:** Bot MVP

**Body:**
Replace localStorage stub in `src/hooks/use-auth.ts` with real session call.

Current (stub):
```ts
const id = localStorage.getItem("vclol_player_id");
return { playerId: id ? Number(id) : null, isLoggedIn: !!id };
```

Target:
```ts
const { data } = useGetAuthMe(); // from @workspace/api-client-react
return {
  playerId: data?.playerId ?? null,
  isLoggedIn: data?.authenticated ?? false,
  riotId: data?.riotId ?? null,
};
```

Backend `/auth/me` endpoint already exists and returns `AuthMeResponse`.
Backend `/auth/discord` (redirect) and `/auth/discord/callback` already exist.

Also update `PlayerLogin.tsx`: Discord OAuth button should link to `${API_BASE}/auth/discord` (real redirect), not placeholder.

Keep `DevLogin.tsx` using localStorage — dev-only, acceptable.

**Acceptance criteria:**
- `useAuth()` reflects actual session, not localStorage
- Logging in via Discord OAuth sets session and `useAuth()` returns correct playerId
- Logging out clears session
- DevLogin still works for development

---

## MILESTONE: Web V1

---

### Issue #8
**Title:** [Claude] Bug: GET /matches/:id has no visibility check
**Labels:** claude, backend, bug
**Milestone:** Web V1

**Body:**
`GET /matches/:id` returns full per-player stats to anyone with no auth check. This exposes private match strategy to opponents.

Fix: Add visibility gate after fetching match, before building response.

Access rule: player must be active member of teamA OR teamB (check `team_members` table, NOT `match_players`).

For non-members viewing a private match: return **redacted response** (not 403):
```json
{
  "id": 42,
  "sideAName": "TeamAlpha",
  "sideBName": "TeamBeta",
  "winnerName": "TeamAlpha",
  "matchPlayers": [],
  "vods": [],
  "visibleAfter": "2026-03-27T00:00:00Z",
  "_private": true
}
```

For unauthenticated visitors: same redacted response.
For admin session: always full response.
For public matches (visibleAfter passed): full response for everyone.

**Reference:** `docs/USER_JOURNEYS.md` J-01. `docs/CLAUDE.md` Visibility Rules.

**Acceptance criteria:**
- Unauthenticated user: gets redacted response for private match
- Team member: gets full response for their private match
- Non-member logged-in: gets redacted response
- Admin: always full response
- Public match: full response for everyone

---

### Issue #9
**Title:** [Claude] Bug: GET /matches/:id/replay uses wrong access check
**Labels:** claude, backend, bug
**Milestone:** Web V1

**Body:**
`GET /matches/:id/replay` checks `match_players` table to verify access. Should check `team_members`.

A team captain who didn't play in a match (coach, rotation) cannot download the .rofl file for their own team's match.

Fix: Replace `match_players` query with `team_members` query (same pattern as #8 fix).

**Acceptance criteria:**
- Team member who didn't play can download their team's .rofl
- Non-team-member cannot download private match .rofl (403)

---

### Issue #10
**Title:** [Claude] OpenAPI: add team member mutation endpoints + run codegen
**Labels:** claude, backend
**Milestone:** Web V1

**Body:**
Backend already has `POST/PUT/DELETE /api/teams/:id/members` in `teams.ts` route (admin-only), but OpenAPI spec only has the GET endpoint. Codegen therefore doesn't generate mutation hooks.

Add to `openapi.yaml` under `/teams/{id}/members`:
- `POST` → `operationId: addTeamMember` → body: `{playerId, role?}` → returns `TeamMember`
- Under `/teams/{id}/members/{memberId}`:
  - `PUT` → `operationId: updateTeamMember` → body: `{role?, status?}` → returns `TeamMember`
  - `DELETE` → `operationId: removeTeamMember` → returns `SuccessResponse`

Run codegen after. Verify generated hooks exist:
- `useAddTeamMember`
- `useUpdateTeamMember`
- `useRemoveTeamMember`

**Acceptance criteria:**
- codegen runs without errors
- Three new hooks present in `lib/api-client-react/src/generated/api.ts`

---

### Issue #11
**Title:** [Claude] Score validation for BO1/BO3/BO5
**Labels:** claude, backend
**Milestone:** Web V1

**Body:**
Admin can currently enter "99-0" as a score for BO1. Add server-side validation.

Add `validateScore(format: string, score: string): boolean` to `matches.ts`:
- BO1: only "1-0"
- BO3: "2-0" or "2-1"
- BO5: "3-0", "3-1", or "3-2"
- Unknown formats: pass through

Apply in both `POST /` and `PUT /:id` handlers when both format and score are provided.
Return 400 with descriptive error message on invalid combination.

No OpenAPI change needed — this is server-side enforcement only.

**Acceptance criteria:**
- POST /matches with format=BO1, score=2-0 → 400
- POST /matches with format=BO3, score=2-1 → 201
- POST /matches with no score → passes (score optional)

---

### Issue #12
**Title:** [Claude] ELO baseline row on team creation
**Labels:** claude, backend
**Milestone:** Web V1

**Body:**
When a new team is created, no `elo_history` row is written. The ELO chart on TeamProfile starts from the first match instead of showing the baseline 1000.

Fix: In `POST /teams` handler, after successful insert, write:
```typescript
await db.insert(eloHistoryTable).values({
  teamId: row.id,
  elo: row.teamElo,  // usually 1000
  delta: 0,
  reason: "registration",
  matchId: null,
});
```

**Acceptance criteria:**
- New team has elo_history entry with reason="registration", elo=1000, delta=0
- TeamProfile ELO chart shows baseline starting point

---

### Issue #13
**Title:** [Claude] lastMatchAt column + team auto-inactive scheduler
**Labels:** claude, backend
**Milestone:** Web V1

**Body:**
PRD Section 8: teams inactive for 30 days auto-removed from leaderboard.
Currently `isActive` is manual admin-only. No automation exists.

**Schema (Layer 2, add freely):**
- `teams.lastMatchAt: timestamp("last_match_at")` — nullable
- `team_members.lastActiveAt: timestamp("last_active_at")` — nullable

**Route update:**
In `POST /matches` (and bot's match creation), after successful match creation:
```typescript
await db.update(teamsTable)
  .set({ lastMatchAt: new Date(), updatedAt: new Date() })
  .where(inArray(teamsTable.id, [teamAId, teamBId].filter(Boolean)));
```

**Scheduler:**
Create `artifacts/api-server/src/schedulers/teamInactivity.ts`:
```typescript
export function startTeamInactivityScheduler() {
  setInterval(async () => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await db.update(teamsTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(teamsTable.isActive, true),
        isNotNull(teamsTable.lastMatchAt),
        lt(teamsTable.lastMatchAt, cutoff)
      ));
  }, 6 * 60 * 60 * 1000); // every 6 hours
}
```

Import and call in `artifacts/api-server/src/index.ts`.

Update OpenAPI: add `lastMatchAt?: string | null` to Team schema. Run codegen.

Update `docs/SCHEMA_CONTRACT.md` with new columns.

**Acceptance criteria:**
- lastMatchAt updated when match is created
- Scheduler runs and sets isActive=false for teams with no match in 30 days
- Active team that submits new match becomes active again (lastMatchAt updated → no longer < cutoff)

---

### Issue #14
**Title:** [Claude] Captain self-service endpoints: transfer, settings, bulk visibility
**Labels:** claude, backend
**Milestone:** Web V1

**Body:**
Captain needs web-based team management. Three new capabilities:

**1. Transfer captain**
`PUT /api/teams/:id/transfer-captain`
- Auth: `req.session.playerId` must be current `captainPlayerId`
- Body: `{ newCaptainPlayerId: number }`
- Validate: newCaptainPlayerId must be active team member
- Update `teams.captainPlayerId`
- Log to admin_actions

**2. Team settings (name + tag)**
`PUT /api/teams/:id/settings`
- Auth: captain or admin
- Body: `{ name?: string, tag?: string }`
- Same tag validation (2-5 uppercase alphanumeric)
- Catch 23505 for duplicate name/tag

**3. Default match visibility**
Schema: Add `defaultMatchVisibility: text("default_match_visibility").default("participants")` to `teams` table.
Values: `"private" | "participants" | "public"`.
Update team creation to inherit this default for new matches.

`PUT /api/teams/:id/settings` already (or extend) accepts `defaultMatchVisibility`.

**4. Bulk visibility**
`PUT /api/teams/:id/matches/visibility`
- Auth: captain or admin
- Body: `{ visibility: "public" | "private" | "default", matchIds?: number[] }`
- If matchIds provided: update only those matches
- If no matchIds: update all team's matches
- Same visibleAfter encoding as per-match endpoint

Add all to OpenAPI spec. Run codegen.
Update `docs/SCHEMA_CONTRACT.md` for new column.

**Acceptance criteria:**
- Captain can transfer to active team member, not to non-member
- Non-captain cannot call transfer endpoint (401/403)
- Bulk visibility updates all or selected matches
- defaultMatchVisibility persists and is returned in GET /teams/:id

---

### Issue #15
**Title:** [Replit] Captain Hub page: /teams/:id/manage
**Labels:** replit, frontend
**Milestone:** Web V1
**Blocked by:** #10, #14

**Body:**
New page at `/teams/:id/manage`. Visible only to the captain of this team (`player.teams.find(t => t.teamId === id)?.isCaptain === true`). Redirect non-captains to `/teams/:id`.

Add route to `App.tsx`: `<Route path="/teams/:id/manage" component={TeamManage} />`
Add link in nav dropdown: if user is captain of a team, show "Manage Team" → `/teams/:id/manage`

**Page sections (4 tabs or accordion):**

**1. Match Visibility**
- List all team matches (use `useListMatches({ teamId })` — shows ALL including private ones, captain view)
- Per row: opponent name, date, current visibility status, inline toggle (Public / Default / Private)
- Bulk action: select multiple → set all to same visibility
- Global default: dropdown "New matches default to: [Private / Participants / Public]" → calls PUT /teams/:id/settings

**2. Roster**
- List all active members: riotId (or "pending" if not linked), role, link status badge
- Add member form: input RiotId or Discord → calls useAddTeamMember
- Per member: remove button (useRemoveTeamMember), role dropdown (useUpdateTeamMember)
- Captain badge on current captain

**3. Team Settings**
- Edit team name, tag
- Calls PUT /api/teams/:id/settings (from #14)

**4. Transfer Captain**
- Dropdown of active members (excluding self)
- Confirm dialog: "Transfer captain to X? You will remain a member."
- Calls PUT /api/teams/:id/transfer-captain (from #14)

**Reference:** `docs/USER_JOURNEYS.md` J-09, J-10, J-11, J-13, J-14, J-15

**Acceptance criteria:**
- All 4 sections functional
- Non-captains redirected to public TeamProfile
- Inline visibility toggle works without page reload
- Transfer captain removes Manage link from transferring captain's nav

---

### Issue #16
**Title:** [Replit] Dashboard overhaul — activity-first, captain-aware
**Labels:** replit, frontend
**Milestone:** Web V1

**Body:**
Current Dashboard is static info display. Overhaul to be activity-first.

**Changes:**

**Add: Recent Matches section** (top priority, most-used feature)
- Use `player.recentMatches` from `useGetPlayerById`
- Show last 5 matches: teams, W/L, date, link to `/matches/:id`
- Empty state: "No matches recorded yet. Submit your first scrim via /submit in Discord."

**Add: Captain quick-links** (conditional, only if `player.teams.some(t => t.isCaptain)`)
- Card: "You're a captain" → list captain teams → each has "Manage Team →" link to `/teams/:id/manage`

**Fix: Notifications → actionable**
Each notification type gets a link:
- `match_result` → link to `/matches/:entityId` (need entityId in notification)
- `badge_earned` → scroll to Badges section
- `season_completed` → link to `/teams` leaderboard
- `event_registration_confirmed` / `declined` → link to `/events/:slug`

If notification has no entityId, show without link (current behaviour).

**Move: Notification Settings** to bottom of page (currently too prominent relative to utility)

**Reference:** `docs/USER_JOURNEYS.md` J-04, J-05

**Acceptance criteria:**
- Recent matches visible without leaving Dashboard
- Captain sees "Manage Team" quick link
- At least match_result notifications link to the match

---

### Issue #17
**Title:** [Replit] TeamProfile: add VOD section
**Labels:** replit, frontend
**Milestone:** Web V1

**Body:**
TeamProfile currently has no VOD section. Users must click into every individual match to find VODs.

Add "Team VODs" section to `/teams/:id` page using:
```tsx
const { data: vods } = useListVods({ teamId: Number(id) });
```

Display as grid/list of VOD cards: title, champion (if available), match link, video embed preview or thumbnail.

Empty state: "No public VODs yet. Match VODs become available after the 7-day privacy window."

**Reference:** `docs/USER_JOURNEYS.md` J-12

**Acceptance criteria:**
- VOD section visible on TeamProfile
- Shows only public VODs (backend already handles visibility filter)
- Links back to match and to VodDetail

---

### Issue #18
**Title:** [Replit] Defect remediation UI (R1–R10)
**Labels:** replit, frontend
**Milestone:** Web V1
**Blocked by:** #10 (for R6)

**Body:**
Complete the 10 frontend defect UI tasks. Each is small and independent except R6.

**R1 — MatchDetail: unregistered team badge**
When `match.teamAId === null` or `match.teamBId === null`, show "Unregistered Team" badge instead of team name.

**R2 — MatchDetail: claim match CTA for captain**
If `canChangeVisibility` (already computed) AND match has null teamId on one side:
Show "Claim this match for your team" button → calls `useClaimTeamForMatch`.

**R3 — PlayerProfile: "Is this you?" CTA**
If visitor is not logged in AND viewing any player profile:
Show subtle banner: "Is this you? [Login with Discord] to manage your profile."

**R4 — PlayerDashboard: link Riot ID prompt**
If `player.riotId === "pending"` or `player.puuid === null`:
Show prominent alert: "Link your Riot ID to claim match stats. Use /link-riot in Discord."

**R5 — ManagePlayers + ManageTeams: ban button**
Add "Ban" button to each player row in ManagePlayers and each team row in ManageTeams.
Opens dialog: reason text field, ban type (temporary/permanent), expiry date if temporary.
Uses `useCreateBan`. Show active ban badge on banned players/teams.

**R6 — ManageTeams: member management UI** (blocked on #10)
In ManageTeams admin page, expand team rows to show member list.
Add member: player dropdown + role → `useAddTeamMember`.
Remove member: trash icon → `useRemoveTeamMember`.
Edit role: dropdown → `useUpdateTeamMember`.

**R7 — Admin Dashboard: bot status indicator**
Add card: "Bot Status" using `useGetBotStatus`.
Show: Online (green) / Offline (red) + last seen timestamp.

**R8 — Admin Dashboard: render queue stats**
Add card: "Render Queue" using `useGetReplayQueueStats`.
Show: pending count, processing count, failed (last 24h).

**R9 — First-visit explainer**
Add a small "What is VCLoL?" section to the footer (visible on all public pages):
"VCLoL records verified 5v5 scrim results for amateur League of Legends teams. [Learn more →]"

**R10 — Admin audit log (optional polish)**
On Admin Dashboard, show last 10 admin actions from `useListAdminActions` (if hook exists, else skip).

---

## MILESTONE: VOD Pipeline

---

### Issue #19
**Title:** [Claude] Render machine polling endpoints
**Labels:** claude, backend
**Milestone:** VOD Pipeline

**Body:**
Windows PC render machine needs to poll for jobs and report status.

Endpoints already exist in `replays.ts`:
- `GET /api/replays/queue/next` — returns next pending job
- `PATCH /api/replays/:id` — status update

Verify these work correctly. On `PATCH /:id` with `status=done` and `youtubeUrl`:
- Auto-create `vod_entries` row linked to `match_players.matchId`
- Title format: `"{playerRiotId} ({champion}) vs {opponentChampion} — VCLoL"`

Also verify stale job detection: if job has been `status=processing` for > 2 hours, reset to `pending` (render machine crashed).

**Acceptance criteria:**
- Render machine can poll, claim, and complete a job
- VOD entry auto-created on completion
- Stale jobs auto-reset

---

## MILESTONE: Polish

---

### Issue #20
**Title:** [Claude] Players list enrichment
**Labels:** claude, backend
**Milestone:** Polish

**Body:**
`GET /api/players` currently returns minimal player data (riotId, role, isActive).
Scout UX requires seeing team affiliation, games played, and win rate without clicking each profile.

Extend the list endpoint to include per-player:
- `primaryTeam: { teamId, teamName, teamTag } | null` — their most recently active team
- `totalGames: number` — COUNT from match_players
- `winRate: number | null` — wins/totalGames * 100, null if 0 games

This may require a more complex query or a separate `/api/players/public-list` endpoint.
Update OpenAPI + run codegen.

**Acceptance criteria:**
- GET /api/players returns enriched data
- Scout can see team + games + win rate in list without extra clicks

---

### Issue #21
**Title:** [Claude] Global search endpoint
**Labels:** claude, backend
**Milestone:** Polish

**Body:**
`GET /api/search?q=searchTerm`

Search across:
- Teams: name, tag — return `{ type: "team", id, name, tag, teamElo }`
- Players: riotId, discordUsername — return `{ type: "player", id, riotId, primaryRole }`
- Events: title — return `{ type: "event", id, title, slug, format }`

Minimum query length: 2 characters. Max results: 5 per category (15 total).
Case-insensitive ILIKE search.

Add to OpenAPI + codegen.

**Acceptance criteria:**
- Returns results across all 3 categories
- Empty array (not error) when no results
- Fast response (< 200ms on typical query)

---

### Issue #22
**Title:** [Replit] Players page with enriched data
**Labels:** replit, frontend
**Milestone:** Polish
**Blocked by:** #20

**Body:**
Update `/players` page to use enriched data from #20.

Each player card should show:
- riotId + role badge (existing)
- Team name + tag (new)
- Games played (new)
- Win rate (new, colour-coded: ≥60% green, ≥50% neutral, <50% red)

**Reference:** `docs/USER_JOURNEYS.md` J-16

---

### Issue #23
**Title:** [Replit] Global search UI
**Labels:** replit, frontend
**Milestone:** Polish
**Blocked by:** #21

**Body:**
Add search bar to nav (desktop: visible; mobile: icon that expands).

On type (debounced 300ms): call `GET /api/search?q=` and show dropdown with results grouped by type (Teams / Players / Events).

Click result → navigate to `/teams/:id`, `/players/:riotId`, or `/events/:slug`.

Empty state: "No results for '{query}'"
Loading: spinner in dropdown

**Reference:** `docs/USER_JOURNEYS.md` J-03

---

## Summary Table

| # | Owner | Title | Milestone | Blocked by |
|---|-------|-------|-----------|------------|
| 1 | Claude | .rofl parser lib | Bot MVP | — |
| 2 | Claude | team-matcher lib | Bot MVP | #1 |
| 3 | Claude | Bot: /register-team | Bot MVP | — |
| 4 | Claude | Bot: /add (dual-mode) | Bot MVP | — |
| 5 | Claude | Bot: /submit | Bot MVP | #1, #2 |
| 6 | Claude | Bot: /link-riot | Bot MVP | — |
| 7 | Replit | Wire Discord OAuth | Bot MVP | — |
| 8 | Claude | Bug: match visibility gate | Web V1 | — |
| 9 | Claude | Bug: replay access check | Web V1 | — |
| 10 | Claude | OpenAPI team member mutations | Web V1 | — |
| 11 | Claude | Score validation | Web V1 | — |
| 12 | Claude | ELO baseline row | Web V1 | — |
| 13 | Claude | lastMatchAt + auto-inactive | Web V1 | — |
| 14 | Claude | Captain endpoints | Web V1 | — |
| 15 | Replit | Captain Hub page | Web V1 | #10, #14 |
| 16 | Replit | Dashboard overhaul | Web V1 | — |
| 17 | Replit | TeamProfile VOD section | Web V1 | — |
| 18 | Replit | Defect remediation R1–R10 | Web V1 | #10 (R6 only) |
| 19 | Claude | Render machine endpoints | VOD Pipeline | — |
| 20 | Claude | Players list enrichment | Polish | — |
| 21 | Claude | Global search endpoint | Polish | — |
| 22 | Replit | Players page enriched | Polish | #20 |
| 23 | Replit | Global search UI | Polish | #21 |
