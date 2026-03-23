# VCLoL — Discord Bot Specification

---

## Identity

The Discord bot is the **primary interaction layer** for VCLoL. All user actions — team registration, player management, match submission — happen through the bot. The website is read-only for non-admin users.

**Package:** `artifacts/discord-bot/` (new monorepo package)
**Runtime:** discord.js v14 + TypeScript
**DB access:** Direct Drizzle queries (same `@workspace/db` package as API server)
**Hosting:** Oracle Cloud ARM64 VPS via Portainer (separate container from web)

---

## Why Direct DB (not HTTP API)

The bot shares the same PostgreSQL database with the API server. It uses `@workspace/db` directly rather than calling the Express API over HTTP.

**Reasons:**
1. No network hop — lower latency for user-facing commands
2. No auth needed — bot is a trusted internal service, not an external client
3. Simpler — no need to maintain a separate API key or session for the bot
4. Transaction safety — bot can wrap complex operations (match + 10 match_players + ELO) in a single DB transaction

**Trade-off:** If schema changes, both API server and bot need redeployment. Acceptable for a solo developer.

---

## Commands

**Implementation status** (as of Polish milestone):

| Command | File | Status | Context | Notes |
|---|---|---|---|---|
| `/register-team` | `register-team.ts` | ✅ Implemented | Guild only | 24h rate limit, content filter |
| `/add` | `add.ts` | ✅ Implemented | Guild only | DM includes team URL (PRD §6.1), roster cap 15 |
| `/submit` | `submit.ts` | ✅ Implemented | Guild only | .rofl parse, ELO, notifications, roster inactivity, climber badge, ✅/❌ buttons |
| `/link-riot` | `link-riot.ts` | ✅ Implemented | Guild + DM | Trust-based mode logs claim for admin audit |
| `/claim-match` | `claim-match.ts` | ✅ Implemented | Guild + DM | Retroactive ELO, updates display names |
| `/visibility` | `visibility.ts` | ✅ Implemented | Guild + DM | |
| `/leave` | `leave.ts` | ✅ Implemented | Guild + DM | Blocks captain, redirects to /transfer-captain |
| `/transfer-captain` | `transfer-captain.ts` | ✅ Implemented | Guild + DM | |
| `/register-event` | `register-event.ts` | ✅ Implemented | Guild + DM | Multi-team captain disambiguation |
| `/stats` | `stats.ts` | ✅ Implemented | Guild + DM | team / player / invoker self |
| `/roster` | `roster.ts` | ✅ Implemented | Guild + DM | Multi-team member disambiguation |
| `/remove` | `remove.ts` | ✅ Implemented | Guild + DM | Sets inactive, preserves match history |

**Known gaps:** None — all tracked features implemented.

### `/register-team <name> <tag>`
**Who:** Any Discord user
**What:** Creates a new team. The invoking user becomes captain.
**Flow:**
1. **Rate limit (Defect 17):** Check `SELECT COUNT(*) FROM teams WHERE captainPlayerId = ? AND createdAt > NOW() - INTERVAL '24 hours'`. If > 0 → "You already created a team in the last 24 hours. Try again later."
2. Check: does a player record exist for this Discord user? If not, create one (discordId + discordUsername, riotId = "pending")
3. Validate: team name unique, tag is 2-5 uppercase alphanumeric, tag unique
4. Insert `teams` row (captainPlayerId = player.id, discordServerId = guild.id)
5. Insert `team_members` row (teamId, playerId, role = null, status = active)
6. Reply: "Team **{name}** [{tag}] created! Use `/add` to add your teammates. Link your Riot ID: `/link-riot YourName#TAG`"

### `/add <@user|RiotName#TAG> [role]`
**Who:** Team captain only
**What:** Adds a player to the captain's team. Accepts Discord mention (same server) or Riot ID (cross-server).
**Flow:**
1. Determine input mode:
   - Discord mention `@user` → look up player by `discordId`
   - Text `RiotName#TAG` → look up player by `riotId`
2. If captain has multiple active teams → Discord select menu: "Which team?"
   If captain has one team → use that team directly.
