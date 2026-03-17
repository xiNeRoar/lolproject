# VCLOL Phase 2 — Extension Prompt

---

## HOW TO EXECUTE THIS PROMPT (READ BEFORE STARTING)

**Do NOT attempt to implement everything at once.** This prompt is divided into numbered Parts. You must follow this exact execution sequence:

**Step 1 — Implement Parts 1, 2, 3, 4 only.**
- Part 1: DB schema changes
- Part 2: Shared business logic lib files
- Part 3: OpenAPI spec updates
- Part 4: Run code generation (orval)
After completing Parts 1–4, stop and confirm: the app must still compile and run without errors before continuing.

**Step 2 — Implement Part 5 only (backend routes).**
After completing Part 5, stop and confirm: run the app, verify all new API endpoints respond correctly, no existing endpoints are broken.

**Step 3 — Implement Parts 6, 7, 8, 9, 10, 11 (frontend).**
After completing all frontend parts, stop and confirm: run the app, verify all new pages render without errors, all existing pages still work.

**Step 4 — Implement Part 12 (Drizzle migration).**
Run the migration and confirm the database schema matches the spec.

**Step 5 — Run the full Final Verification Checklist** at the bottom of this prompt.

If any step causes a compile error or runtime crash, fix it before moving to the next step. Never skip ahead.

---

## CRITICAL: READ THIS FIRST

This is an EXTENSION task, not a rebuild. The existing codebase is a working pnpm monorepo. Do NOT restructure, rename, or rewrite anything that is not listed in this prompt. Only ADD new code and EXTEND existing files as instructed.

---

## Existing Architecture (do not change)

**Monorepo layout:**
- `artifacts/vclol/` — React + Vite + Wouter frontend
- `artifacts/api-server/` — Express.js backend
- `lib/db/` — Drizzle ORM schema + PostgreSQL client
- `lib/api-spec/openapi.yaml` — Single source of truth for all API contracts
- `lib/api-client-react/` — Orval-generated TanStack Query hooks (DO NOT manually edit generated files)
- `lib/api-zod/` — Orval-generated Zod types (DO NOT manually edit generated files)
- `scripts/` — Seed and utility scripts

**The correct workflow for any new API feature is always:**
1. Add schema to `lib/db/src/schema/` (new file or extend existing)
2. Export from `lib/db/src/schema/index.ts`
3. Add OpenAPI paths + component schemas to `lib/api-spec/openapi.yaml`
4. Run `pnpm orval` (or equivalent codegen command) to regenerate `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`
5. Implement Express route in `artifacts/api-server/src/routes/`
6. Register route in `artifacts/api-server/src/routes/index.ts`
7. Build React page/component that consumes the generated hook

Never skip steps 1–4. Never write frontend API calls by hand. Never duplicate types.

---

## Engineering Principles (MANDATORY)

These principles apply to every single file you touch or create:

### 1. Single Source of Truth
- All API types derive from `lib/api-spec/openapi.yaml` only
- All DB types derive from Drizzle schema only
- Never define the same type in two places

### 2. Thin Routes, Rich Lib
- Express routes must only: validate input → call a lib function → return response
- Business logic (ELO calculation, soft reset, recommendations) lives in `artifacts/api-server/src/lib/`
- Each lib file exports pure, testable functions

### 3. Consistent Patterns (match existing code exactly)
- Every route file uses a `formatX()` function to shape DB rows into API responses
- Admin-only endpoints use the `requireAdmin` middleware imported from `../middlewares/requireAdmin`
- All DB queries use the Drizzle `db` instance from `@workspace/db`
- Error responses always use `{ error: string }` shape
- Success responses for deletes always use `{ success: true }` shape

### 4. Explicit Over Implicit
- All function parameters and return types must have explicit TypeScript annotations
- No `any` types anywhere. Use `unknown` and narrow with type guards where needed
- All optional fields in DB schema must be nullable, not just optional

### 5. Modularity
- One responsibility per file. A route file handles one resource only
- Shared utilities go in lib, not duplicated across route files
- New schema tables go in their own file under `lib/db/src/schema/`

### 6. Readability
- All non-trivial logic must have a single-line comment explaining WHY, not what
- Use named constants instead of magic numbers (e.g. `const ELO_K_FACTOR = 32`)
- Destructure function params at the top, not inline

### 7. Scalability
- Design new DB tables assuming future growth: use foreign keys, proper indexes, nullable columns only when truly nullable
- The `position` field on VODs is designed for 5v5 future support — include it now but mark nullable
- The `format` field on existing tables (`matches`, `vod_entries`) already supports future formats

