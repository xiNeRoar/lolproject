# VCLOL — Batch 2 Prompt (Phases 2–7)

---

## IMPORTANT: THIS IS BATCH 2 OF 2

Batch 1 has already been completed. This prompt builds on top of that work.
Do NOT redo anything from Batch 1.

This prompt is large. Execute one phase at a time. Do not proceed to the next phase until the current phase's STOP checklist passes entirely.

**If token limit is approaching mid-phase: STOP at the current phase boundary, tell the user what was completed and what remains. Do not silently skip steps.**

---

## PLATFORM PURPOSE (CONTEXT — READ FIRST)

This is **Vancouver Competitive LoL Project (VCLoL)** — a structured local competitive platform for Vancouver / Lower Mainland League of Legends players.

**Core value:** ELO Ladder (primary) + VOD Library (learning). Events are secondary tools.

**Architecture:** pnpm monorepo.
- Frontend: `artifacts/vclol/` (React + Vite + Wouter + TanStack Query + Tailwind + shadcn/ui)
- Backend: `artifacts/api-server/` (Express + TypeScript)
- Schema: `lib/db/src/schema/` (Drizzle ORM + PostgreSQL)
- OpenAPI spec: `lib/api-spec/openapi.yaml` — single source of truth for all API types
- Generated hooks: `lib/api-client-react/src/generated/` — NEVER edit manually, always regenerate via orval

**Correct workflow for any new feature:**
1. Add/extend schema in `lib/db/src/schema/`
2. Export from `lib/db/src/schema/index.ts`
3. Add paths + schemas to `lib/api-spec/openapi.yaml`
4. Run orval codegen → regenerates `lib/api-client-react/src/generated/`
5. Add Express route in `artifacts/api-server/src/routes/`
6. Register in `artifacts/api-server/src/routes/index.ts`
7. Build React page using generated hooks only

**Division of responsibility:**
- **Replit (you):** All frontend, all schema, stub API endpoints
- **Claude (later):** Complex business logic, Discord OAuth, RiotID Riot API validation, ELO automation

"Stub endpoint" = route exists, validates required fields, does basic DB insert/select, returns correct shape. No complex business logic.

All code must match existing patterns: `formatX()` helpers in routes, `requireAdmin` middleware for admin routes, Drizzle ORM only (no raw SQL), no `any` types.

---

## PHASE 2 — New Schema Tables + Migrations

### New files in `lib/db/src/schema/`:

**`ladderSettings.ts`**
```typescript
import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";

export const ladderSettingsTable = pgTable("ladder_settings", {
  id: serial("id").primaryKey(),
  kFactor: integer("k_factor").notNull().default(32),
  minMatchesForDisplay: integer("min_matches_for_display").notNull().default(4),
  maxChallengesPerWeek: integer("max_challenges_per_week").notNull().default(3),
  maxChallengesSameOpponentPerWeek: integer("max_challenges_same_opponent_per_week").notNull().default(1),
  challengeExpiryHours: integer("challenge_expiry_hours").notNull().default(48),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type LadderSettings = typeof ladderSettingsTable.$inferSelect;
```

**`adminScheduleSettings.ts`**
```typescript
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const adminScheduleSettingsTable = pgTable("admin_schedule_settings", {
  id: serial("id").primaryKey(),
  // Comma-separated days e.g. "monday,wednesday,friday"
  availableDays: text("available_days").notNull().default(""),
  startTime: text("start_time").notNull().default("19:00"),
  endTime: text("end_time").notNull().default("23:00"),
  maxConcurrentMatches: integer("max_concurrent_matches").notNull().default(2),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type AdminScheduleSettings = typeof adminScheduleSettingsTable.$inferSelect;
```

**`challenges.ts`**
```typescript
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";
import { matchesTable } from "./matches";

export const challengesTable = pgTable("challenges", {
  id: serial("id").primaryKey(),
  challengerId: integer("challenger_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  challengedId: integer("challenged_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  // pending | accepted | declined | expired | completed
  status: text("status").notNull().default("pending"),
  scheduledTime: timestamp("scheduled_time"),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  // Room host submits this after opening the custom game — used by spectator script
  gameId: text("game_id"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type Challenge = typeof challengesTable.$inferSelect;
```

