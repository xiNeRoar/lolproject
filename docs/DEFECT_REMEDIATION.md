# VCLoL — Defect Remediation Plan

**Date:** 2026-03-20
**Branch:** `variant`
**Scope:** 21 design defects identified via full-path analysis. Every fix includes complete edge case coverage.

---

## Ownership

- **Claude** = schema, OpenAPI, backend routes, BOT_SPEC, lib/, docs/
- **Replit** = pages, components, hooks, layout, App.tsx, replit.md
- Items marked (Replit) are documented here for Replit to pick up. Claude does NOT edit frontend files.

---

## Defect 1: Opponent Not Registered → Match Fails

**Owner:** Claude (BOT_SPEC + backend route) + Replit (MatchDetail display for unregistered side)

### Design

When `/submit` cannot identify one or both teams:
- Match is STILL recorded. `teamAId` and/or `teamBId` = null for unmatched side(s).
- `sideAName` / `sideBName` populated from .rofl player riotIds (concatenated or first player name).
- All 10 `match_players` rows created. Known players get `playerId` set; unknown players get `playerId = null` but `puuid`, `riotIdGameName`, `riotIdTagLine` preserved.
- **ELO is NOT updated** when either teamId is null. Reason: ELO calc requires two known teams with existing ELO values. Allowing default-1000 for unknown teams creates farmable exploit.
- Bot reply: "✅ Match recorded (stats only — no ELO change). Opponent team not registered. Invite them: {platform URL}/register"

### Retroactive Claim

New bot command `/claim-match <matchId>`:
- Captain of a registered team invokes this.
- Bot checks: does this team have 3+ members whose PUUIDs appear in the unmatched side of this match?
- If yes: set `teamBId` (or `teamAId`) = this team's id. Calculate retroactive ELO for BOTH teams. Write `elo_history`.
- If no: reject "Your team does not match enough players in this match."

### Edge Cases