---

## PART 1: Database Schema Changes

### New file: `lib/db/src/schema/players.ts`

```typescript
import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  riotId: text("riot_id").notNull().unique(),       // "Name#TAG" format
  discordUsername: text("discord_username").notNull(),
  currentElo: integer("current_elo").notNull().default(1000),
  peakElo: integer("peak_elo").notNull().default(1000),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
```

### New file: `lib/db/src/schema/seasons.ts`

```typescript
import { pgTable, serial, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const seasonsTable = pgTable("seasons", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("upcoming"), // 'upcoming' | 'active' | 'completed'
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  // ELO soft reset factor: new_elo = 1000 + (old_elo - 1000) * factor
  eloResetFactor: numeric("elo_reset_factor", { precision: 3, scale: 2 }).notNull().default("0.50"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSeasonSchema = createInsertSchema(seasonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasonsTable.$inferSelect;
```

### New file: `lib/db/src/schema/vodTimestamps.ts`

```typescript
import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vodEntriesTable } from "./vodEntries";

export const vodTimestampsTable = pgTable("vod_timestamps", {
  id: serial("id").primaryKey(),
  vodId: integer("vod_id").notNull().references(() => vodEntriesTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),     // e.g. "First Blood", "Tower Destroyed"
  seconds: integer("seconds").notNull(), // timestamp in seconds from video start
  // type enables future auto-extraction from Replay API to slot into correct category
  type: text("type").notNull().default("manual"), // 'kill' | 'death' | 'tower' | 'first_blood' | 'manual'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVodTimestampSchema = createInsertSchema(vodTimestampsTable).omit({ id: true, createdAt: true });
export type InsertVodTimestamp = z.infer<typeof insertVodTimestampSchema>;
export type VodTimestamp = typeof vodTimestampsTable.$inferSelect;
```

### Extend existing: `lib/db/src/schema/matches.ts`

Add the following columns to `matchesTable`. Keep all existing columns unchanged:

```typescript
// Add these imports:
import { playersTable } from "./players";
import { seasonsTable } from "./seasons";

// Add these columns inside pgTable("matches", { ...existing columns..., NEW COLUMNS BELOW }):
  playerAId: integer("player_a_id").references(() => playersTable.id, { onDelete: "set null" }),
  playerBId: integer("player_b_id").references(() => playersTable.id, { onDelete: "set null" }),
  playerAEloBefore: integer("player_a_elo_before"),
  playerAEloAfter: integer("player_a_elo_after"),
  playerBEloBefore: integer("player_b_elo_before"),
  playerBEloAfter: integer("player_b_elo_after"),
  seasonId: integer("season_id").references(() => seasonsTable.id, { onDelete: "set null" }),
  isPlayoff: boolean("is_playoff").notNull().default(false),
```

### Extend existing: `lib/db/src/schema/vodEntries.ts`

Add the following columns to `vodEntriesTable`. Keep all existing columns unchanged:

```typescript
// Add this import:
import { playersTable } from "./players";

// Add these columns inside pgTable("vod_entries", { ...existing columns..., NEW COLUMNS BELOW }):
  playerId: integer("player_id").references(() => playersTable.id, { onDelete: "set null" }),
  champion: text("champion"),
  opponentChampion: text("opponent_champion"),
  // position is nullable now; will be required for 5v5 use cases in future
  position: text("position"),       // 'mid' | 'top' | 'jungle' | 'bot' | 'support'
  patch: text("patch"),             // e.g. "14.8"
  playerEloAtTime: integer("player_elo_at_time"), // snapshot of ELO when match was played
```

### Update: `lib/db/src/schema/index.ts`

Add exports for all new schema files:
```typescript
export * from "./players";
export * from "./seasons";
export * from "./vodTimestamps";
// existing exports remain unchanged
```

---

## PART 2: Shared Business Logic

### New file: `artifacts/api-server/src/lib/elo.ts`