**`matchmakingQueue.ts`**
```typescript
// Infrastructure for Phase 2 auto-matchmaking. Not active yet.
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";

export const matchmakingQueueTable = pgTable("matchmaking_queue", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  eloMin: integer("elo_min"),
  eloMax: integer("elo_max"),
  // waiting | matched | cancelled
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MatchmakingQueue = typeof matchmakingQueueTable.$inferSelect;
```

**`eloHistory.ts`**
```typescript
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { matchesTable } from "./matches";

export const eloHistoryTable = pgTable("elo_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  elo: integer("elo").notNull(),
  delta: integer("delta").notNull().default(0),
  matchId: integer("match_id").references(() => matchesTable.id, { onDelete: "set null" }),
  // match | season_reset | manual
  reason: text("reason").notNull().default("match"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type EloHistory = typeof eloHistoryTable.$inferSelect;
```

**`seasonChampions.ts`**
```typescript
import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";

export const seasonChampionsTable = pgTable("season_champions", {
  id: serial("id").primaryKey(),
  seasonId: integer("season_id").notNull().references(() => seasonsTable.id, { onDelete: "cascade" }),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  finalElo: integer("final_elo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type SeasonChampion = typeof seasonChampionsTable.$inferSelect;
```

**`playerBadges.ts`**
```typescript
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";

// badge_type values: season_champion | first_blood | win_streak | veteran | climber
export const playerBadgesTable = pgTable("player_badges", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").notNull().references(() => playersTable.id, { onDelete: "cascade" }),
  badgeType: text("badge_type").notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
});
export type PlayerBadge = typeof playerBadgesTable.$inferSelect;
```

### Extend existing schemas:

**`lib/db/src/schema/players.ts`** — add these columns inside `playersTable`:
```typescript
discordId: text("discord_id"),
email: text("email"),
// web | email | discord | both
notificationPreference: text("notification_preference").notNull().default("web"),
```

**`lib/db/src/schema/matches.ts`** — add these nullable bracket columns:
```typescript
round: integer("round"),
bracketSlot: integer("bracket_slot"),
nextMatchId: integer("next_match_id"),
isLosersBracket: boolean("is_losers_bracket").default(false),
groupId: integer("group_id"),
```

Add `boolean` to the drizzle-orm import in matches.ts.

### Update `lib/db/src/schema/index.ts` — add exports:
```typescript
export * from "./ladderSettings";
export * from "./adminScheduleSettings";
export * from "./challenges";
export * from "./matchmakingQueue";
export * from "./eloHistory";
export * from "./seasonChampions";
export * from "./playerBadges";
```

### Run migration and codegen:
1. Run Drizzle migration to apply all schema changes
2. Update `lib/api-spec/openapi.yaml` with all new schemas (see Phase 3 for full list)
3. Run orval codegen

**PHASE 2 STOP:**
- [ ] All 7 new schema files exist
- [ ] players table has discord_id, email, notification_preference columns
- [ ] matches table has round, bracket_slot, next_match_id, is_losers_bracket, group_id columns
- [ ] All exported from schema/index.ts
- [ ] Drizzle migration completed successfully
- [ ] Orval codegen completed, generated files updated
- [ ] App still runs without errors

Tell user: "Phase 2 complete."

---

## PHASE 3 — Stub API Endpoints

Add all new OpenAPI paths + schemas to `lib/api-spec/openapi.yaml`, then create route files, then run orval codegen.

### New schemas to add to openapi.yaml components/schemas:

`LadderSettings`: id, kFactor(int), minMatchesForDisplay(int), maxChallengesPerWeek(int), maxChallengesSameOpponentPerWeek(int), challengeExpiryHours(int), updatedAt(string)

`AdminScheduleSettings`: id, availableDays(string), startTime(string), endTime(string), maxConcurrentMatches(int), updatedAt(string)

`Challenge`: id, challengerId(int), challengedId(int), challengerRiotId(string nullable), challengedRiotId(string nullable), status(string), scheduledTime(string nullable), seasonId(int nullable), matchId(int nullable), gameId(string nullable), expiresAt(string), createdAt(string), updatedAt(string)

`CreateChallengeRequest`: challengedId(int required), scheduledTime(string required)

`EloHistoryEntry`: id, playerId(int), elo(int), delta(int), matchId(int nullable), reason(string), createdAt(string)

`SeasonChampion`: id, seasonId(int), playerId(int), playerRiotId(string nullable), finalElo(int), createdAt(string)

`PlayerBadge`: id, playerId(int), badgeType(string), earnedAt(string), seasonId(int nullable)

