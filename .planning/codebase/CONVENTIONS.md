# Coding Conventions

**Analysis Date:** 2026-03-26

## Naming Patterns

**Files:**
- Use kebab-case for all source files: `rofl-parser.ts`, `team-matcher.ts`, `claim-match.ts`
- Schema files use camelCase: `matchPlayers.ts`, `teamMembers.ts`, `adminActions.ts`
- Test files use `.test.ts` suffix co-located with source: `rofl-parser.test.ts`

**Functions:**
- Use camelCase for all functions: `checkBan()`, `recordMatch()`, `buildSideName()`, `formatDuration()`
- Prefix boolean-returning functions with `is`/`check`/`has`: `isAdminAuthenticated()`, `checkBan()`, `checkOffensiveContent()`
- Async functions use descriptive verbs: `recordMatch()`, `registerCommands()`, `writeHeartbeat()`

**Variables:**
- Use camelCase for all variables: `matchId`, `sideAName`, `blueWon`, `roflFilePath`
- Constants use UPPER_SNAKE_CASE: `MAX_FILE_SIZE`, `MAX_ACTIVE_TEAMS`, `SUBMIT_COOLDOWN_MS`
- Environment variables accessed via `process.env.UPPER_SNAKE_CASE`

**Types:**
- Use PascalCase for types and interfaces: `RecordMatchInput`, `PlayerDisplay`, `CommandModule`, `RoflMatch`
- Schema types derived from Drizzle inference: `typeof teamsTable.$inferSelect`, `typeof teamsTable.$inferInsert`
- Export type aliases using `type` keyword: `export type Team = typeof teamsTable.$inferSelect`
- Zod-inferred types: `export type InsertTeam = z.infer<typeof insertTeamSchema>`

**Database Tables:**
- Table variables use camelCase + `Table` suffix: `teamsTable`, `matchPlayersTable`, `eloHistoryTable`
- SQL column names use snake_case: `captain_player_id`, `team_a_id`, `created_at`
- Table SQL names are plural lowercase: `teams`, `matches`, `match_players`

## Code Style

**Formatting:**
- Prettier v3.8.1 installed at workspace root (`package.json` devDependencies)
- No `.prettierrc` config file detected -- uses Prettier defaults (2-space indent, double quotes likely)
- Actual codebase uses double quotes for imports, 2-space indentation

**Linting:**
- No ESLint, Biome, or other linter configured
- TypeScript strict mode serves as primary code quality gate
- `tsconfig.base.json`: `strictNullChecks: true`, `noImplicitAny: true`, `noImplicitReturns: true`, `useUnknownInCatchVariables: true`
- `strictFunctionTypes: false` (relaxed for callback compatibility)
- `noUnusedLocals: false` (unused vars allowed)

**TypeScript Configuration:**
- Base config at `tsconfig.base.json` with `target: es2022`, `module: esnext`, `moduleResolution: bundler`
- Each package extends base: `"extends": "../../tsconfig.base.json"`
- Project references used for cross-package dependencies (`references` array in each `tsconfig.json`)
- `isolatedModules: true` for compatibility with bundlers

## Import Organization

**Order:**
1. Node.js built-ins: `import { join, dirname } from "path"`
2. External packages: `import { Router } from "express"`, `import { SlashCommandBuilder } from "discord.js"`
3. Workspace packages: `import { db } from "@workspace/db"`, `import { HealthCheckResponse } from "@workspace/api-zod"`
4. Relative imports: `import { replyError } from "../lib/replyError.js"`

**Path Aliases:**
- `@workspace/db` -- shared database client + schema (used by bot and API server)
- `@workspace/api-zod` -- generated Zod schemas from OpenAPI (used by API server)
- `@workspace/api-client-react` -- generated React Query hooks (used by frontend)
- `@workspace/rofl-parse` -- shared ROFL parser + ELO calculator (used by bot and API server)

**Extension Rules:**
- Always use `.js` extension in relative imports (ESM requirement): `import { db } from "./lib/db.js"`
- Workspace imports use bare specifiers: `import { db } from "@workspace/db"`

## Error Handling

**API Server Pattern:**
- Try/catch wrapping each route handler
- Return JSON error objects: `res.status(400).json({ error: "message" })`
- Status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)
- PostgreSQL unique constraint violation `code === "23505"` caught for duplicate handling
- Console.error with topic prefix for unexpected errors: `console.error("[teams]", err)`

```typescript
// Standard API error handling pattern (from artifacts/api-server/src/routes/teams.ts)
try {
  // ... business logic ...
} catch (err: any) {
  if (err?.code === "23505") {
    res.status(409).json({ error: "A team with this name already exists" });
    return;
  }
  res.status(500).json({ error: "Failed to create team" });
}
```

**Discord Bot Pattern:**
- Commands defer reply, then use `replyError()` helper for ephemeral error display
- `replyError()` at `artifacts/discord-bot/src/lib/replyError.ts` deletes deferred reply + sends ephemeral followUp
- Global interaction error handler in `artifacts/discord-bot/src/index.ts` catches unhandled throws
- Empty `catch {}` blocks used for non-critical Discord API failures (expired interactions)

```typescript
// Standard bot command error pattern (from artifacts/discord-bot/src/commands/register-team.ts)
await interaction.deferReply({ ephemeral: false });
const banReason = await checkBan(interaction.user.id);
if (banReason) {
  await replyError(interaction, `message`);
  return;
}
```

