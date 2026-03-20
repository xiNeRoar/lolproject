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

### `/register-team <name> <tag>`
**Who:** Any Discord user
**What:** Creates a new team. The invoking user becomes captain.
**Flow:**
1. Check: does a player record exist for this Discord user? If not, create one (discordId + discordUsername, riotId = ask in DM)
2. Validate: team name unique, tag is 2-5 uppercase alphanumeric
3. Insert `teams` row (captainPlayerId = player.id, discordServerId = guild.id)
4. Insert `team_members` row (teamId, playerId, role = null, status = active)
5. Reply: "Team **{name}** [{tag}] created! Use `/add` to add your teammates."

### `/add <@user> [role]`
**Who:** Team captain only
**What:** Adds a Discord user to the captain's team.
**Flow:**
1. Look up captain's team (most recent active team where captain = invoker)
2. Check: is @user already on this team? If yes, reject
3. Check: does a player record exist for @user? If not, create one
4. Insert `team_members` row
5. DM the added player: "You've been added to **{team}**. Please reply with your Riot ID (e.g. `Name#TAG`)."
6. Reply in channel: "@user added to **{team}** as {role || 'unassigned'}."

### `/submit` (with .rofl file attachment)
**Who:** Any team member
**What:** Upload a .rofl file to record a match result.
**Flow:**
1. Download the .rofl attachment (Discord allows up to 25MB for boosted servers, 8MB default)
2. Validate: check ROFL2 magic bytes
3. Parse metadata → extract 10 player entries
4. Group by TEAM (100 vs 200)
5. Match each group to a registered team by cross-referencing PUUIDs/riotIds against `team_members`
6. If both teams identified:
   a. Create `matches` row (set `visibleAfter = createdAt + 7 days`)
   b. Create 10 `match_players` rows
   c. Calculate + update team ELO
   d. Write `elo_history`
   e. Store .rofl file on disk
   f. Reply: embed with match summary (teams, score, top performers)
7. If one/both teams unidentified:
   a. Reply: "Could not identify team for: {list of unknown players}. Ask your team captain to `/add` them, then re-submit."

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
| Not captain | "Only the team captain can use this command." |
| Transfer target not on team | "Must be an active team member to become captain." |
| Captain tries /leave | "Use `/transfer-captain` first before leaving." |
| Not a member of any team | "You are not a member of any team." |
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
│   │   ├── transfer-captain.ts
│   │   └── leave.ts
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

## Deployment

- Runs as a separate Portainer stack (`vclol-bot`)
- Needs: `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `ROFL_UPLOAD_DIR`
- Persistent connection to Discord gateway — should NOT restart frequently
- Health check: bot responds to `/ping` or logs heartbeat interval
