# VCLoL — Schema Contract (Layer 1)

**Status:** LOCKED. Do not change table names, primary keys, or foreign key relationships without user approval.
**Layer 2 (individual columns) may be added freely at any time.**

---

## New Tables

### `teams`
```typescript
export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tag: text("tag").notNull(),                // 2-5 uppercase chars, e.g. "TSM"
  captainPlayerId: integer("captain_player_id")
    .references(() => playersTable.id, { onDelete: "set null" }),
    // nullable: allows orphaned teams when captain player is deleted
    // Admin can assign new captain via PUT /api/teams/:id
  discordServerId: text("discord_server_id"), // guild where team registered
  teamElo: integer("team_elo").notNull().default(1000),
  peakElo: integer("peak_elo").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  defaultMatchVisibility: text("default_match_visibility").default("participants"), // private | participants | public
  lastMatchAt: timestamp("last_match_at"),           // updated on every match submission; null = never played
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### `team_members`
```typescript
export const teamMembersTable = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),
  role: text("role"),                        // top, jg, mid, adc, sup, fill, null
  status: text("status").notNull().default("active"), // active, inactive
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at"),          // updated when member appears in .rofl
});
```

### `match_players`
```typescript
export const matchPlayersTable = pgTable("match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull()
    .references(() => matchesTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id")
    .references(() => playersTable.id, { onDelete: "set null" }),
  teamSide: text("team_side").notNull(),     // "A" or "B" (maps to TEAM 100/200)
  champion: text("champion"),                // from SKIN field
  kills: integer("kills").default(0),
  deaths: integer("deaths").default(0),
  assists: integer("assists").default(0),
  cs: integer("cs").default(0),              // MINIONS_KILLED
  neutralCs: integer("neutral_cs").default(0),
  gold: integer("gold").default(0),          // GOLD_EARNED
  damageToChampions: integer("damage_to_champions").default(0),
  visionScore: integer("vision_score").default(0),
  level: integer("level"),
  win: boolean("win").notNull().default(false),
  item0: integer("item0"),
  item1: integer("item1"),
  item2: integer("item2"),
  item3: integer("item3"),
  item4: integer("item4"),
  item5: integer("item5"),
  item6: integer("item6"),
  summonerSpell1: integer("summoner_spell_1"),
  summonerSpell2: integer("summoner_spell_2"),
  teamPosition: text("team_position"),       // TEAM_POSITION or INDIVIDUAL_POSITION
  puuid: text("puuid"),                      // from .rofl PUUID field
  riotIdGameName: text("riot_id_game_name"), // from .rofl RIOT_ID_GAME_NAME
  riotIdTagLine: text("riot_id_tag_line"),   // from .rofl RIOT_ID_TAG_LINE
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## Modified Tables

### `matches` (REWRITE)
```typescript
export const matchesTable = pgTable("matches", {
  id: serial("id").primaryKey(),
  // Team references (replaces playerAId/playerBId)
  teamAId: integer("team_a_id").references(() => teamsTable.id, { onDelete: "set null" }),
  teamBId: integer("team_b_id").references(() => teamsTable.id, { onDelete: "set null" }),
  sideAName: text("side_a_name").notNull(),  // team name at time of match
  sideBName: text("side_b_name").notNull(),
  matchTitle: text("match_title").notNull(),
  winnerName: text("winner_name").notNull(),
  score: text("score"),
  format: text("format"),                     // BO1, BO3, BO5
  // Team ELO tracking (replaces playerA/BEloBefore/After)
  teamAEloBefore: integer("team_a_elo_before"),
  teamAEloAfter: integer("team_a_elo_after"),
  teamBEloBefore: integer("team_b_elo_before"),
  teamBEloAfter: integer("team_b_elo_after"),
  // Game metadata from .rofl
  gameId: text("game_id"),
  gameDuration: integer("game_duration"),     // milliseconds from .rofl gameLength
  gameVersion: text("game_version"),          // patch from .rofl
  resultSource: text("result_source").notNull().default("rofl_parse"),
  roflFilePath: text("rofl_file_path"),       // stored .rofl for VOD pipeline
  // Visibility: private for 7 days, then auto-public. Captain can override.
  visibleAfter: timestamp("visible_after"),   // NULL = use default (createdAt + 7 days). Captain can set to far-future (permanent private) or past (immediate public).
  // Season + Event links
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "set null" }),
  // Bracket fields (kept from v1)
  isPlayoff: boolean("is_playoff").notNull().default(false),
  round: integer("round"),
  bracketSlot: integer("bracket_slot"),
  nextMatchId: integer("next_match_id"),
  isLosersBracket: boolean("is_losers_bracket").default(false),
  groupId: integer("group_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Removed from v1:** `playerAId`, `playerBId`, `playerAEloBefore`, `playerAEloAfter`, `playerBEloBefore`, `playerBEloAfter`, `vodUrl`

### `players` (MODIFY)
```typescript
export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  riotId: text("riot_id").notNull().unique(),
  discordUsername: text("discord_username").notNull(),
  discordId: text("discord_id"),
  puuid: text("puuid"),                       // NEW: from .rofl, nullable until verified
  primaryRole: text("primary_role"),          // NEW: top/jg/mid/adc/sup
  secondaryRole: text("secondary_role"),      // NEW
  isActive: boolean("is_active").notNull().default(true),
  defaultMatchVisibility: text("default_match_visibility").default("participants"), // private | participants | public
  lastMatchAt: timestamp("last_match_at"),           // updated on every match submission; null = never played
  email: text("email"),
  notificationPreference: text("notification_preference").notNull().default("web"),
  registrationStatus: text("registration_status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Removed from v1:** `currentElo`, `peakElo`, `wins`, `losses`

### `eloHistory` (MODIFY — add teamId)
```typescript
export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "cascade" }),  // NEW
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "cascade" }),  // keep for backward compat
  elo: integer("elo").notNull(),
  delta: integer("delta").notNull().default(0),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  reason: text("reason").notNull().default("match"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### `ladderSettings` (MODIFY — remove challenge fields)
```typescript
export const ladderSettingsTable = pgTable("ladder_settings", {
  id: serial("id").primaryKey(),
  kFactor: integer("k_factor").notNull().default(32),
  minMatchesForDisplay: integer("min_matches_for_display").notNull().default(4),
  playoffSize: integer("playoff_size").notNull().default(8),
  playoffFormat: text("playoff_format").notNull().default("single_elimination"),
  defaultMatchFormat: text("default_match_format").notNull().default("BO1"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

**Removed from v1:** `maxChallengesPerWeek`, `maxChallengesSameOpponentPerWeek`, `challengeExpiryHours`, `maxDeclinesPerWeek`, `maxDeclinesSameOpponentPerWeek`, `noShowExpiryDays`, `playoffMinPlayers`

### `seasonChampions` (MODIFY — playerId → teamId)
```typescript
export const seasonChampionsTable = pgTable("season_champions", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull()
    .references(() => seasonsTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").notNull()
    .references(() => teamsTable.id, { onDelete: "cascade" }),
  teamName: text("team_name"),               // denormalized for historical display
  finalElo: integer("final_elo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### `eventRegistrations` (MODIFY — add teamId)
```typescript
// Keep all existing fields for backward compat. Add teamId.
export const eventRegistrationsTable = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => eventsTable.id, { onDelete: "cascade" }).notNull(),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "set null" }),  // NEW
  riotId: text("riot_id").notNull(),
  discordUsername: text("discord_username").notNull(),
  currentRank: text("current_rank").notNull(),
  city: text("city").notNull(),
  availabilityConfirmation: text("availability_confirmation").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("registered"),
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## Deleted Tables

- `challenges` — 1v1 challenge system
- `matchmakingQueue` — 1v1 matchmaking
- `interestSubmissions` — deprecated feature
- `adminScheduleSettings` — 1v1 scheduling

---

## Kept Unchanged

- `adminUsers` — admin auth
- `events` — event structure
- `seasons` — season lifecycle
- `vodEntries` — VOD records (already has matchId FK)
- `vodTimestamps` — VOD timestamp markers
- `replaySubmissions` — render queue
- `notifications` — player notifications (added `dmSent`, `dmFailed` boolean columns)
- `playerBadges` — badge records

### New Tables (Defect Remediation)

#### `admin_actions`
```typescript
export const adminActionsTable = pgTable("admin_actions", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => adminUsersTable.id, { onDelete: "cascade" }),
  actionType: text("action_type").notNull(), // create | update | delete | activate | complete | ban | unban
  entityType: text("entity_type").notNull(), // team | player | match | season | event | registration | vod | ladderSettings
  entityId: integer("entity_id"),
  detail: text("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

#### `player_bans`
```typescript
export const playerBansTable = pgTable("player_bans", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teamsTable.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  bannedBy: integer("banned_by").notNull().references(() => adminUsersTable.id),
  banType: text("ban_type").notNull().default("permanent"), // temporary | permanent
  expiresAt: timestamp("expires_at"), // null = permanent
  isActive: boolean("is_active").notNull().default(true),
  defaultMatchVisibility: text("default_match_visibility").default("participants"), // private | participants | public
  lastMatchAt: timestamp("last_match_at"),           // updated on every match submission; null = never played
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```
One of `playerId` or `teamId` must be set. Ban targets either a player or a team.

#### `bot_heartbeats`
```typescript
export const botHeartbeatsTable = pgTable("bot_heartbeats", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});
```

---

## FK Relationship Map

```
teams.captainPlayerId → players.id
team_members.teamId → teams.id
team_members.playerId → players.id
matches.teamAId → teams.id
matches.teamBId → teams.id
matches.seasonId → seasons.id
matches.eventId → events.id
match_players.matchId → matches.id
match_players.playerId → players.id
elo_history.teamId → teams.id
elo_history.matchId → matches.id
season_champions.seasonId → seasons.id
season_champions.teamId → teams.id
event_registrations.teamId → teams.id
event_registrations.eventId → events.id
vod_entries.matchId → matches.id
vod_entries.eventId → events.id
vod_entries.playerId → players.id
replay_submissions.matchId → matches.id
notifications.playerId → players.id
player_badges.playerId → players.id
player_badges.seasonId → seasons.id
admin_actions.adminId → admin_users.id
player_bans.playerId → players.id
player_bans.teamId → teams.id
player_bans.bannedBy → admin_users.id
```

---

## schema/index.ts Exports

```typescript
export * from "./adminUsers";
export * from "./events";
export * from "./eventRegistrations";
export * from "./matches";
export * from "./matchPlayers";       // NEW
export * from "./teams";              // NEW
export * from "./teamMembers";        // NEW
export * from "./vodEntries";
export * from "./players";
export * from "./seasons";
export * from "./vodTimestamps";
export * from "./ladderSettings";
export * from "./eloHistory";
export * from "./seasonChampions";
export * from "./playerBadges";
export * from "./replaySubmissions";
export * from "./notifications";
export * from "./adminActions";       // NEW — audit log
export * from "./playerBans";         // NEW — ban system
export * from "./botHeartbeats";      // NEW — bot health monitoring
// REMOVED: challenges, matchmakingQueue, interestSubmissions, adminScheduleSettings
```
