# Codebase Structure

**Analysis Date:** 2026-03-26

## Directory Layout

```
lolproject/
├── artifacts/
│   ├── api-server/          # Express REST API (Claude owns)
│   ├── discord-bot/         # Discord slash command bot (Claude owns)
│   ├── vclol/               # React SPA frontend (Replit owns)
│   └── mockup-sandbox/      # UI prototyping sandbox (Replit)
├── lib/
│   ├── db/                  # Drizzle ORM schema + DB client (@workspace/db)
│   ├── api-spec/            # OpenAPI 3.1 spec + Orval codegen config
│   ├── api-client-react/    # Generated React Query hooks (never edit)
│   ├── api-zod/             # Generated Zod validators (never edit)
│   └── rofl-parse/          # .rofl replay parser + team matcher (@workspace/rofl-parse)
├── scripts/
│   └── src/                 # Utility scripts (seed.ts, hello.ts)
├── docs/                    # Project documentation (PRD, BOT_SPEC, SCHEMA_CONTRACT, etc.)
├── attached_assets/         # Static assets referenced in docs
├── .planning/               # Planning documents (this directory)
├── CLAUDE.md                # Session reference for Claude
├── package.json             # Root workspace config
└── pnpm-workspace.yaml      # pnpm workspace definition
```

## Directory Purposes

**`artifacts/api-server/`:**
- Purpose: Express 5 REST API server
- Contains: Routes, middlewares, lib helpers, schedulers
- Key files:
  - `src/index.ts` — Entry point (migrations + server start + scheduler boot)
  - `src/app.ts` — Express app config (CORS, session, rate limiting, static serving)
  - `src/routes/index.ts` — Route mounting (22 route modules under `/api/`)
  - `src/routes/auth.ts` — Discord OAuth + RSO OAuth flows
  - `src/routes/matches.ts` — Match CRUD with visibility logic
  - `src/routes/submitRofl.ts` — Fallback .rofl upload for >8MB files
  - `src/routes/admin.ts` — Admin login/logout
  - `src/middlewares/requireAdmin.ts` — Admin auth guard
  - `src/lib/session.ts` — Session type augmentation + `isAdminAuthenticated()`
  - `src/lib/auth.ts` — Password hashing (scrypt)
  - `src/lib/elo.ts` — ELO calculation + soft reset + ladder constants
  - `src/lib/badges.ts` — Badge award logic
  - `src/lib/notifications.ts` — `notifyPlayer()` + email via Resend
  - `src/lib/auditLog.ts` — Admin action audit trail
  - `src/lib/ogMiddleware.ts` — OG tag injection for social previews
  - `src/lib/runStartupMigrations.ts` — Idempotent ALTER TABLE migrations
  - `src/lib/vodRecommendations.ts` — VOD recommendation logic
  - `src/schedulers/teamInactivity.ts` — 6-hour team inactivity check
  - `src/schedulers/roflCleanup.ts` — Daily .rofl file cleanup