**Catch Variable Typing:**
- `catch (err: unknown)` preferred (enforced by `useUnknownInCatchVariables`)
- Some legacy `catch (err: any)` exists in API routes for `.code` access on PG errors

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- Use bracketed topic prefix: `[bot]`, `[teams]`, `[register-team]`, `[audit]`, `[static]`
- `console.log()` for informational: `console.log("[bot] Logged in as ...")`
- `console.error()` for failures: `console.error("[teams]", err)`
- `console.warn()` for non-fatal issues: `console.warn("[register-team] Blocked offensive name...")`

## Comments

**When to Comment:**
- JSDoc-style block comments at the top of every file describing purpose: `/** * /submit - Core match recording command. */`
- Inline section headers using `// ── Section Name ──────` Unicode box-drawing dividers
- Reference doc specs: `// Spec: docs/BOT_SPEC.md -> /submit`
- Reference issue numbers: `// Rate limiting (Issue #28)`, `// (#128 SQL-level pagination)`

**JSDoc/TSDoc:**
- Used on exported functions in library modules with `@param` / `@returns`
- Not used on route handlers or command handlers (file-level comment suffices)
- Example from `artifacts/discord-bot/src/lib/checkBan.ts`:

```typescript
/**
 * Check if a Discord user has an active ban.
 * @returns Ban reason string if banned, null otherwise.
 */
export async function checkBan(discordId: string): Promise<string | null> {
```

## Function Design

**Size:**
- Commands decomposed into focused modules: `submit.ts` orchestrates, `matchRecorder.ts` handles DB, `submitHelpers.ts` handles display, `unknownPlayerHandler.ts` handles interactive flows
- Route files can be large (300-500 lines) with multiple endpoints per resource

**Parameters:**
- Use typed option objects for complex inputs: `RecordMatchInput`, `PlayerDisplay`
- Destructure at function body start: `const { match, sideA, sideB, ... } = input`
- Use `as` type assertions for `req.body` in Express routes (no runtime validation middleware)

```typescript
// Express body typing pattern (from artifacts/api-server/src/routes/teams.ts)
const { name, tag, captainPlayerId } = req.body as {
  name?: string;
  tag?: string;
  captainPlayerId?: number;
};
```

**Return Values:**
- Functions return concrete types, not `any`
- Async functions return `Promise<T>` explicitly
- Express route handlers return `void` (call `res.json()` / `res.status()`)
- Bot commands return `Promise<void>` (call `interaction.editReply()` / `replyError()`)

## Module Design

**Exports:**
- Named exports preferred for functions and types: `export async function recordMatch()`
- Default exports used for Express routers: `export default router`
- Bot commands use named exports `data` + `execute` following discord.js pattern
- Re-export pattern used in library index files: `export * from "./teams"` (barrel files)

**Barrel Files:**
- `lib/db/src/schema/index.ts` -- re-exports all schema tables and types
- `lib/db/src/index.ts` -- exports `db` client + all schema
- `lib/rofl-parse/src/index.ts` -- exports parser, matcher, ELO functions
- `artifacts/api-server/src/routes/index.ts` -- mounts all route modules on Express router

**Database Access:**
- Bot accesses DB directly via `@workspace/db` (not HTTP API) for performance
- API server also imports `@workspace/db` directly
- Bot re-exports through `artifacts/discord-bot/src/lib/db.ts` for convenience
- Drizzle query builder used throughout (no raw SQL)

## Schema Definition Pattern

Use this pattern for all new Drizzle schema files:

```typescript
// From lib/db/src/schema/teams.ts
import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teamsTable = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  // ... columns ...
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teamsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teamsTable.$inferSelect;
```

## API Route Pattern

Use this pattern for all new Express route files:

```typescript
// From artifacts/api-server/src/routes/teams.ts
import { Router } from "express";
import { db } from "@workspace/db";
import { teamsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/requireAdmin";
import { logAdminAction } from "../lib/auditLog";

const router = Router();

// Formatter function to shape DB rows for API response
function formatTeam(t: typeof teamsTable.$inferSelect) {
  return { id: t.id, name: t.name, /* ... */ createdAt: t.createdAt.toISOString() };
}

// GET /teams
router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(teamsTable);
    res.json(rows.map(formatTeam));
  } catch (err) {
    console.error("[teams]", err);
    res.status(500).json({ error: "Failed to fetch teams" });
  }
});

export default router;
```

## Bot Command Pattern

Use this pattern for all new Discord bot commands:

```typescript
// From artifacts/discord-bot/src/commands/register-team.ts
import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { db } from "../lib/db.js";
import { replyError } from "../lib/replyError.js";
import { teamsTable } from "@workspace/db";
import { checkBan } from "../lib/checkBan.js";

export const data = new SlashCommandBuilder()
  .setName("command-name")
  .setDescription("Description")
  .addStringOption((o) => o.setName("param").setDescription("desc").setRequired(true));

export async function execute(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: false });

  // 1. Ban check
  const banReason = await checkBan(interaction.user.id);
  if (banReason) { await replyError(interaction, `msg`); return; }

  // 2. Guild-only guard
  if (!interaction.inGuild()) { await replyError(interaction, "msg"); return; }

  // 3. Business logic + DB operations
  // 4. Reply with EmbedBuilder
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle("result");
  await interaction.editReply({ embeds: [embed] });
}
```

---

*Convention analysis: 2026-03-26*