```typescript
const ELO_K_FACTOR = 32;
const ELO_BASE = 1000;

/**
 * Standard Elo rating calculation.
 * Returns the new Elo rating for a player after a match.
 */
export function calculateElo(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  kFactor: number = ELO_K_FACTOR
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  const score = won ? 1 : 0;
  return Math.round(playerElo + kFactor * (score - expected));
}

/**
 * Soft ELO reset between seasons.
 * Compresses ELO toward baseline — preserves relative rank while
 * narrowing the spread to give all players a fresh start.
 */
export function softResetElo(currentElo: number, factor: number = 0.5): number {
  return Math.round(ELO_BASE + (currentElo - ELO_BASE) * factor);
}

/**
 * Minimum matches required to appear on the public ladder.
 */
export const LADDER_MIN_MATCHES = 4;

/**
 * Playoff qualification: top N players by ELO at season end.
 * Uses 8 when playerCount >= 16, otherwise 4.
 */
export function getPlayoffSize(playerCount: number): number {
  return playerCount >= 16 ? 8 : 4;
}
```

### New file: `artifacts/api-server/src/lib/vodRecommendations.ts`

```typescript
import { db } from "@workspace/db";
import { vodEntriesTable, playersTable } from "@workspace/db";
import { eq, ne, and, isNotNull, sql } from "drizzle-orm";

export interface VodRecommendationInput {
  vodId: number;
  champion: string | null;
  opponentChampion: string | null;
  position: string | null;
  playerEloAtTime: number | null;
}

/**
 * Rule-based VOD recommendations. No AI required.
 * Priority: same matchup → same champion → same position → same ELO band.
 * Returns max 4 results.
 */
export async function getRelatedVods(input: VodRecommendationInput) {
  const { vodId, champion, opponentChampion, position, playerEloAtTime } = input;

  // Same champion + same opponent (exact matchup match)
  if (champion && opponentChampion) {
    const matchupResults = await db
      .select()
      .from(vodEntriesTable)
      .where(
        and(
          ne(vodEntriesTable.id, vodId),
          eq(vodEntriesTable.champion, champion),
          eq(vodEntriesTable.opponentChampion, opponentChampion)
        )
      )
      .limit(4);

    if (matchupResults.length >= 2) return matchupResults;
  }

  // Same champion (any opponent)
  if (champion) {
    const championResults = await db
      .select()
      .from(vodEntriesTable)
      .where(
        and(
          ne(vodEntriesTable.id, vodId),
          eq(vodEntriesTable.champion, champion)
        )
      )
      .limit(4);

    if (championResults.length >= 2) return championResults;
  }

  // Same position fallback (for 5v5 future use)
  if (position) {
    const positionResults = await db
      .select()
      .from(vodEntriesTable)
      .where(
        and(
          ne(vodEntriesTable.id, vodId),
          eq(vodEntriesTable.position, position)
        )
      )
      .limit(4);

    return positionResults;
  }

  return [];
}
```

---

## PART 3: OpenAPI Spec Updates (`lib/api-spec/openapi.yaml`)

Add the following to the existing `openapi.yaml`. Do NOT remove any existing content.

### New tags (add to existing `tags` list):
```yaml
  - name: players
    description: Player profiles and ELO management
  - name: seasons
    description: Season lifecycle management
  - name: ladder
    description: Public ELO ladder
  - name: vodTimestamps
    description: VOD timestamp markers
```

### New paths (add after existing paths):

```yaml
  /players:
    get:
      operationId: listPlayers
      tags: [players]
      summary: List all players (admin)
      responses:
        "200":
          description: List of players
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Player"
    post:
      operationId: createPlayer
      tags: [players]
      summary: Create a player (admin)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePlayerRequest"
      responses:
        "201":
          description: Player created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Player"

  /players/{riotId}:
    get:
      operationId: getPlayer
      tags: [players]
      summary: Get player profile by Riot ID (public)
      parameters:
        - name: riotId
          in: path
          required: true
          schema:
            type: string
      responses:
        "200":
          description: Player profile with stats and recent activity
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/PlayerProfile"
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  /players/{id}/edit:
    put:
      operationId: updatePlayer
      tags: [players]
      summary: Update player (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreatePlayerRequest"
      responses:
        "200":
          description: Player updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Player"

  /players/{id}/delete:
    delete:
      operationId: deletePlayer
      tags: [players]
      summary: Delete player (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Deleted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"

  /seasons:
    get:
      operationId: listSeasons
      tags: [seasons]
      summary: List all seasons
      responses:
        "200":
          description: List of seasons
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Season"
    post:
      operationId: createSeason
      tags: [seasons]
      summary: Create a season (admin)
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateSeasonRequest"
      responses:
        "201":
          description: Season created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Season"

  /seasons/{id}:
    put:
      operationId: updateSeason
      tags: [seasons]
      summary: Update season (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateSeasonRequest"
      responses:
        "200":
          description: Season updated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Season"
    delete:
      operationId: deleteSeason
      tags: [seasons]
      summary: Delete season (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Deleted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"

  /seasons/{id}/activate:
    post:
      operationId: activateSeason
      tags: [seasons]
      summary: Set season as active (deactivates all others) (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Season activated
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Season"

  /seasons/{id}/complete:
    post:
      operationId: completeSeason
      tags: [seasons]
      summary: Complete season and apply ELO soft reset to all players (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Season completed
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"

  /ladder:
    get:
      operationId: getLadder
      tags: [ladder]
      summary: Get public ELO ladder for current active season
      responses:
        "200":
          description: Ladder rankings
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/LadderResponse"

  /vods/{id}:
    get:
      operationId: getVod
      tags: [vods]
      summary: Get a single VOD with timestamps and related VODs
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: VOD detail
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/VodDetail"
        "404":
          description: Not found
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorResponse"

  /vods/{id}/timestamps:
    get:
      operationId: listVodTimestamps
      tags: [vodTimestamps]
      summary: Get all timestamps for a VOD
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: List of timestamps
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/VodTimestamp"
    post:
      operationId: createVodTimestamp
      tags: [vodTimestamps]
      summary: Add a timestamp to a VOD (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateVodTimestampRequest"
      responses:
        "201":
          description: Timestamp created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/VodTimestamp"

  /vods/timestamps/{id}:
    delete:
      operationId: deleteVodTimestamp
      tags: [vodTimestamps]
      summary: Delete a VOD timestamp (admin)
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: integer
      responses:
        "200":
          description: Deleted
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/SuccessResponse"
```