`MatchmakingQueueResponse`: message(string)

Also add `eventSlug(string nullable)`, `playerARiotId(string nullable)`, `playerBRiotId(string nullable)` to the existing `Match` schema.

### New route files:

**`artifacts/api-server/src/routes/ladderSettings.ts`**
- `GET /` — public. Select first row, if none exists insert default and return it.
- `PUT /` — requireAdmin. Update first row.

**`artifacts/api-server/src/routes/adminSchedule.ts`**
- `GET /` — public. Same singleton pattern.
- `PUT /` — requireAdmin. Update.

**`artifacts/api-server/src/routes/challenges.ts`**
- `GET /` — requireAdmin. List all challenges, join players to get riotIds.
- `GET /player/:playerId` — public. List challenges for a player where status is pending or accepted.
- `POST /` — stub: insert challenge with expiresAt = now + 48hrs. No validation logic yet.
- `PUT /:id/accept` — stub: update status to accepted.
- `PUT /:id/decline` — stub: update status to declined.
- `PUT /:id/game-ready` — stub: update gameId field.
- `DELETE /:id` — requireAdmin.

**`artifacts/api-server/src/routes/eloHistory.ts`**
- `GET /:playerId` — public. Return all elo_history for player ordered by createdAt asc.

**`artifacts/api-server/src/routes/seasonChampions.ts`**
- `GET /` — public. List all season champions, join players for riotId.
- `GET /:seasonId` — public. Get champion for specific season.

**`artifacts/api-server/src/routes/playerBadges.ts`**
- `GET /:playerId` — public. List all badges for player.

**`artifacts/api-server/src/routes/matchmakingQueue.ts`**
- `POST /join` — stub: return `{ message: "Matchmaking coming soon" }` with status 200.
- `DELETE /leave` — stub: return `{ success: true }`.

### Register all new routes in `artifacts/api-server/src/routes/index.ts`:
```typescript
import ladderSettingsRouter from "./ladderSettings";
import adminScheduleRouter from "./adminSchedule";
import challengesRouter from "./challenges";
import eloHistoryRouter from "./eloHistory";
import seasonChampionsRouter from "./seasonChampions";
import playerBadgesRouter from "./playerBadges";
import matchmakingQueueRouter from "./matchmakingQueue";

router.use("/ladder-settings", ladderSettingsRouter);
router.use("/admin-schedule", adminScheduleRouter);
router.use("/challenges", challengesRouter);
router.use("/elo-history", eloHistoryRouter);
router.use("/season-champions", seasonChampionsRouter);
router.use("/player-badges", playerBadgesRouter);
router.use("/matchmaking-queue", matchmakingQueueRouter);
```

Run orval codegen after all spec updates.

**PHASE 3 STOP:**
- [ ] All 7 new route files created
- [ ] All registered in routes/index.ts
- [ ] GET /api/ladder-settings returns a valid response
- [ ] GET /api/admin-schedule returns a valid response
- [ ] GET /api/challenges returns a valid response (admin)
- [ ] GET /api/elo-history/:playerId returns array
- [ ] No existing routes broken
- [ ] Orval codegen completed

Tell user: "Phase 3 complete."

---

## PHASE 4 — Event Formats + Bracket UI

### Install bracket library:
Add `@g-loot/react-tournament-brackets` to `artifacts/vclol/package.json` dependencies.

### Update ManageEvents format field:

File: `artifacts/vclol/src/pages/admin/ManageEvents.tsx`

Replace the free-text `<Input placeholder="Format ...">` with:
```tsx
<select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" {...register("format", { required: true })}>
  <option value="">Select Format</option>
  <option value="Single Elimination">Single Elimination</option>
  <option value="Double Elimination">Double Elimination</option>
  <option value="Round Robin">Round Robin</option>
  <option value="Swiss">Swiss</option>
  <option value="Group Stage + Knockout">Group Stage + Knockout</option>
  <option value="In-house">In-house</option>
  <option value="1v1 Ladder">1v1 Ladder</option>
</select>
```

### Create bracket components in `artifacts/vclol/src/components/brackets/`:

**`MatchList.tsx`** — reusable match list, extracted from EventDetail. Props: `matches: Match[]`. Renders existing match rows style. Each row is a `<Link href={/matches/${m.id}}>`.