**`artifacts/discord-bot/`:**
- Purpose: Discord bot with slash commands for match recording and team management
- Contains: Command handlers, lib modules, image renderers, fonts
- Key files:
  - `src/index.ts` — Bot entry point (command registration, event handlers, background jobs)
  - `src/commands/submit.ts` — Core /submit command orchestrator
  - `src/commands/connect.ts` — RSO verification link generator
  - `src/commands/register-team.ts` — Team creation
  - `src/commands/visibility.ts` — Match/profile visibility control
  - `src/commands/roster.ts` — Team roster display
  - `src/commands/stats.ts` — Quick stats lookup
  - `src/commands/claim-match.ts` — Claim unregistered match side
  - `src/commands/transfer-captain.ts` — Captain transfer
  - `src/commands/leave.ts` — Leave team
  - `src/commands/remove.ts` — Captain removes member
  - `src/commands/register-event.ts` — Event registration
  - `src/lib/db.ts` — Re-exports `@workspace/db`
  - `src/lib/matchRecorder.ts` — DB transaction for match recording
  - `src/lib/rofl-parser.ts` — .rofl binary parser (bot-local copy)
  - `src/lib/team-matcher.ts` — Match PUUIDs to DB teams
  - `src/lib/submitHelpers.ts` — Match embed/display helpers
  - `src/lib/unknownPlayerHandler.ts` — Interactive buttons for unknown players
  - `src/lib/rosterInactivity.ts` — Post-match inactivity check
  - `src/lib/notificationPoller.ts` — 60s DM delivery loop
  - `src/lib/seasonBroadcaster.ts` — Daily season-end warnings
  - `src/lib/teamInactivityScheduler.ts` — Team auto-inactive (bot-side)
  - `src/lib/scoreboardRenderer.ts` — Match scoreboard PNG generator
  - `src/lib/playerCardRenderer.ts` — Player card PNG generator
  - `src/lib/leaderboardRenderer.ts` — Leaderboard PNG generator
  - `src/lib/teamCardRenderer.ts` — Team card PNG generator
  - `src/lib/iconCache.ts` — Champion/item icon caching
  - `src/lib/elo.ts` — ELO calculation (bot-local copy)
  - `src/lib/checkBan.ts` — Player ban check
  - `src/lib/contentFilter.ts` — Content moderation
  - `src/lib/replyError.ts` — Standardized error replies
  - `src/lib/inviteHandler.ts` — Discord invite button handling
  - `src/fonts/` — Font files for canvas rendering

**`artifacts/vclol/`:**
- Purpose: React SPA frontend (Replit owns, Claude should not edit)
- Contains: Pages, components, hooks, utility functions
- Key files:
  - `src/main.tsx` — React entry point
  - `src/App.tsx` — Router + layout
  - `src/pages/public/` — Public pages (Home, Matches, Teams, Players, Events, VODs, etc.)
  - `src/pages/admin/` — Admin dashboard pages
  - `src/components/` — Shared UI components (brackets, layout, ui)
  - `src/hooks/use-auth.ts` — Auth state hook
  - `src/hooks/use-toast.ts` — Toast notification hook
  - `src/lib/utils.ts` — Utility functions
  - `src/lib/lol-utils.ts` — LoL-specific utilities (champion names, item IDs)
  - `src/lib/tournament-formats.ts` — Tournament bracket format logic

**`lib/db/`:**
- Purpose: Shared database package — Drizzle schema definitions and connection pool
- Contains: Schema files (22 tables), DB client
- Key files:
  - `src/index.ts` — Creates `pg.Pool` + `drizzle()` client, re-exports all schema
  - `src/schema/index.ts` — Barrel export of all table definitions
  - `src/schema/teams.ts` — Teams table (name, tag, ELO, W/L, captainPlayerId)
  - `src/schema/players.ts` — Players table (riotId, discordId, puuid, RSO fields, privacy)
  - `src/schema/matches.ts` — Matches table (teams, score, type, visibility, bracket fields)
  - `src/schema/matchPlayers.ts` — Match player stats (10 per match: champion, KDA, items, etc.)
  - `src/schema/teamMembers.ts` — Team membership (role, status, lastActiveAt)
  - `src/schema/eloHistory.ts` — ELO change log per match
  - `src/schema/seasons.ts` — Season definitions (dates, ELO reset factor)
  - `src/schema/events.ts` — Event definitions
  - `src/schema/eventRegistrations.ts` — Event team registrations
  - `src/schema/notifications.ts` — Player notification queue
  - `src/schema/playerBadges.ts` — Earned badges
  - `src/schema/playerBans.ts` — Player ban records
  - `src/schema/vodEntries.ts` — VOD metadata
  - `src/schema/vodTimestamps.ts` — VOD timestamp bookmarks
  - `src/schema/adminUsers.ts` — Admin user accounts
  - `src/schema/adminActions.ts` — Admin audit trail
  - `src/schema/authSessions.ts` — Bot /connect one-time tokens
  - `src/schema/botHeartbeats.ts` — Bot health pings
  - `src/schema/ladderSettings.ts` — Ladder configuration
  - `src/schema/seasonChampions.ts` — Season champion records
  - `src/schema/replaySubmissions.ts` — Replay submission tracking
  - `drizzle/migrations/` — Generated migration SQL files
  - `drizzle.config.ts` — Drizzle Kit configuration