### New component schemas (add to `components.schemas` section):

```yaml
    Player:
      type: object
      properties:
        id:
          type: integer
        riotId:
          type: string
        discordUsername:
          type: string
        currentElo:
          type: integer
        peakElo:
          type: integer
        wins:
          type: integer
        losses:
          type: integer
        isActive:
          type: boolean
        createdAt:
          type: string
        updatedAt:
          type: string
      required: [id, riotId, discordUsername, currentElo, peakElo, wins, losses, isActive, createdAt, updatedAt]

    PlayerProfile:
      type: object
      properties:
        id:
          type: integer
        riotId:
          type: string
        discordUsername:
          type: string
        currentElo:
          type: integer
        peakElo:
          type: integer
        wins:
          type: integer
        losses:
          type: integer
        isActive:
          type: boolean
        createdAt:
          type: string
        recentMatches:
          type: array
          items:
            $ref: "#/components/schemas/Match"
        vods:
          type: array
          items:
            $ref: "#/components/schemas/VodEntry"
      required: [id, riotId, discordUsername, currentElo, peakElo, wins, losses, isActive, createdAt, recentMatches, vods]

    CreatePlayerRequest:
      type: object
      properties:
        riotId:
          type: string
        discordUsername:
          type: string
        currentElo:
          type: integer
          nullable: true
        isActive:
          type: boolean
          nullable: true
      required: [riotId, discordUsername]

    Season:
      type: object
      properties:
        id:
          type: integer
        name:
          type: string
        status:
          type: string
        startDate:
          type: string
        endDate:
          type: string
        eloResetFactor:
          type: string
        createdAt:
          type: string
        updatedAt:
          type: string
      required: [id, name, status, startDate, endDate, eloResetFactor, createdAt, updatedAt]

    CreateSeasonRequest:
      type: object
      properties:
        name:
          type: string
        status:
          type: string
          nullable: true
        startDate:
          type: string
        endDate:
          type: string
        eloResetFactor:
          type: string
          nullable: true
      required: [name, startDate, endDate]

    LadderEntry:
      type: object
      properties:
        rank:
          type: integer
        playerId:
          type: integer
        riotId:
          type: string
        currentElo:
          type: integer
        peakElo:
          type: integer
        wins:
          type: integer
        losses:
          type: integer
        winRate:
          type: number
      required: [rank, playerId, riotId, currentElo, peakElo, wins, losses, winRate]

    LadderResponse:
      type: object
      properties:
        season:
          $ref: "#/components/schemas/Season"
          nullable: true
        entries:
          type: array
          items:
            $ref: "#/components/schemas/LadderEntry"
      required: [entries]

    VodTimestamp:
      type: object
      properties:
        id:
          type: integer
        vodId:
          type: integer
        label:
          type: string
        seconds:
          type: integer
        type:
          type: string
        createdAt:
          type: string
      required: [id, vodId, label, seconds, type, createdAt]

    CreateVodTimestampRequest:
      type: object
      properties:
        label:
          type: string
        seconds:
          type: integer
        type:
          type: string
          nullable: true
      required: [label, seconds]

    VodDetail:
      type: object
      properties:
        id:
          type: integer
        eventId:
          type: integer
          nullable: true
        eventTitle:
          type: string
          nullable: true
        title:
          type: string
        format:
          type: string
          nullable: true
        playerNames:
          type: string
          nullable: true
        roleTag:
          type: string
          nullable: true
        notes:
          type: string
          nullable: true
        videoUrl:
          type: string
        champion:
          type: string
          nullable: true
        opponentChampion:
          type: string
          nullable: true
        position:
          type: string
          nullable: true
        patch:
          type: string
          nullable: true
        playerEloAtTime:
          type: integer
          nullable: true
        playerId:
          type: integer
          nullable: true
        playerRiotId:
          type: string
          nullable: true
        createdAt:
          type: string
        updatedAt:
          type: string
        timestamps:
          type: array
          items:
            $ref: "#/components/schemas/VodTimestamp"
        relatedVods:
          type: array
          items:
            $ref: "#/components/schemas/VodEntry"
      required: [id, title, videoUrl, createdAt, updatedAt, timestamps, relatedVods]
```