**`RoundRobinTable.tsx`** — Props: `matches: Match[]`. Groups by participants, shows standings table: Rank | Player | W | L | Points (2 per win, 0 per loss). If no matches, show empty state.

**`SwissRoundsTable.tsx`** — Props: `matches: Match[]`. Groups matches by `round` field. Shows each round as a titled section with match pairings. If round is null on all matches, fall back to MatchList.

**`SingleEliminationBracket.tsx`** — Uses `@g-loot/react-tournament-brackets`. Props: `matches: Match[]`.

Transform matches to library format: each match needs `{ id, name, nextMatchId, tournamentRoundText, startTime, state, participants: [{id, name, resultText, isWinner}] }`.

Use `createTheme` from the library to match site colors:
```typescript
const vclolTheme = createTheme({
  textColor: { main: '#e2e8f0', highlighted: '#ffffff', dark: '#94a3b8' },
  matchBackground: { wonColor: '#1e293b', lostColor: '#0f172a' },
  score: {
    background: { wonColor: '#1d4ed8', lostColor: '#1e293b' },
    text: { highlightedWonColor: '#60a5fa', highlightedLostColor: '#94a3b8' },
  },
  border: { color: '#334155', highlightedColor: '#3b82f6' },
  roundHeader: { backgroundColor: '#1e293b', fontColor: '#94a3b8' },
  connectorColor: '#334155',
  connectorColorHighlight: '#3b82f6',
  svgBackground: 'transparent',
});
```

Wrap in SVGViewer with responsive width. If matches array is empty or round/bracketSlot are all null, render `<MatchList matches={matches} />` as fallback.

**`DoubleEliminationBracket.tsx`** — Same pattern using `DoubleEliminationBracket` from library. Same theme. Same fallback to MatchList.

### Update EventDetail:

File: `artifacts/vclol/src/pages/public/EventDetail.tsx`

Replace the static "Match Results" section with:
```tsx
import { MatchList } from "@/components/brackets/MatchList";
import { SingleEliminationBracket } from "@/components/brackets/SingleEliminationBracket";
import { DoubleEliminationBracket } from "@/components/brackets/DoubleEliminationBracket";
import { RoundRobinTable } from "@/components/brackets/RoundRobinTable";
import { SwissRoundsTable } from "@/components/brackets/SwissRoundsTable";

function EventMatches({ format, matches }: { format: string; matches: Match[] }) {
  if (format === "Single Elimination") return <SingleEliminationBracket matches={matches} />;
  if (format === "Double Elimination") return <DoubleEliminationBracket matches={matches} />;
  if (format === "Round Robin") return <RoundRobinTable matches={matches} />;
  if (format === "Swiss") return <SwissRoundsTable matches={matches} />;
  return <MatchList matches={matches} />;
}
```

Use `<EventMatches format={event.format} matches={event.matches ?? []} />` where the match results section was.

**PHASE 4 STOP:**
- [ ] ManageEvents format field is a dropdown with all 7 options
- [ ] All 5 bracket components exist in src/components/brackets/
- [ ] EventDetail uses EventMatches component
- [ ] SingleEliminationBracket renders without errors (test with empty array)
- [ ] MatchList is rendered as fallback for unknown format
- [ ] Match rows in MatchList are clickable links to /matches/:id
- [ ] App runs without errors

Tell user: "Phase 4 complete."

---

## PHASE 5 — Player Auth + Registration + Dashboard

**Note:** Discord OAuth and RiotID Riot API validation are NOT implemented here. Claude will add them later. Build full UI with stubs.

### New pages:

**`artifacts/vclol/src/pages/public/Register.tsx`** — Route: `/register`

Also update `/interest` route in App.tsx to redirect to `/register`.

Form fields:
- Riot ID (placeholder: "Player#NA1") — required, min 3 chars
- Discord Username — required
- Email — required, email validation
- Notification preference — radio group: "Web only" | "Email" | "Discord DM" | "Email + Discord" (values: "web" | "email" | "discord" | "both")
- Checkbox: "I agree to compete fairly and follow platform rules" — required

On submit: `POST /api/players` with `{ riotId, discordUsername, email, notificationPreference }`.

Success state: show a card with checkmark icon: "Registration received! Your Riot ID will be verified within 24 hours. You'll be notified via your chosen channel."

Note in code comment: `// TODO Claude: add Riot API validation for riotId before insert`

**`artifacts/vclol/src/pages/public/PlayerLogin.tsx`** — Route: `/login`