**`lib/api-spec/`:**
- Purpose: OpenAPI specification and codegen config
- Contains: API contract, Orval configuration
- Key files:
  - `openapi.yaml` — OpenAPI 3.1 spec (all REST endpoints)
  - `orval.config.ts` — Generates `api-client-react` (React Query hooks) and `api-zod` (Zod validators)

**`lib/api-client-react/`:**
- Purpose: Auto-generated React Query hooks from OpenAPI spec
- Contains: Generated TypeScript files (DO NOT EDIT)
- Key files:
  - `src/generated/api.ts` — React Query hooks for every endpoint
  - `src/generated/api.schemas.ts` — TypeScript types from OpenAPI schemas
  - `src/custom-fetch.ts` — Custom fetch wrapper used by generated hooks

**`lib/api-zod/`:**
- Purpose: Auto-generated Zod validation schemas from OpenAPI spec
- Contains: Generated TypeScript files (DO NOT EDIT)
- Key files:
  - `src/generated/api.ts` — Zod validators for request/response
  - `src/generated/types/` — TypeScript type definitions

**`lib/rofl-parse/`:**
- Purpose: Shared .rofl replay file parser and team matching logic
- Contains: Parser, team matcher, ELO calculator, helpers
- Key files:
  - `src/index.ts` — Package entry point (re-exports)
  - `src/rofl-parser.ts` — Binary .rofl file parser
  - `src/team-matcher.ts` — Match PUUIDs to database teams
  - `src/elo.ts` — ELO rating calculation
  - `src/helpers.ts` — Display name helpers

**`scripts/`:**
- Purpose: Dev/admin utility scripts
- Contains: Seed data, test scripts
- Key files:
  - `src/seed.ts` — Database seed script

**`docs/`:**
- Purpose: Project documentation
- Key files:
  - `docs/PRD_v3.md` — Product Requirements Document
  - `docs/BOT_SPEC.md` — Discord bot specification
  - `docs/SCHEMA_CONTRACT.md` — Database schema contract
  - `docs/USER_JOURNEYS.md` — User journey flows
  - `docs/DEPLOYMENT.md` — Deployment guide

## Key File Locations

**Entry Points:**
- `artifacts/api-server/src/index.ts`: API server startup
- `artifacts/discord-bot/src/index.ts`: Bot startup
- `artifacts/vclol/src/main.tsx`: Frontend entry

**Configuration:**
- `package.json`: Root workspace scripts
- `pnpm-workspace.yaml`: Workspace package definitions + catalog versions
- `lib/api-spec/orval.config.ts`: API codegen config
- `lib/db/drizzle.config.ts`: Drizzle migration config
- `artifacts/api-server/src/app.ts`: Express middleware config (CORS, session, rate limits)

**Core Logic:**
- `artifacts/discord-bot/src/commands/submit.ts`: Match submission orchestrator
- `artifacts/discord-bot/src/lib/matchRecorder.ts`: Match DB transaction
- `lib/rofl-parse/src/rofl-parser.ts`: .rofl binary parser
- `lib/rofl-parse/src/team-matcher.ts`: PUUID-to-team matching
- `artifacts/api-server/src/routes/auth.ts`: OAuth flows (Discord + RSO)
- `artifacts/api-server/src/routes/matches.ts`: Match visibility + CRUD

**Testing:**
- `artifacts/discord-bot/src/lib/rofl-parser.test.ts`: ROFL parser test

## Naming Conventions