### Update existing `VodEntry` schema — add new nullable fields:

```yaml
    VodEntry:
      # ... keep all existing fields, ADD these:
        champion:
          type: string
          nullable: true
        opponentChampion:
          type: string
          nullable: true
        position:
          type: string
          nullable: true
        patch:
          type: string
          nullable: true
        playerEloAtTime:
          type: integer
          nullable: true
        playerId:
          type: integer
          nullable: true
        playerRiotId:
          type: string
          nullable: true
```

### Update existing `CreateVodRequest` schema — add new nullable fields:

```yaml
    CreateVodRequest:
      # ... keep all existing fields, ADD these:
        champion:
          type: string
          nullable: true
        opponentChampion:
          type: string
          nullable: true
        position:
          type: string
          nullable: true
        patch:
          type: string
          nullable: true
        playerEloAtTime:
          type: integer
          nullable: true
        playerId:
          type: integer
          nullable: true
```

### Update existing `Match` schema — add new nullable fields:

```yaml
    Match:
      # ... keep all existing fields, ADD these:
        playerAId:
          type: integer
          nullable: true
        playerBId:
          type: integer
          nullable: true
        playerAEloBefore:
          type: integer
          nullable: true
        playerAEloAfter:
          type: integer
          nullable: true
        playerBEloBefore:
          type: integer
          nullable: true
        playerBEloAfter:
          type: integer
          nullable: true
        seasonId:
          type: integer
          nullable: true
        isPlayoff:
          type: boolean
```

### Update existing `CreateMatchRequest` schema — add new nullable fields:

```yaml
    CreateMatchRequest:
      # ... keep all existing fields, ADD these:
        playerAId:
          type: integer
          nullable: true
        playerBId:
          type: integer
          nullable: true
        seasonId:
          type: integer
          nullable: true
        isPlayoff:
          type: boolean
          nullable: true
```

### Update existing `ListVodsParams` schema — add new filter params:

```yaml
    ListVodsParams:
      # ... keep eventId, format, roleTag, search, ADD these:
        champion:
          type: string
          nullable: true
        opponentChampion:
          type: string
          nullable: true
        position:
          type: string
          nullable: true
        patch:
          type: string
          nullable: true
        eloMin:
          type: integer
          nullable: true
        eloMax:
          type: integer
          nullable: true
```

Also update the `/vods` GET path query parameters to include the new filter fields.

### Update `AdminStats` schema:

```yaml
    AdminStats:
      # ... keep all existing fields, ADD:
        players:
          type: integer
        seasons:
          type: integer
      required: [...existing..., players, seasons]
```

---

## PART 4: Run Code Generation

After updating the OpenAPI spec, run the orval codegen command to regenerate `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/`. Check `lib/api-spec/package.json` or root `package.json` for the correct script name.

---

## PART 5: Backend Route Files

### New file: `artifacts/api-server/src/routes/players.ts`

Implement a players router with these endpoints following the exact same pattern as existing route files:

- `GET /` — list all players ordered by currentElo desc (requireAdmin)
- `POST /` — create player (requireAdmin), validate riotId and discordUsername required, reject duplicate riotId with 409
- `GET /:riotId` — public: fetch player by riotId, include recent 10 matches (join with matches table, where playerAId or playerBId = player.id), include all VODs linked to this player, return PlayerProfile shape
- `PUT /:id/edit` — update player (requireAdmin)
- `DELETE /:id/delete` — delete player (requireAdmin)