3. Check: is player already an active member of this team? → "Already on team."
4. If no player record exists:
   - Discord mention → create player: `discordId` + `discordUsername` set, `riotId = "pending"`
   - Riot ID → create player: `riotId` set, `discordId = null`, `discordUsername = riotId`
5. Insert `team_members` row (role = provided or null, status = active)
6. DM the added player (if `discordId` is known):
   "You've been added to **{team}** [{tag}] by **{captain}**.
   • Link your Riot ID: `/link-riot YourName#TAG`
   • If this was a mistake: `/leave`
   • Your team: {platform URL}/teams/{teamId}"
7. Reply in channel: "@user added to **{team}** as {role || 'unassigned'}."

### `/submit` (with .rofl file attachment)
**Who:** Any team member
**What:** Upload a .rofl file to record a match result.
**Flow:**
1. Download the .rofl attachment (Discord allows up to 25MB for boosted servers, 8MB default)
2. Validate: check ROFL2 magic bytes
3. Parse metadata JSON from .rofl
4. **Validate game mode (Defect 7):**
   - `gameMode` must be `CLASSIC` (Summoner's Rift standard)
   - `mapId` must be `11` (Summoner's Rift)
   - Reject with: "This replay is from {gameMode} on map {mapId}. Only Summoner's Rift custom games are accepted."
5. **Ban check (Defect 18):** For each player in .rofl, check if their PUUID/riotId matches a banned player. If any active ban found → reject: "A participant in this match is currently banned: {reason}"
6. Extract 10 player entries, group by TEAM (100 vs 200)
7. **Identity resolution (Defect 2):** For each player entry:
   a. PUUID match: `SELECT * FROM players WHERE puuid = ?` → set `match_players.playerId`
   b. RiotId match: `SELECT * FROM players WHERE riotId = ?` → set `playerId`, update `players.puuid` from .rofl
   c. No match: `playerId = null`, store `puuid` + `riotIdGameName` + `riotIdTagLine` on `match_players` row
8. **Team matching:** For each side, count how many `match_players` have a `playerId` that appears in a team's `team_members`. Team with 3+ matches = identified.
9. **Both teams identified:**
   a. Create `matches` row (`teamAId`, `teamBId` set, `visibleAfter` derived from team's `defaultMatchVisibility`: `public` → `new Date(0)`, `private` → `new Date('9999-01-01')`, `default`/unset → `createdAt + 7 days`)
   b. Create 10 `match_players` rows
   c. Calculate + update team ELO for both teams
   d. Write `elo_history` for both teams
   e. Store .rofl file on disk
   f. Reply: embed with match summary (teams, score, ELO changes, top performers)
   g. Mark linked vs unlinked players in embed (Defect 20)
10. **One or both teams unidentified (Defect 1 — graceful handling):**
    a. Create `matches` row (`teamAId` and/or `teamBId` = null for unmatched side, `sideAName`/`sideBName` from .rofl riotIds)
    b. Create 10 `match_players` rows (same identity resolution as step 7)
    c. **ELO NOT updated** (requires both teamIds to calculate)
    d. Store .rofl file on disk
    e. Reply: "✅ Match recorded (stats only — no ELO change). {Side} not identified as a registered team. Invite them: {platform URL}/register"
    f. Embed includes: "Use `/claim-match {matchId}` after opponent registers to claim ELO."
11. **Unknown player roster confirmation (PRD §6.2):**
    a. After reply, for each match_player with `playerId = null` on an identified team side: show ✅ "Add {riotId}" / ❌ "Skip" buttons via followUp message
    b. Only the captain of the relevant team can click ✅
    c. ✅ → create player record (if not exists) + insert team_members + link match_players row
    d. ❌ → dismiss, no action
    e. Buttons auto-expire after 5 minutes (collector timeout)

### `/link-riot <RiotName#TAG>`
**Who:** Any Discord user with a player record
**What:** Link Riot ID to player account. Enables identity resolution and retroactive stat claiming.
**Flow:**
1. Parse → gameName + tagLine
2. Find invoker's player record by `discordId`
   - Not found → "You don't have a player record yet. Ask a team captain to `/add` you."
3. Check `riotId` uniqueness: is this riotId linked to a DIFFERENT player?
   - Yes → "This Riot ID is already linked to another player."
4. If `RIOT_API_KEY` exists:
   - Call Riot ACCOUNT-V1 API → get PUUID
   - 404 → "This Riot ID does not exist."
   - Success → update `players.riotId` + `players.puuid`
5. If no API key:
   - Update `players.riotId` only. PUUID populated from next .rofl.
6. Retroactive claim: `UPDATE match_players SET playerId = {id} WHERE puuid = {puuid} AND playerId IS NULL`
7. Reply: "✅ Linked as RiotName#TAG. Claimed {N} match records."

### `/claim-match <matchId>`
**Who:** Captain of a registered team
**What:** Claim an unregistered side of a match for the captain's team (retroactive ELO).
**Flow:**
1. Look up match by id. Verify it has a null `teamAId` or `teamBId`.
   - Both sides already claimed → "This match already has both teams assigned."
2. Check: does captain's team have 3+ members whose PUUIDs appear in the unclaimed side's `match_players`?
   - No → "Your team does not match enough players in this match."
3. Set the null `teamAId` or `teamBId` to captain's team id.
4. If BOTH sides now have teamIds: calculate ELO retroactively for both teams. Write `elo_history`.
5. Reply: "✅ Match #{matchId} claimed for **{team}**. ELO updated: {team} {delta}."

### `/visibility [match-id] <public|private|default>`
**Who:** Captain of either participating team
**What:** Change match visibility. Controls whether match details (per-player stats, VOD, .rofl) are publicly accessible.
**Flow:**
1. If `match-id` omitted → find most recent match involving invoker's team.
   If invoker captains multiple teams → Discord select menu: "Which team's last match?"
2. Look up match by id. Verify invoker is captain of `teamAId` or `teamBId`.
   - Not captain of either → "Only team captains can change match visibility."
   - Match has null `teamAId`/`teamBId` (unregistered opponent) → only the registered side's captain can change.
3. Apply visibility:
   - `public` → set `matches.visibleAfter = new Date(0)` (epoch = always visible)
   - `private` → set `matches.visibleAfter = new Date("9999-01-01")` (far-future = never visible)
   - `default` → set `matches.visibleAfter = null` (7-day auto-public rule applies)
4. Reply: "Match #{id} visibility set to **{value}**."
**Edge cases:**
- Two captains set different values → last write wins. Each change logged via admin_actions.
- Captain transferred after match → new captain inherits authority.

### `/stats [team|player] [name]`
**Who:** Anyone
**What:** Quick stats lookup in Discord.
**Flow:**
- `/stats team TeamName` → team ELO, W/L, recent 5 matches
- `/stats player RiotId#TAG` → KDA avg, champion pool top 3, teams
- No arguments → invoker's own stats

### `/roster`
**Who:** Team member
**What:** Show current team roster.
**Flow:**
1. Find invoker's team
2. List all active members with roles
3. Reply: formatted roster embed

### `/remove <@user>`
**Who:** Team captain only
**What:** Set a team member as inactive.
**Flow:**
1. Verify captain
2. Set `team_members.status = 'inactive'` (don't delete — preserve history)
3. Reply: "@user removed from **{team}**."

### `/register-event <event>`
**Who:** Team captain only
**What:** Register the captain's team for a VCLoL event.
**Parameters:**
- `event` (required): Event numeric ID or URL slug (e.g. `spring-2025` or `3`)

**Flow:**
1. Resolve invoking Discord user → player record (error if not registered)
2. Find team where player is captain and team is active (error if not captain of any team)
3. POST `/api/events/{event}/register-team` with `{ teamId, captainPlayerId }`
4. API validates: event open, team exists, not already registered
5. Success embed: team name, event name, status "Registered"

**Success reply:**
> ✅ **[VST] Vancouver Storm** has been registered for **Spring 2025 Ladder**.
> An admin will confirm your registration.

**Error cases:**
- Not registered on VCLoL → "You are not registered on VCLoL. Use `/register-team` first."
- Not a captain → "You are not the captain of any active team."
- Event closed → "Registration for "{event}" is closed."
- Already registered → "[VST] is already registered for "{event}"."
- Event not found → error from API

---

### `/transfer-captain <@user>`
**Who:** Current team captain only
**What:** Transfer captain role to another active team member.
**Flow:**
1. Confirm invoker is current captain of a team
2. If invoker captains multiple teams → Discord select menu: "Which team?"
3. Confirm @user is an active member of that team
4. Update `teams.captainPlayerId = newCaptain.id`
5. Original captain remains as active team_member (history preserved)
6. Reply: "**@user** is now captain of **{team}**."
**Error cases:**
- @user not on team → "Must be an active team member to become captain."
- Invoker not captain → "Only the current captain can transfer leadership."

### `/leave`
**Who:** Any active team member (NOT captain)
**What:** Leave a team voluntarily.
**Flow:**
1. Find invoker's active team membership(s)
2. If invoker is captain → reject: "Use `/transfer-captain` first before leaving."
3. If invoker is member of multiple teams → Discord select menu: "Which team do you want to leave?"
4. Set `team_members.status = 'inactive'`
5. Reply: "You have left **{team}**."
**Note:** Captain cannot `/leave`. Must `/transfer-captain` first. This prevents orphaned teams with no authority.

### `/add` — Multi-team captain disambiguation
If the invoking captain is captain of multiple active teams:
1. Bot replies with Discord select menu: "Which team do you want to add **@user** to?"
2. Captain selects → continues original `/add` flow
If captain has only one team → direct execution (no menu).

---

## .rofl Upload Size Constraint

Discord file attachment limits:
- Default server: **8 MB**
- Level 2 boost: **50 MB**
- Level 3 boost: **100 MB**

Typical 5v5 custom game .rofl size: **~5-15 MB** (varies by game length).

**Strategy:**
- For most games, 8MB default limit is sufficient for short games
- For longer games that exceed 8MB, the bot should instruct the user to upload via a direct HTTP endpoint on the VPS instead
- Add `POST /api/matches/submit-rofl` endpoint as a fallback — bot provides a one-time upload URL

---

## Embed Formatting

Match result embed:
```
🏆 Match Result
━━━━━━━━━━━━━━━━━
TeamA [TAG] vs TeamB [TAG]

Winner: TeamA ✓
Duration: 32:45 | Patch 15.6

TeamA (Blue Side)        KDA    CS   DMG
┌ Player1 (Aatrox)      5/2/8  210  24.5k
│ Player2 (LeeSin)      3/1/12 155  15.2k
│ Player3 (Ahri)        8/3/4  245  28.1k
│ Player4 (Jinx)        7/2/6  280  32.0k
└ Player5 (Thresh)      1/4/15  45  8.3k

TeamB (Red Side)         KDA    CS   DMG
┌ Player6 (Gnar)        2/5/3  190  18.2k
│ ...

ELO: TeamA 1024 (+16) | TeamB 1008 (-16)
━━━━━━━━━━━━━━━━━
🔗 Full details: https://vclol.gg/matches/42
```

---

## Error Handling

| Error | Bot Response |
|-------|-------------|
| .rofl too large | "File too large ({size}MB). Discord limit is 8MB. Use `/submit-web` for a direct upload link." |
| .rofl corrupt / not ROFL2 | "Invalid replay file. Make sure this is from patch 14.11 or later." |
| .rofl missing player data | "Could not extract player data from this replay." |
| Team not found for players | "Could not match {N} players to a registered team: {names}. Ask your captain to `/add` them." |
| Duplicate match (same gameId) | "This match has already been submitted (Match #{id})." |
| Team name taken | "Team name '{name}' is already taken. Choose another." |
| Tag format invalid | "Tag must be 2-5 uppercase letters/numbers (e.g. TSM, C9, T1)." |
| Offensive team name | "Team name contains prohibited content. Choose another name." |
| Offensive team tag | "Team tag contains prohibited content. Choose another tag." |
| Not captain | "Only the team captain can use this command." |
| Transfer target not on team | "Must be an active team member to become captain." |
| Captain tries /leave | "Use `/transfer-captain` first before leaving." |
| Not a member of any team | "You are not a member of any team." |
| Roster full | "Team roster is full ({count}/{max}). Remove an inactive member with `/remove` first." |
| Rate limit (register-team) | "You already created a team in the last 24 hours. Try again later." |
| No player record (link-riot) | "You don't have a player record yet. Ask a team captain to `/add` you." |
| Riot ID already linked | "This Riot ID is already linked to another player." |
| Riot ID not found | "This Riot ID does not exist." |
| Match already claimed | "This match already has both teams assigned." |
| Team doesn't match claim | "Your team does not match enough players in this match." |
| Participant banned | "A participant in this match is currently banned: {reason}" |
| Invoker banned | "Your account is currently banned: {reason}" (checked on all action commands: register-team, add, submit, visibility, transfer-captain, remove, register-event, claim-match) |
| Invalid game mode | "This replay is from {gameMode}. Only Summoner's Rift custom games are accepted." |
| Bot lacks permissions | "I need permission to send messages and attach embeds in this channel." |

---

## Package Structure

```
artifacts/discord-bot/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Entry: login, register commands
│   ├── commands/
│   │   ├── register-team.ts
│   │   ├── add.ts
│   │   ├── submit.ts
│   │   ├── stats.ts
│   │   ├── roster.ts
│   │   ├── remove.ts
│   │   ├── register-event.ts
│   │   ├── transfer-captain.ts
│   │   ├── leave.ts
│   │   ├── link-riot.ts
│   │   ├── claim-match.ts
│   │   └── visibility.ts
│   ├── lib/
│   │   ├── rofl-parser.ts  # .rofl binary parsing
│   │   ├── team-matcher.ts # Match players to teams by PUUID
│   │   └── elo.ts          # Re-export from @workspace/db or lib
│   └── embeds/
│       └── match-result.ts # Discord embed builder
```

**Dependencies:**
```json
{
  "dependencies": {
    "discord.js": "^14",
    "@workspace/db": "workspace:*",
    "drizzle-orm": "catalog:"
  }
}
```

---

## Season Broadcast (Defect 6)

Bot runs a daily check (e.g., 00:00 UTC):
1. Query active season's `endDate`
2. If `endDate - NOW()` ≤ 7 days: broadcast to all guilds where bot is installed
   - 7 days: "⚠️ Season **{name}** ends in 7 days! Current top 5: ..."
   - 3 days: "⚠️ 3 days remaining! ..."
   - 1 day: "🔴 Season ends TOMORROW! Final standings: ..."
3. On season complete (admin triggers via web): DM every active team captain with final standings and placement.

If bot was offline on a broadcast day, on startup check if any missed (compare dates, send if within 24h).

---

## Notification Poller (Defect 3)

Bot polls `notifications` table on startup + every 60 seconds:
```
SELECT * FROM notifications WHERE is_read = false AND dm_sent = false AND dm_failed = false
```

For each notification:
1. Look up `player.discordId`
2. If null → skip (web only)
3. If `player.notificationPreference = "web"` → skip DM
4. `client.users.fetch(discordId)` → `user.send(embed)`
5. Success → `UPDATE notifications SET dm_sent = true`
6. Failure (blocked DMs, invalid user) → `UPDATE notifications SET dm_failed = true`

Batch size: 10 notifications per cycle. 1 second delay between batches (Discord rate limit: 5 DMs/second).

---

## Health Monitoring (Defect 13)

- Bot writes heartbeat to `bot_heartbeats` table every 5 minutes
- API server has `GET /api/bot-status`: checks if last heartbeat is within 10 minutes → `{ online: true/false, lastSeen: timestamp }`
- Bot container Dockerfile: `HEALTHCHECK --interval=30s CMD node healthcheck.js` (checks `client.ws.ping`)
- Portainer restart policy: `unless-stopped`

---

## Deployment

- Runs as a separate Portainer stack (`vclol-bot`)
- Needs: `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `ROFL_UPLOAD_DIR`
- Persistent connection to Discord gateway — should NOT restart frequently
- Health check: bot responds to `/ping` or logs heartbeat interval