**Files:**
- Schema files: `camelCase.ts` matching table name (e.g., `matchPlayers.ts`)
- Route files: `camelCase.ts` matching resource (e.g., `submitRofl.ts`, `eloHistory.ts`)
- Bot commands: `kebab-case.ts` matching slash command name (e.g., `register-team.ts`, `claim-match.ts`)
- Lib files: `camelCase.ts` (e.g., `matchRecorder.ts`, `scoreboardRenderer.ts`)
- Renderers: `*Renderer.ts` suffix (e.g., `scoreboardRenderer.ts`, `playerCardRenderer.ts`)

**Directories:**
- Packages: `kebab-case` (e.g., `api-server`, `api-client-react`, `rofl-parse`)
- Source subdirs: lowercase (e.g., `commands`, `lib`, `routes`, `middlewares`, `schedulers`)

## Where to Add New Code

**New API Route:**
1. Add path + schemas to `lib/api-spec/openapi.yaml`
2. Run `cd lib/api-spec && pnpm run codegen` to regenerate clients
3. Create route handler at `artifacts/api-server/src/routes/<name>.ts`
4. Mount in `artifacts/api-server/src/routes/index.ts`
5. If admin-only, apply `requireAdmin` middleware

**New Bot Command:**
1. Create command file at `artifacts/discord-bot/src/commands/<name>.ts`
2. Export `data` (SlashCommandBuilder) and `execute(interaction)` function
3. Import and add to `commands` array in `artifacts/discord-bot/src/index.ts`

**New Database Table:**
1. Create schema file at `lib/db/src/schema/<tableName>.ts`
2. Export from `lib/db/src/schema/index.ts`
3. Run `cd lib/db && pnpm run generate` then `pnpm run migrate`
4. Add column descriptions to `docs/SCHEMA_CONTRACT.md`

**New Schema Column on Existing Table:**
1. Edit the schema file in `lib/db/src/schema/<tableName>.ts`
2. Run `cd lib/db && pnpm run generate` then `pnpm run migrate`
3. Optionally add to `artifacts/api-server/src/lib/runStartupMigrations.ts` for safety
4. Update `docs/SCHEMA_CONTRACT.md`

**New Shared Library Logic:**
- ROFL/match/ELO logic: Add to `lib/rofl-parse/src/`
- DB queries used by both bot + server: Add to `lib/db/` or keep in consuming artifact's `lib/`

**New API Server Lib Helper:**
- Add to `artifacts/api-server/src/lib/<name>.ts`

**New Bot Lib Helper:**
- Add to `artifacts/discord-bot/src/lib/<name>.ts`

**New Scheduler:**
- API server: Add to `artifacts/api-server/src/schedulers/<name>.ts`, start in `src/index.ts`
- Bot: Add to `artifacts/discord-bot/src/lib/<name>.ts`, start in `src/index.ts`

**New Frontend Page (Replit only):**
- Add to `artifacts/vclol/src/pages/public/` or `artifacts/vclol/src/pages/admin/`

## Special Directories

**`lib/api-client-react/src/generated/`:**
- Purpose: Auto-generated React Query hooks
- Generated: Yes (by Orval from OpenAPI spec)
- Committed: Yes
- DO NOT EDIT manually

**`lib/api-zod/src/generated/`:**
- Purpose: Auto-generated Zod validators
- Generated: Yes (by Orval from OpenAPI spec)
- Committed: Yes
- DO NOT EDIT manually

**`lib/db/drizzle/migrations/`:**
- Purpose: SQL migration files
- Generated: Yes (by `drizzle-kit generate`)
- Committed: Yes

**`artifacts/vclol/dist/`:**
- Purpose: Vite build output
- Generated: Yes
- Committed: No (served by API server in production)

**`node_modules/`:**
- Purpose: Dependencies
- Generated: Yes (by `pnpm install`)
- Committed: No

---

*Structure analysis: 2026-03-26*