Use a `formatPlayer()` helper at the top of the file. All DB queries use Drizzle, no raw SQL.

### New file: `artifacts/api-server/src/routes/seasons.ts`

Implement a seasons router:

- `GET /` — list all seasons ordered by startDate desc (public)
- `POST /` — create season (requireAdmin), validate name, startDate, endDate required
- `PUT /:id` — update season (requireAdmin)
- `DELETE /:id` — delete season (requireAdmin), reject if status is 'active'
- `POST /:id/activate` — (requireAdmin) set this season to 'active', set all others to 'upcoming' or 'completed' based on their current status. Do NOT change 'completed' seasons.
- `POST /:id/complete` — (requireAdmin) set season status to 'completed', then for every active player apply softResetElo() from `../lib/elo` and update their currentElo. Import softResetElo from `../lib/elo`.

Use a `formatSeason()` helper. Use Drizzle transactions for the complete endpoint.

### New file: `artifacts/api-server/src/routes/ladder.ts`

Implement a single GET handler:

- `GET /` — find the active season (status = 'active'), query all players with wins + losses >= LADDER_MIN_MATCHES (from `../lib/elo`), order by currentElo desc, add a `rank` field (1-indexed), calculate winRate = wins / (wins + losses), return LadderResponse shape with season and entries array.

If no active season exists, return `{ season: null, entries: [] }` with 200.

### New file: `artifacts/api-server/src/routes/vodTimestamps.ts`

Implement:

- `GET /vods/:id/timestamps` — list all timestamps for a VOD ordered by seconds asc (public)
- `POST /vods/:id/timestamps` — create timestamp (requireAdmin), validate label and seconds required
- `DELETE /timestamps/:id` — delete a timestamp (requireAdmin)

Note: These routes will be mounted differently — see routes/index.ts update.

### Update: `artifacts/api-server/src/routes/vods.ts`

- Update the `GET /` handler to support the new filter params: `champion`, `opponentChampion`, `position`, `patch`, `eloMin`, `eloMax`. Filter in-memory the same way existing filters work.
- Update the `formatVod` function to include the new fields: champion, opponentChampion, position, patch, playerEloAtTime, playerId, and playerRiotId (join with players table using leftJoin when fetching).
- Update `POST /` and `PUT /:id` to accept and save the new fields.
- Add `GET /:id` endpoint: fetch single VOD with its timestamps (join vodTimestampsTable) and relatedVods (call getRelatedVods from `../lib/vodRecommendations`). Return VodDetail shape.

### Update: `artifacts/api-server/src/routes/matches.ts`

- Update `POST /` to:
  1. Accept playerAId, playerBId, seasonId, isPlayoff from request body
  2. If both playerAId and playerBId are provided AND winnerName is provided:
     - Fetch both players from DB
     - Determine winner/loser
     - Call calculateElo() from `../lib/elo` for both players
     - Store elo before/after values
     - Update both players' currentElo, peakElo (if new > peak), wins/losses
     - All of this in a Drizzle transaction
  3. If playerAId/playerBId not provided, skip ELO calculation (backwards compatible)
- Update `formatMatch` function to include the new ELO and season fields
- Update `PUT /:id` similarly

### Update: `artifacts/api-server/src/routes/admin.ts`

Update the `/stats` endpoint to also count from `playersTable` and `seasonsTable` and include in response.

### Update: `artifacts/api-server/src/routes/index.ts`

Register new routers:

```typescript
import playersRouter from "./players";
import seasonsRouter from "./seasons";
import ladderRouter from "./ladder";
import vodTimestampsRouter from "./vodTimestamps";

// Add these:
router.use("/players", playersRouter);
router.use("/seasons", seasonsRouter);
router.use("/ladder", ladderRouter);
// vod timestamps use two mount points:
router.use("/vods", vodTimestampsRouter);
```

---

## PART 6: Frontend — New Public Pages

### New file: `artifacts/vclol/src/pages/public/Ladder.tsx`

Build a public ladder page at route `/ladder`.

**Layout:**
- Page header: "ELO Ladder", current season name badge (if active season exists), season dates
- If no active season: show a clear "No active season" empty state
- Table with columns: Rank | Player | ELO | Peak ELO | W | L | Win Rate
- Each row: rank number, riotId as link to `/players/${encodeURIComponent(riotId)}`, ELO shown prominently, wins/losses/winrate
- Top 3 players get a visual distinction (gold/silver/bronze badge on rank number)
- Below the table, show a small note: "Minimum 4 matches required to appear on ladder"
- Use `useGetLadder` hook from generated client