| Case | Handling |
|------|----------|
| Same unregistered opponents play multiple times | Each match recorded with `teamBId = null`. When they register + `/claim-match`, all matches get claimed in batch. |
| Pickup game (5 randoms, no real team) | `teamId = null` forever. Individual match_players claimed when players `/link-riot`. Team-level ELO never affected. |
| Both sides unregistered | Both `teamAId` and `teamBId` = null. Pure stats record. |
| Opponent registers but different 5 players next time | Different match, different match_players. `/claim-match` only claims matches where 3+ PUUIDs match current roster. |
| Captain claims match incorrectly (their team didn't actually play) | 3+ PUUID verification prevents this. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Update `/submit` flow step 7 for graceful handling. Add `/claim-match` command. |
| `matches.ts` route | Claude | `POST /` already allows null teamAId/teamBId. Add `POST /api/matches/:id/claim-team` endpoint. |
| `openapi.yaml` | Claude | Add `claimTeamForMatch` operation. |
| MatchDetail.tsx | Replit | Display "Unregistered Team" badge when teamAId or teamBId is null. Show "Claim this match" CTA for captains. |

---

## Defect 2: Player Identity Resolution Broken — No /link-riot

**Owner:** Claude (BOT_SPEC + schema) + Replit (player claim CTA)

### Design

New command `/link-riot <RiotName#TAG>`:
1. Parse → gameName + tagLine.
2. Find invoker's player record by `discordId`.
   - Not found → "You don't have a player record yet. Ask a team captain to `/add` you first."
3. Check `riotId` uniqueness: is this riotId already linked to a DIFFERENT player?
   - Yes → "This Riot ID is already linked to another player."
4. If `RIOT_API_KEY` exists: call Riot ACCOUNT-V1 → get PUUID.
   - 404 → "This Riot ID does not exist on the Riot server."
   - Success → update `players.riotId` + `players.puuid`
5. If no API key: update `players.riotId` only. PUUID populated from next .rofl match.
6. Retroactive claim: `UPDATE match_players SET playerId = {id} WHERE puuid = {puuid} AND playerId IS NULL`.
7. Reply: "✅ Linked as RiotName#TAG. Claimed {N} match records."

### Identity Resolution During /submit

When bot parses .rofl, for each of the 10 player entries:
1. **PUUID match** (highest confidence): `SELECT * FROM players WHERE puuid = ?` → set `match_players.playerId`
2. **RiotId match** (medium): `SELECT * FROM players WHERE riotId = ?` → set `playerId`, also update `players.puuid` from .rofl
3. **No match**: `match_players.playerId = null`, but `puuid` + `riotIdGameName` + `riotIdTagLine` stored on the row

### Edge Cases

| Case | Handling |
|------|----------|
| Player changes Riot name (name change) | PUUID unchanged. Re-run `/link-riot NewName#TAG` → updates `riotId`, PUUID stays same, all existing claims preserved. |
| Two players try same Riot ID | `riotId` has UNIQUE constraint → second player rejected. |
| Player not yet `/add`-ed but wants to link | Rejected — must have player record first. Prevents random people claiming others' stats. |
| Player linked wrong Riot ID | Re-run `/link-riot CorrectName#TAG`. Old riotId overwritten. Old match_players (matched by old PUUID) stay — they're correct (PUUID was right, just display name was wrong). |
| No Riot API key | Accept riotId on trust. PUUID filled in from first .rofl appearance. |
| Player appears in .rofl but puuid doesn't match any record AND riotId doesn't match | `playerId = null`. Data preserved for future claim. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add `/link-riot` command with full flow. Update `/submit` with identity resolution order. |
| PlayerProfile.tsx | Replit | Show "Is this you? Login with Discord" CTA when visitor is not logged in. |
| PlayerDashboard.tsx | Replit | Show "Link your Riot ID" prompt if `player.riotId` is "pending" or `player.puuid` is null. |

---

## Defect 3: Notification Delivery is Stub

**Owner:** Claude (bot notification polling) — NOT API server

### Design

API server's `notifyPlayer()` continues writing to `notifications` table (web dashboard reads this).

Bot adds a **notification poller**:
- On startup + every 60 seconds: `SELECT * FROM notifications WHERE isRead = false AND dmSent = false`
- For each: look up `player.discordId` → `client.users.fetch(discordId)` → `user.send(embed)`
- On success: `UPDATE notifications SET dmSent = true`
- On failure (user blocked DMs, invalid ID): `UPDATE notifications SET dmFailed = true`

### Schema Change

`notifications` table needs two new columns:
- `dmSent: boolean, default false`
- `dmFailed: boolean, default false`

### Edge Cases

| Case | Handling |
|------|----------|
| Player blocked bot DM | `dmFailed = true`, no retry. Web notification still visible. |
| Bot restart — notifications accumulated | On startup, poll catches all unprocessed notifications. |
| Player has no discordId | Skip DM. Web only. |
| notificationPreference = "web" | Skip DM. Only write to DB. |
| High volume (many notifications at once) | Bot processes in batches of 10, 1 second delay between batches. Discord rate limit is 5 DMs/second. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `lib/db/src/schema/notifications.ts` | Claude | Add `dmSent`, `dmFailed` columns |
| `docs/BOT_SPEC.md` | Claude | Add notification poller section |
| `notifications.ts` route | Claude | Update notification format function to include new fields |

---

## Defect 4: Team Tag Not Unique

**Owner:** Claude (schema)

### Change

```typescript
tag: text("tag").notNull().unique()
```

No edge cases. Fresh database, no existing duplicates.

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `lib/db/src/schema/teams.ts` | Claude | Add `.unique()` to `tag` |
| `docs/SCHEMA_CONTRACT.md` | Claude | Update teams table definition |
| `teams.ts` route | Claude | POST / already returns 409 on unique violation via Postgres error code 23505 — verify |

---

## Defect 5: /visibility Bot Command Missing

**Owner:** Claude (BOT_SPEC)

### Design

```
/visibility [match-id] <public|private|default>
  match-id: optional integer. If omitted = most recent match involving invoker's team.
  Who: Captain of either participating team, or admin.

  public  → visibleAfter = epoch (always visible)
  private → visibleAfter = far-future (never visible)
  default → visibleAfter = null (7-day auto-public rule)
```

### Edge Cases

| Case | Handling |
|------|----------|
| Two captains set different values | Last write wins. Each change logged (admin_actions table). |
| Match has no teamId (unregistered opponent) | Only the registered side's captain can change. |
| Captain transferred after match | New captain inherits authority. |
| "last" match is ambiguous (captain has multiple teams) | Select menu: "Which team's last match?" |
| match-id doesn't exist | "Match #{id} not found." |
| Invoker is not captain of either team | "Only team captains can change match visibility." |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add `/visibility` command with full flow |

---

## Defect 6: Season End Notifications Missing

**Owner:** Claude (BOT_SPEC — bot scheduled job)

### Design

Bot scheduled broadcasts:
- `endDate - 7 days`: All guilds: "⚠️ Season {name} ends in 7 days! Current top 5: ..."
- `endDate - 3 days`: All guilds: "⚠️ 3 days remaining! ..."
- `endDate - 1 day`: All guilds: "🔴 Season ends TOMORROW! Final standings: ..."
- Season complete (admin triggers): DM every active team captain: "Season {name} complete. Your team placed #{rank} with ELO {elo}."

Bot checks daily at a configured time (e.g., 00:00 UTC).

### Edge Cases

| Case | Handling |
|------|----------|
| No active season | Skip broadcast. |
| Season end date changed after 7-day broadcast already sent | Broadcasts are stateless — they fire based on current endDate. If endDate moves, the 3-day/1-day broadcasts adjust automatically. |
| Bot was offline on broadcast day | On startup, check if any missed broadcast (compare dates). Send if within 24h of target. |
| No guilds with bot installed | No-op. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add season broadcast section |

---

## Defect 7: .rofl No gameMode Validation

**Owner:** Claude (BOT_SPEC)

### Design

After ROFL2 magic byte validation, before player extraction:
```
Extract gameMode + gameType from .rofl metadata JSON
WHITELIST: gameMode === "CLASSIC" (Summoner's Rift standard)
WHITELIST: mapId === 11 (Summoner's Rift map ID)

Reject with specific message:
  "This replay is from {gameMode} on map {mapId}. Only Summoner's Rift custom games are accepted."
```

### Edge Cases

| Case | Handling |
|------|----------|
| Riot changes field names | Parser returns null → "Could not determine game mode. Contact admin." Admin can manual-submit via web. |
| Tournament Draft mode | `gameMode` is still `CLASSIC` for tournament draft. Accepted. |
| Clash game | `gameMode = CLASSIC` but `gameType` may differ. Accept if `CLASSIC` — Clash is still 5v5 SR. |
| ARAM | `gameMode = ARAM` → rejected. |
| Practice Tool | `gameMode = PRACTICETOOL` → rejected. |
| 3v3 (if ever returns) | `mapId ≠ 11` → rejected. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add validation step to `/submit` flow |

---

## Defect 8: ELO Doesn't Account for Roster Changes

**Owner:** Claude (PRD documentation only)

### Decision: Intentional. Document, don't fix.

Add to `docs/PRD_v3.md` Section 8 (Team Lifecycle):

> **ELO and Roster Changes:** Team ELO is a property of the team entity, not the aggregate of its members. When roster changes occur — additions, departures, or complete turnover — team ELO persists unchanged. This is intentional:
> - Teams are long-lived competitive identities. "Team Alpha" means something regardless of who currently plays.
> - Adjusting ELO on roster change creates perverse incentives (e.g., kick low-performers to inflate ELO, or recruit high-performers for an ELO boost that doesn't reflect team cohesion).
> - The alternative (member-average ELO) requires individual player ELO, which conflicts with the "teams own ELO" principle.
> - Over time, a team's ELO naturally adjusts through match results regardless of roster composition.

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/PRD_v3.md` | Claude | Add paragraph to Section 8 |

---

## Defect 9: No Admin Audit Log

**Owner:** Claude (schema + backend middleware)

### Design

New table `admin_actions`:
```
id: serial PK
adminId: integer → admin_users.id
actionType: text (create | update | delete | activate | complete | ban | unban)
entityType: text (team | player | match | season | event | registration | vod | ladderSettings)
entityId: integer
detail: text (human-readable summary, e.g. "Deleted team 'Team Alpha' (id=8)")
createdAt: timestamp
```

No `beforeState`/`afterState` JSONB — too complex for Phase 1. Plain text `detail` field is sufficient for audit trail and matches industry standard for early-stage platforms.

Every `requireAdmin` mutation (POST, PUT, DELETE) calls `logAdminAction()` after successful DB write.

### Edge Cases

| Case | Handling |
|------|----------|
| Admin action fails (DB error) | No audit row written — only log successful actions. |
| Multiple admins | Each action stamped with `adminId`. |
| Audit table grows large | Add index on `createdAt`. Consider 90-day retention policy later. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `lib/db/src/schema/adminActions.ts` | Claude | NEW table |
| `lib/db/src/schema/index.ts` | Claude | Export new table |
| `artifacts/api-server/src/lib/auditLog.ts` | Claude | NEW — `logAdminAction()` helper |
| All admin mutation routes | Claude | Add `logAdminAction()` calls |
| `docs/SCHEMA_CONTRACT.md` | Claude | Add table definition |
| Admin Dashboard | Replit | Display recent admin actions (optional, Phase 2 polish) |

---

## Defect 10: Player Claim Mechanism Missing

**Owner:** Replit (frontend only)

Backend is ready: `GET /api/auth/me` returns `playerId`. Frontend compares with viewed profile.

### What Replit Needs To Do

- `PlayerProfile.tsx`: If visitor is not logged in, show "Is this you? [Login with Discord]" CTA.
- If visitor is logged in and `session.playerId !== profile.id`, show nothing extra.
- If `session.playerId === profile.id`, show "Go to Dashboard" link.

No backend changes needed.

---

## Defect 11: Cross-Server /add

**Owner:** Claude (BOT_SPEC)

### Design

`/add` accepts two input modes:
```
/add @DiscordUser [role]     — same server, Discord mention
/add RiotName#TAG [role]     — cross-server, Riot ID lookup
```

Cross-server flow:
1. Bot searches `players` table by `riotId`
2. Found → add `team_members` row with that `playerId`
3. Not found → create minimal player record: `riotId` set, `discordId = null`, `discordUsername = riotId`
   - This player exists as a "shell" until they link their Discord via `/link-riot` or get mentioned in another `/add @user`
4. Reply: "Added **RiotName#TAG** to **{team}**. They can link their Discord account with `/link-riot` for full features."

### Edge Cases

| Case | Handling |
|------|----------|
| Player added by RiotId already on team (by Discord mention) | Check `team_members` by `playerId` before insert → "Already on team." |
| Shell player (no discordId) later joins a Discord server with bot | They can `/link-riot` which updates their `discordId`. Or captain can `/add @them` which merges: find existing player by riotId, update `discordId`. |
| Two shell players with different riotIds turn out to be same person | Edge case we accept. Admin can merge manually if needed. Not automated. |
| RiotId typo when adding cross-server | Captain's responsibility. `/remove RiotName#TAG` + re-add. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Update `/add` command with dual-mode input |

---

## Defect 12: First-Visit Experience

**Owner:** Replit (frontend only)

No backend changes. Replit adds a "What is VCLoL?" micro-explainer in footer or as a dismissible banner on match/team/player pages for non-logged-in visitors.

---

## Defect 13: Bot Health Monitoring

**Owner:** Claude (BOT_SPEC — deployment section)

### Design

- Bot container `Dockerfile`: `HEALTHCHECK --interval=30s CMD node healthcheck.js`
- `healthcheck.js`: check `client.ws.ping` is not null, exit 0/1
- Portainer: restart policy `unless-stopped`
- Bot writes heartbeat to DB every 5 minutes: `bot_heartbeats` table (just `id`, `timestamp`)
- API server has `GET /api/bot-status`: checks if last heartbeat is within 10 minutes → returns `{ online: true/false, lastSeen: timestamp }`

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add health monitoring section |
| `lib/db/src/schema/botHeartbeats.ts` | Claude | NEW — minimal table |
| `openapi.yaml` | Claude | Add `GET /api/bot-status` endpoint |
| Admin Dashboard | Replit | Show bot online/offline indicator (optional) |

---

## Defect 14: No DB Backup

**Owner:** Claude (deployment docs)

### Design

Portainer cron container:
```
image: postgres:16
command: pg_dump $DATABASE_URL > /backups/vclol_$(date +%Y%m%d_%H%M).sql
volumes: /volume1/backups/vclol:/backups  (NAS mount)
schedule: 0 3 * * *  (daily 3am)
```

Retention: keep 30 days, cron deletes older.

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/DEPLOYMENT.md` | Claude | NEW — backup config + Portainer stack YAML |

---

## Defect 15: Render Pipeline Monitoring

**Owner:** Claude (backend endpoint)

### Design

New endpoint `GET /api/replays/queue/stats`:
```json
{
  "pending": 3,
  "processing": 1,
  "oldestPendingAge": "2h 15m",
  "failedLast24h": 0
}
```

Stale job detection: if a job has been `status = "processing"` for > 2 hours, auto-reset to `"pending"` (render machine probably crashed).

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `replays.ts` route | Claude | Add `GET /queue/stats` endpoint + stale job reset logic |
| `openapi.yaml` | Claude | Add endpoint |
| Admin Dashboard | Replit | Show render queue status card (optional) |

---

## Defect 16: /add No Acceptance — DM Notification

**Owner:** Claude (BOT_SPEC)

### Design

Keep instant add (PRD zero-friction). Add DM notification to added player:

```
DM to added player:
"You've been added to **{team}** [{tag}] by **{captain}**.
• To link your Riot ID for stats tracking: `/link-riot YourName#TAG`
• If this was a mistake: `/leave` in any server with the VCLoL bot
• View your team: {platform URL}/teams/{teamId}"
```

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add DM notification to `/add` flow step 5 |

---

## Defect 17: /register-team Rate Limit

**Owner:** Claude (BOT_SPEC)

### Design

Creation rate limit: max 1 team per Discord user per 24 hours.

Check: `SELECT COUNT(*) FROM teams WHERE captainPlayerId = ? AND createdAt > NOW() - INTERVAL '24 hours'`

If > 0: "You already created a team in the last 24 hours. Try again later."

No cap on total teams. Inactive teams auto-deactivate after 30 days anyway.

### Edge Cases

| Case | Handling |
|------|----------|
| Captain creates team, immediately wants to create another for different group | Wait 24h. Acceptable friction for anti-spam. |
| Team created then immediately deleted by admin | Rate limit still applies (based on `createdAt`, not existence). Admin can override by creating team directly via web panel. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Add rate limit to `/register-team` flow |

---

## Defect 18: No Ban Mechanism

**Owner:** Claude (schema + backend + BOT_SPEC)

### Design

New table `player_bans`:
```
id: serial PK
playerId: integer → players.id (nullable)
teamId: integer → teams.id (nullable)
reason: text NOT NULL
bannedBy: integer → admin_users.id
banType: text NOT NULL — "temporary" | "permanent"
expiresAt: timestamp (null = permanent)
isActive: boolean default true
createdAt: timestamp
```

One of `playerId` or `teamId` must be set (ban targets either a player or a team).

Enforcement points:
- `/submit`: before processing, check if any participating player or team is banned → reject with "A participant in this match is currently banned: {reason}"
- `GET /api/ladder`: exclude banned teams
- `GET /api/players/:riotId`: show "This player is currently suspended" if banned
- Admin panel: "Ban" button on ManagePlayers and ManageTeams

Unban: set `isActive = false`. Audit logged.

### Edge Cases

| Case | Handling |
|------|----------|
| Temporary ban expires | Cron or on-demand check: if `expiresAt < NOW()`, set `isActive = false`. |
| Banned player is on multiple teams | All teams containing this player are blocked from `/submit`. Other team members are not individually banned. |
| Banned team's captain tries `/transfer-captain` | Allowed — ban is on the team entity, captain transfer doesn't lift it. |
| Player banned, then captain removes them from team | Ban stays on the player. New team they join is not affected (ban is player-level, not team-level). |
| Admin bans wrong person | Unban via admin panel. Audit log records both ban and unban. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `lib/db/src/schema/playerBans.ts` | Claude | NEW table |
| `lib/db/src/schema/index.ts` | Claude | Export |
| `docs/SCHEMA_CONTRACT.md` | Claude | Add table |
| `openapi.yaml` | Claude | Ban/unban endpoints |
| `artifacts/api-server/src/routes/bans.ts` | Claude | NEW — CRUD for bans |
| `docs/BOT_SPEC.md` | Claude | Add ban check to `/submit` flow |
| ManagePlayers.tsx, ManageTeams.tsx | Replit | Add "Ban" button + ban history display |

---

## Defect 19: Admin Cannot Manage Team Roster via Web

**Owner:** Claude (backend routes)

### Design

New endpoints:
```
POST   /api/teams/:id/members     — admin add member
PUT    /api/teams/:id/members/:memberId — admin change role/status
DELETE /api/teams/:id/members/:memberId — admin remove member (set inactive)
```

All require `requireAdmin`. All write to `admin_actions`.

### Edge Cases

| Case | Handling |
|------|----------|
| Admin removes captain | Allowed. Team becomes orphaned (`captainPlayerId` still set but member status = inactive). Admin should assign new captain via `PUT /api/teams/:id`. |
| Admin adds player who doesn't exist | Return 404 "Player not found". Admin must create player first. |
| Admin adds player already on team | Return 409 "Already a member". |
| Bot is down, admin needs to manage roster | These endpoints work independently of bot. |

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `artifacts/api-server/src/routes/teams.ts` | Claude | Add member management endpoints |
| `openapi.yaml` | Claude | Add operations |
| ManageTeams.tsx | Replit | Add member management UI (add/remove/change role) |

---

## Defect 20: Growth Loop — Match Notification to Unlinked Players

**Owner:** Claude (bot notification logic, depends on Defect 1 + 2)

### Design

After `/submit` completes:
1. For each of the 10 match_players:
   - If `playerId` is set AND player has `discordId`: send notification (existing flow)
   - If `playerId` is null BUT `riotIdGameName` + `riotIdTagLine` is known: bot embed includes: "⚠️ {N} players have unclaimed stats. Tell them to join VCLoL and `/link-riot` to claim."
2. The `/submit` response embed always includes the full 10-player list, marking which are linked and which are anonymous.

No separate backend changes — this is bot-side formatting of the existing match data.

### Changes Required

| File | Owner | Change |
|------|-------|--------|
| `docs/BOT_SPEC.md` | Claude | Update `/submit` response embed to show linked vs unlinked players |

---

## Defect 21: No Public API / Webhooks

**Owner:** Deferred to Phase 3. No changes now.

Documented as future work. When demand exists (Discord server owners wanting embeds), revisit.

---

## Execution Summary

### Claude Does Now (schema + docs + backend)

**Schema:**
1. `teams.ts` — add `.unique()` to `tag`
2. `notifications.ts` — add `dmSent`, `dmFailed` columns
3. `adminActions.ts` — NEW table
4. `playerBans.ts` — NEW table
5. `botHeartbeats.ts` — NEW table
6. `schema/index.ts` — export 3 new tables

**Docs:**
7. `BOT_SPEC.md` — major update: `/link-riot`, `/claim-match`, `/visibility`, unregistered opponent flow, gameMode validation, season broadcast, `/add` dual-mode + DM notification, rate limit, ban check, notification poller, health monitoring, growth loop embed
8. `PRD_v3.md` — ELO roster change policy statement
9. `SCHEMA_CONTRACT.md` — new tables + tag unique
10. `DEFECT_REMEDIATION.md` — this file (already written)

**OpenAPI + Backend:**
11. `openapi.yaml` — new endpoints: claim-team, ban CRUD, admin roster CRUD, bot-status, replay queue stats
12. `bans.ts` route — NEW
13. `teams.ts` route — add member CRUD endpoints
14. `replays.ts` route — add queue stats + stale job reset
15. `auditLog.ts` lib — NEW helper
16. All admin mutation routes — add audit logging
17. Run codegen

**Deployment:**
18. `DEPLOYMENT.md` — NEW: backup config

### Replit Does After Claude Push

| # | What | Where |
|---|------|-------|
| R1 | "Unregistered Team" display on MatchDetail | MatchDetail.tsx |
| R2 | "Claim this match" CTA for captains | MatchDetail.tsx |
| R3 | "Is this you? Login" CTA on PlayerProfile | PlayerProfile.tsx |
| R4 | "Link your Riot ID" prompt on Dashboard | PlayerDashboard.tsx |
| R5 | Ban button + ban history on ManagePlayers/ManageTeams | Admin pages |
| R6 | Team member management UI in ManageTeams | ManageTeams.tsx |
| R7 | Bot status indicator on Admin Dashboard | Dashboard.tsx |
| R8 | Render queue status card on Admin Dashboard | Dashboard.tsx |
| R9 | "What is VCLoL?" micro-explainer for non-logged-in visitors | Footer or banner |
| R10 | Admin audit log display (optional polish) | Dashboard.tsx |