Clean centered card layout. "Login with Discord" button (large, Discord indigo color `#5865F2`). Button `href="#"` for now.

Below button: "Your Riot ID is your competitive identity on this platform."

Small text below: "New player? Register here →" link to `/register`

Note in code comment: `// TODO Claude: implement Discord OAuth flow`

**`artifacts/vclol/src/pages/public/PlayerDashboard.tsx`** — Route: `/dashboard`

Auth check: `const playerId = localStorage.getItem("vclol_player_id")`. If null, show centered card: "You must be logged in to view your dashboard." with "Login with Discord →" button to `/login`.

Note in code comment: `// TODO Claude: replace localStorage auth check with real Discord OAuth session`

If logged in (playerId exists), fetch:
- `useGetPlayer(playerId)` — for profile data
- `useGetEloHistory(Number(playerId))` — for ELO graph (use generated hook)
- `useGetPlayerBadges(Number(playerId))` — for badges (use generated hook)
- `useGetChallengesForPlayer(Number(playerId))` — for pending/upcoming (use generated hook)

Dashboard sections:

**ELO Card** (top, full width):
- Large ELO number with rank tier badge (reuse eloBadgeColor logic from Ladder.tsx)
- Peak ELO
- Season name + "X days remaining" (fetch from useListSeasons, find active)
- W / L / Win Rate

**Season Progress bar:**
- `matches played: X / 4 required` with a progress bar (shadcn Progress component)

**Two-column grid:**

Left: **Pending Actions**
- List challenges from API where status = "pending" and challengedId = playerId
- Each row: opponent riotId + scheduled time + Accept button + Decline button (buttons call PUT /api/challenges/:id/accept or /decline, stub)
- Empty state: "No pending challenges"

Right: **Upcoming Matches**
- Challenges where status = "accepted"
- Shows opponent + scheduled time + "Room instructions will appear here when match time approaches"
- Empty state: "No upcoming matches"

**ELO History Graph** (full width):
- recharts LineChart, x-axis = createdAt (formatted as date), y-axis = elo
- Line color: primary blue
- If fewer than 2 data points: show "Play more matches to see your ELO history" message instead

**Recent Results** (full width):
- Last 5 matches from player.recentMatches
- Each row: W/L badge + opponent + score + ELO delta (reuse existing PlayerProfile match row style)
- Each row links to /matches/:id

**Badges** (full width):
- Fetched from /api/player-badges/:playerId
- Each badge: emoji icon + label + season name
- Badge icons: 🏆 season_champion, ⚡ first_blood, 🔥 win_streak, 💪 veteran, 📈 climber
- Empty state: "No badges earned yet. Keep competing!"

**Notification Settings** (full width):
- Small card with current notification preference
- Radio group to change it
- Save button → PUT /api/players/:id/edit
- Show success toast on save

### Update `PublicLayout.tsx`:

Add to header right side, after "Join Interest List" button:
```tsx
{localStorage.getItem("vclol_player_id") ? (
  <Link href="/dashboard" className="text-sm font-medium text-primary hover:text-primary/80">
    My Dashboard
  </Link>
) : (
  <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
    Login
  </Link>
)}
```

Note in code comment: `// TODO Claude: replace localStorage check with real session`

### Update `App.tsx`:
```typescript
import Register from "@/pages/public/Register";
import PlayerLogin from "@/pages/public/PlayerLogin";
import PlayerDashboard from "@/pages/public/PlayerDashboard";

// Add routes:
<Route path="/register" component={Register} />
<Route path="/login" component={PlayerLogin} />
<Route path="/dashboard" component={PlayerDashboard} />
// Update /interest to redirect:
<Route path="/interest">{() => { window.location.replace("/register"); return null; }}</Route>
```

**PHASE 5 STOP:**
- [ ] /register page renders and form submits without errors
- [ ] /login page renders with Discord button (href="#")
- [ ] /dashboard shows logged-out state when no localStorage value
- [ ] /dashboard shows all sections when localStorage vclol_player_id is set
- [ ] ELO graph renders (recharts) or shows empty state
- [ ] Badges section renders or shows empty state
- [ ] Header shows Login link when not logged in
- [ ] /interest redirects to /register
- [ ] All 3 routes in App.tsx

Tell user: "Phase 5 complete."

---

## PHASE 6 — Challenge System UI

### Update `artifacts/vclol/src/pages/public/Ladder.tsx`