### New file: `artifacts/vclol/src/pages/public/PlayerProfile.tsx`

Build a public player profile page at route `/players/:riotId`.

**Layout:**
- Use `useGetPlayer` hook with the riotId from URL params (use `useParams` from wouter, URL-decode the riotId)
- Player header card: riotId, discord, current ELO, peak ELO, W/L record, win rate
- Two-column section: Recent Matches (last 10, same card style as Results page) | Champion VODs (all VODs linked to this player)
- If the player has VODs with champion data, show a "Champion Pool" section: group by champion, show champion name + count
- If no data yet, show appropriate empty states
- Show a "← Back to Ladder" link

### New file: `artifacts/vclol/src/pages/public/VodDetail.tsx`

Build a VOD detail page at route `/vods/:id`.

**Layout:**
- Use `useGetVod` hook with the id from URL params
- Top section: VOD title, champion vs opponent champion (if available), player name link, ELO at time, patch, event
- Video section: large "Watch VOD" button that opens videoUrl in new tab (no iframe embedding — external links only)
- Timestamps section (if timestamps exist): sorted list of timestamps ordered by seconds asc, showing `label` and formatted time (MM:SS). Each timestamp is a clickable link (`<a target="_blank">`) that opens YouTube at the exact position by appending `&t=${seconds}` to the videoUrl (if videoUrl already contains `?` use `&t=`, otherwise use `?t=`). Local utility: `formatSeconds(s: number): string` converts e.g. 90 → "1:30". This uses YouTube native timestamp deep-link — no extra infrastructure needed.
- Related VODs section (if relatedVods exist): show up to 4 VOD cards linking to their respective `/vods/:id` pages, same card style as VOD archive
- If champion + opponentChampion exist, show a "Matchup" header: "Champion vs OpponentChampion"

---

## PART 7: Frontend — Updated Public Pages

### Update: `artifacts/vclol/src/pages/public/Vods.tsx`

Add new filter controls for champion, opponent champion, position, patch, and ELO range. Follow the exact same pattern as the existing event filter select. Pass the new params to `useListVods`. Each filter is a separate `useState`. Add a "Clear filters" button that resets all filters to undefined.

Update the VOD cards: if champion data exists, show champion name prominently. Add a "View Details →" link on each card that goes to `/vods/${vod.id}`.

### Update: `artifacts/vclol/src/components/layout/PublicLayout.tsx`

Add "Ladder" to the navLinks array between "Events" and "Results":
```typescript
{ href: "/ladder", label: "Ladder" },
```

---

## PART 8: Frontend — New Admin Pages

### New file: `artifacts/vclol/src/pages/admin/ManagePlayers.tsx`

Follow the exact same pattern as `ManageMatches.tsx`:
- Table with columns: Riot ID | Discord | ELO | W/L | Active | Actions
- Add/Edit dialog with fields: riotId, discordUsername, currentElo (number), isActive (checkbox)
- Delete with confirm
- Use generated hooks: useListPlayers, useCreatePlayer, useUpdatePlayer, useDeletePlayer

### New file: `artifacts/vclol/src/pages/admin/ManageSeasons.tsx`

Follow same pattern:
- Table with columns: Name | Status | Start | End | Reset Factor | Actions
- Status shown as a Badge (upcoming = secondary, active = default/green, completed = outline)
- Add/Edit dialog with fields: name, startDate (date input), endDate (date input), eloResetFactor (number input, default 0.5), status dropdown
- Action buttons per row: "Activate" (calls useActivateSeason, disabled if already active), "Complete" (calls useCompleteSeason, only shown if status = 'active', shows confirmation dialog warning that this will reset ELO for all players)
- Delete disabled for active seasons
- Use generated hooks

---

## PART 9: Frontend — Updated Admin Pages

### Update: `artifacts/vclol/src/pages/admin/ManageMatches.tsx`

Add to the Add/Edit form:
- Player A dropdown: fetches from useListPlayers, shows riotId options, value is player.id
- Player B dropdown: same
- Season dropdown: fetches from useListSeasons, shows season name options
- Is Playoff checkbox
- When both playerA and playerB are selected, display their current ELO (read-only) so admin can see before saving

No need to show calculated ELO in the form — the backend calculates on save.

### Update: `artifacts/vclol/src/pages/admin/ManageVods.tsx`

Add to the Add/Edit form:
- Champion text input
- Opponent Champion text input
- Position select: Mid / Top / Jungle / Bot / Support (nullable)
- Patch text input (e.g. "14.8")
- Player dropdown: fetches from useListPlayers, nullable
- ELO at time number input (nullable)

Add a Timestamps sub-section below the main form when editing an existing VOD (editingId is not null):
- Shows current timestamps in a small list
- Add timestamp form: label text input, seconds number input, type select (manual/kill/death/tower/first_blood)
- Delete button per timestamp
- Use useListVodTimestamps, useCreateVodTimestamp, useDeleteVodTimestamp hooks

---

## PART 10: App Router Update

### Update: `artifacts/vclol/src/App.tsx`

Add imports and routes for all new pages:

```typescript
import Ladder from "@/pages/public/Ladder";
import PlayerProfile from "@/pages/public/PlayerProfile";
import VodDetail from "@/pages/public/VodDetail";
import ManagePlayers from "@/pages/admin/ManagePlayers";
import ManageSeasons from "@/pages/admin/ManageSeasons";

// Add routes:
<Route path="/ladder" component={Ladder} />
<Route path="/players/:riotId" component={PlayerProfile} />
<Route path="/vods/:id" component={VodDetail} />
<Route path="/admin/players" component={ManagePlayers} />
<Route path="/admin/seasons" component={ManageSeasons} />
```

### Update: `artifacts/vclol/src/components/layout/AdminLayout.tsx`

Add new nav items to the navItems array:
```typescript
{ href: "/admin/players", label: "Players", icon: UserCheck },
{ href: "/admin/seasons", label: "Seasons", icon: Trophy },
```

Import `UserCheck` and `Trophy` from lucide-react.

---

## PART 11: Discord Link

In `artifacts/vclol/src/pages/public/Home.tsx`, replace the hardcoded `https://discord.gg/placeholder` with `import.meta.env.VITE_DISCORD_URL ?? "#"`. This makes the URL configurable via environment variable without changing code.

---

## PART 12: Drizzle Migration

After all schema changes, run the Drizzle migration command to generate and apply the migration. Check `lib/db/package.json` for the correct script. The migration must be applied before the server starts.

---

## FINAL VERIFICATION CHECKLIST

Before finishing, verify every item below:

**Database:**
- [ ] `players` table exists with all specified columns
- [ ] `seasons` table exists with all specified columns
- [ ] `vod_timestamps` table exists with cascade delete on vodId
- [ ] `matches` table has all 8 new ELO + season columns
- [ ] `vod_entries` table has all 7 new metadata columns
- [ ] All foreign keys are correct

**Backend:**
- [ ] `GET /api/ladder` returns correct shape with entries sorted by ELO desc
- [ ] `POST /api/matches` with playerAId + playerBId correctly updates both player ELOs in a transaction
- [ ] `POST /api/seasons/:id/complete` applies softResetElo to all players
- [ ] `GET /api/vods/:id` returns timestamps and relatedVods
- [ ] `GET /api/vods` accepts all 6 new filter params
- [ ] `GET /api/players/:riotId` returns PlayerProfile with recentMatches and vods
- [ ] All new admin routes protected with requireAdmin

**Frontend:**
- [ ] `/ladder` page renders, shows empty state when no active season
- [ ] `/players/:riotId` page renders player stats, matches, VODs
- [ ] `/vods/:id` page renders timestamps list, related VODs
- [ ] `/vods` page has champion/opponent/position/patch/ELO range filters
- [ ] Nav includes "Ladder" link between Events and Results
- [ ] Admin nav includes Players and Seasons
- [ ] ManageMatches form has player dropdowns and season dropdown
- [ ] ManageVods form has champion/position/patch/player fields + timestamps sub-section
- [ ] ManagePlayers page works (CRUD)
- [ ] ManageSeasons page works with Activate and Complete actions

**Code Quality:**
- [ ] No `any` types introduced
- [ ] No duplicated type definitions (all from generated client)
- [ ] ELO logic is only in `artifacts/api-server/src/lib/elo.ts`, not duplicated in routes
- [ ] Recommendation logic is only in `artifacts/api-server/src/lib/vodRecommendations.ts`
- [ ] All new route files use formatX() helpers and requireAdmin middleware consistently
- [ ] No raw SQL — all queries use Drizzle ORM
- [ ] All new React pages have proper loading and error states
- [ ] New schema files are exported from `lib/db/src/schema/index.ts`