Add challenge button to each ladder row. Auth check: `const isLoggedIn = !!localStorage.getItem("vclol_player_id")` and `const myPlayerId = Number(localStorage.getItem("vclol_player_id"))`.

Add a `ChallengeModal` component at the top of the file (same file, not separate):

```tsx
function ChallengeModal({
  targetPlayer,
  onClose,
}: {
  targetPlayer: { id: number; riotId: string } | null;
  onClose: () => void;
}) {
  // Fetch admin schedule for available time slots
  const { data: schedule } = useGetAdminSchedule();
  const createChallenge = useCreateChallenge();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Generate available slots for next 7 days based on schedule
  // availableDays is comma-separated e.g. "monday,wednesday,friday"
  // startTime/endTime are "19:00" format
  // Generate one slot per available day at the start time
  const slots = generateSlots(schedule); // implement this pure function

  const handleSubmit = () => {
    if (!selectedSlot || !targetPlayer) return;
    createChallenge.mutate(
      { data: { challengedId: targetPlayer.id, scheduledTime: selectedSlot } },
      { onSuccess: onClose }
    );
  };

  if (!targetPlayer) return null;

  return (
    // Dialog/modal using shadcn Dialog component
    // Title: "Challenge [riotId]"
    // Show slot grid: each slot = a button showing day + time
    // Selected slot highlighted in primary color
    // Confirm button (disabled until slot selected)
    // Cancel button
    // On success: show "Challenge sent! They have 48 hours to accept."
  );
}
```

In each ladder row, after the existing content, add:
```tsx
{isLoggedIn && entry.id !== myPlayerId && (
  <Button
    size="sm"
    variant="outline"
    className="ml-2 shrink-0"
    onClick={(e) => { e.preventDefault(); setChallengeTarget({ id: entry.id, riotId: entry.riotId }); }}
  >
    Challenge
  </Button>
)}
```

Add `useState` for `challengeTarget` and render `<ChallengeModal>` at the bottom of the component.

Note: `// TODO Claude: replace localStorage auth with real session`

### Update `artifacts/vclol/src/pages/public/PlayerProfile.tsx`

Add the same Challenge button + modal at the top of the profile hero card (same auth logic, only show if not own profile).

The modal is the same — extract `ChallengeModal` to `artifacts/vclol/src/components/ChallengeModal.tsx` so it can be shared between Ladder and PlayerProfile.

### New admin page: `artifacts/vclol/src/pages/admin/ManageChallenges.tsx`

Table columns: Challenger | Challenged | Status badge | Scheduled Time | Game ID | Actions

Status badges: pending=secondary, accepted=green, declined=outline muted, expired=outline muted, completed=default

Actions column:
- Delete button (all statuses)
- If status = "accepted" and gameId is not null: show "Create Match →" button that navigates to `/admin/matches` with query params `?playerAId=X&playerBId=Y` pre-filled (ManageMatches can optionally read these to pre-fill the form)

Filter bar: dropdown to filter by status.

Add to `AdminLayout.tsx` navItems:
```typescript
{ href: "/admin/challenges", label: "Challenges", icon: Swords },
```

Add route to `App.tsx`:
```typescript
import ManageChallenges from "@/pages/admin/ManageChallenges";
<Route path="/admin/challenges" component={ManageChallenges} />
```

**PHASE 6 STOP:**
- [ ] Challenge button appears on Ladder rows when localStorage vclol_player_id is set
- [ ] Challenge button does NOT appear on own row
- [ ] ChallengeModal opens with time slot grid
- [ ] Modal submits to POST /api/challenges
- [ ] Challenge button on PlayerProfile works with same modal
- [ ] ManageChallenges admin page renders
- [ ] ManageChallenges in AdminLayout nav
- [ ] Route in App.tsx

Tell user: "Phase 6 complete."

---

## PHASE 7 — Ladder Settings Page + Player Profile Updates

### New admin page: `artifacts/vclol/src/pages/admin/ManageLadderSettings.tsx`

Single page, no table. Two forms:

**Form 1 — Ladder Rules:**
Fetch `useGetLadderSettings()`. Form fields:
- K-Factor (number, label: "K-Factor — ELO points gained/lost per match")
- Min matches for ladder display (number)
- Max challenges per week (number)
- Max challenges with same opponent per week (number)
- Challenge expiry hours (number)
- Save button → PUT /api/ladder-settings. Show success toast.

**Form 2 — My Availability Schedule:**
Fetch `useGetAdminSchedule()`. Form fields:
- Day checkboxes: Mon Tue Wed Thu Fri Sat Sun (parse/serialize as comma-separated string)
- Start time input (type="time")
- End time input (type="time")
- Max concurrent matches (number)
- Save button → PUT /api/admin-schedule. Show success toast.

Add to `AdminLayout.tsx`:
```typescript
{ href: "/admin/settings", label: "Settings", icon: Settings },
```
Import `Settings` from lucide-react.

Add to `App.tsx`:
```typescript
import ManageLadderSettings from "@/pages/admin/ManageLadderSettings";
<Route path="/admin/settings" component={ManageLadderSettings} />
```

### Update `artifacts/vclol/src/pages/public/Ladder.tsx`

After the ladder table, add a "How the Ladder Works" section. Fetch `useGetLadderSettings()`. Display:

```
How the Ladder Works
• ELO system: each match is worth ±{kFactor} points (varies by opponent ELO)
• Minimum {minMatchesForDisplay} matches required to appear on the ladder
• Maximum {maxChallengesPerWeek} challenges per week
• Same opponent: maximum {maxChallengesSameOpponentPerWeek} time per week
```

All values from API. Show skeleton/loading state while fetching.

### Update `artifacts/vclol/src/pages/public/PlayerProfile.tsx`

Add three new sections after the existing Champion Pool:

**Badges section:**
```tsx
const { data: badges } = useGetPlayerBadges(player.id);
```
Render as a row of badge chips. Each chip: emoji + label.
Badge labels: season_champion→"Season Champion", first_blood→"First Blood", win_streak→"Win Streak", veteran→"Veteran", climber→"Climber"
Empty state: small muted text "No badges earned yet"

**Season Champions:**
```tsx
const { data: champions } = useGetSeasonChampions();
const myChampionships = champions?.filter(c => c.playerId === player.id) ?? [];
```
If any found: show inside the hero card a "🏆 Season Champion" row listing each season name.

**ELO History Graph:**
```tsx
const { data: eloHistory } = useGetEloHistory(player.id);
```
recharts LineChart. x-axis: date from createdAt. y-axis: elo value. Line color: primary.
If fewer than 2 points: don't render the chart section at all.
Position: below the W/L stats row, inside the hero card.

**PHASE 7 STOP — FINAL VERIFICATION:**

Run the complete checklist:

**Navigation:**
- [ ] Nav: Home | Ladder | VODs | Events | About only
- [ ] Contact in footer

**Core user paths:**
- [ ] Ladder → Player Profile (click player row)
- [ ] Player Profile → Match Detail (click match row)
- [ ] Match Detail → Player Profile (click player name)
- [ ] Match Detail → VOD Detail (click VOD button, if VOD exists)
- [ ] Event Detail → Match Detail (click match row)
- [ ] Home VOD card → VOD Detail (not YouTube)
- [ ] VOD Detail Related VODs → shows champion + ELO

**New public pages:**
- [ ] /matches/:id loads
- [ ] /register loads and form works
- [ ] /login loads with Discord button
- [ ] /dashboard loads (logged-out state + logged-in state with localStorage)

**Admin pages:**
- [ ] Dashboard: Players + Seasons stat cards
- [ ] ManageEvents: format is a dropdown
- [ ] ManageLadderSettings: both forms save
- [ ] ManageChallenges: table renders
- [ ] All new admin pages in sidebar nav

**Schema:**
- [ ] 7 new tables in DB
- [ ] matches has bracket columns
- [ ] players has discord_id, email, notification_preference

**Bracket UI:**
- [ ] Single Elimination renders for correct format
- [ ] Round Robin renders for correct format
- [ ] Fallback to MatchList for unknown format

**Challenge system:**
- [ ] Challenge button on Ladder (when localStorage set)
- [ ] Modal with time slots opens
- [ ] Modal submits to API

**Ladder:**
- [ ] "How it Works" section shows dynamic values from API
- [ ] Player Profile shows badges, season champion, ELO graph

**Code quality:**
- [ ] No `any` types
- [ ] No raw SQL
- [ ] All new routes in routes/index.ts
- [ ] All new schema in schema/index.ts
- [ ] All new pages in App.tsx
- [ ] TODO comments in place for Claude's later backend work

Tell user: **"Batch 2 complete. All phases done. Final checklist passed."**
