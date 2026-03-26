# VCLoL — Claude Session Reference

## Project in One Sentence

5v5 team scrim recording platform. Discord bot submits .rofl → match record. Website displays it. RSO = identity layer (launch requirement). ELO only for tournament/event matches.

**Docs:** `docs/PRD_v3.md` · `docs/BOT_SPEC.md` · `docs/SCHEMA_CONTRACT.md` · `docs/USER_JOURNEYS.md` · `docs/DEPLOYMENT.md`

---

## STEP 0 — Run at the start of every session (mandatory, no exceptions)

```python
import json, urllib.request, subprocess, re

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'",
    shell=True
).decode().strip()
REPO = "xiNeRoar/lolproject"

def gh(path):
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/{path}",
        headers={"Authorization": f"token {TOKEN}", "Accept": "application/vnd.github.v3+json"}
    )
    with urllib.request.urlopen(req) as r:
        return json.load(r)

open_issues = gh("issues?state=open&per_page=50")
closed = {i['number'] for i in gh("issues?state=closed&per_page=100")}
mine = [i for i in open_issues if "claude" in [l['name'] for l in i['labels']]]
mine.sort(key=lambda i: ((i.get('milestone') or {}).get('number', 99), i['number']))

def blocked(issue):
    refs = re.findall(r'[Bb]locked by[:\s#]+(\d+)', issue.get('body', '') or '')
    return any(int(n) not in closed for n in refs)

next_issue = next((i for i in mine if not blocked(i)), None)
if next_issue:
    ms = (next_issue.get('milestone') or {}).get('title', 'none')
    print(f"NEXT: #{next_issue['number']} [{ms}] {next_issue['title']}")
    print(f"URL: {next_issue['html_url']}")
else:
    print("No unblocked Claude issues.")
    for i in mine: print(f"  BLOCKED: #{i['number']} {i['title']}")
```

Then sync to latest remote (hard reset — discards any local uncommitted changes):
```bash
git fetch origin variant && git reset --hard FETCH_HEAD
```

Read the issue completely before touching any code.

---

## STEP 1 — When you find a problem during work

Two cases. Pick the right one:

**Case A — Sub-task or edge case of the issue you are currently working on:**
Comment on the current issue first, then decide whether to fix inline or open a new issue.

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

ISSUE_NUMBER = N  # replace with current issue number

data = json.dumps({
    "body": "**Found during implementation:**\n\n[describe what you found]\n\n**Decision:** [fixing inline / opening new issue #N / blocked until X]"
}).encode()
req = urllib.request.Request(
    f"https://api.github.com/repos/xiNeRoar/lolproject/issues/{ISSUE_NUMBER}/comments",
    data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    print(f"Commented on #{ISSUE_NUMBER}")
```

**Case B — Independent problem in a different area:**
Open a new issue before fixing it.

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

data = json.dumps({
    "title": "[Claude] One-line description",
    "labels": ["claude", "backend"],   # add "bug" if applicable
    "milestone": 2,                    # 1=Bot MVP 2=Web V1 3=VOD 4=Polish
    "body": "**Problem:** ...\n\n**What to do:** ...\n\n**Acceptance criteria:**\n- [ ] ...\n\nRelated to #N"
}).encode()
req = urllib.request.Request(
    "https://api.github.com/repos/xiNeRoar/lolproject/issues", data=data,
    headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
)
with urllib.request.urlopen(req) as r:
    d = json.load(r); print(f"Opened #{d['number']}: {d['title']}")
```

Never fix silently without a record.

---

## STEP 2 — Commit, push, then close the issue via API

```bash
git add -A
git commit -m "short description

closes #N"
git push origin variant
```

**Then close via API — `closes #N` in commit message does NOT auto-close on non-default branches:**

```python
import json, urllib.request, subprocess

TOKEN = subprocess.check_output(
    "git remote get-url origin | grep -o 'ghp_[^@]*'", shell=True
).decode().strip()

for n in [N]:  # replace with issue number(s)
    data = json.dumps({"state": "closed"}).encode()
    req = urllib.request.Request(
        f"https://api.github.com/repos/xiNeRoar/lolproject/issues/{n}",
        data=data, method="PATCH",
        headers={"Authorization": f"token {TOKEN}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as r:
        d = json.load(r); print(f"Closed #{d['number']}: {d['title']}")
```

---

## STEP 3 — Update the relevant doc in the same commit

| What changed | Update this file |
|---|---|
| Schema column or table added/changed | `docs/SCHEMA_CONTRACT.md` |
| Bot command added, changed, or clarified | `docs/BOT_SPEC.md` |
| New or changed API endpoint | `lib/api-spec/openapi.yaml` → run codegen |
| New environment variable required | `docs/DEPLOYMENT.md` |
| User journey step count improved | `docs/USER_JOURNEYS.md` |
| Architecture principle or constant changed | `CLAUDE.md` itself |

**CLAUDE.md is a living document.** Update it in the same commit when you learn something that changes how future sessions should work.

---

## STEP 4 — Check docs/REQUESTS.md each session

If Replit left a backend request: open a GitHub Issue for it, do the work, clear the entry from REQUESTS.md. All in one commit.

---

## Absolute Principles

1. **Schema → OpenAPI → codegen → route → page.** Never skip. Never write frontend fetch() by hand.
2. **Scrim (.rofl) does NOT count ELO.** ELO only for Tournament Code + Event matches. Scrim records W/L only.
3. **Teams own ELO. Players do not.** Player career = resume model (teams + per-team W/L + KDA).
4. **RSO = launch requirement.** Zero impersonation tolerance. /connect sends RSO link. /link-riot deleted.
5. **Bot is the match data producer.** `.rofl` parse via bot `/submit`. Website = identity (RSO) + management + display.
6. **3-layer privacy:** L1 scrim = login+participant. L2 RSO opt-in = public profile. L3 tournament = public by design.
7. **Read actual source files before answering.** Never guess schema or route signatures.
8. **No SSH. Portainer only.**

---

## Architecture

```
pnpm monorepo
├── lib/db/src/schema/        ← Drizzle schema (source of truth)
├── lib/api-spec/openapi.yaml ← API contract (source of truth)
├── lib/api-client-react/     ← Generated hooks (never edit directly)
├── artifacts/api-server/     ← Express routes
├── artifacts/vclol/          ← React frontend (Replit owns)
└── artifacts/discord-bot/    ← Bot (Claude owns)
```

**After schema change:** `cd lib/db && pnpm run generate` then `pnpm run migrate`
**After OpenAPI change:** `cd lib/api-spec && pnpm run codegen`

---

## Data Model

```
teams (teamElo, wins, losses, isActive, captainPlayerId nullable, lastMatchAt, defaultMatchVisibility)
  └── team_members (playerId, role, status: active/inactive/pending, lastActiveAt)
matches (teamAId, teamBId, matchType: scrim/ranked_tournament/event, visibleAfter, resultSource, roflFilePath, tournamentCode)
  └── match_players (10 rows: PUUID, champion, KDA, CS, items, win)
players (discordId, riotId, puuid, rsoOptIn, profileVisibility: default private)
elo_history · seasons · events · notifications · admin_actions · player_bans · bot_heartbeats · auth_sessions
```

---

## Auth

**Admin:** `req.session.adminId` (iron-session)
**Player identity:** RSO OAuth → PUUID (verified, launch requirement)
**Player login (website):** Discord OAuth → `discordId` → then RSO → `puuid` (two-step)
**Player login (no Discord):** RSO OAuth directly → `puuid`
**Bot /connect:** generates token → URL → website RSO flow → links discordId + puuid

---

## Visibility Rules

```
Scrim match (resultSource=rofl_parse):
  Public: Team A vs Team B + score only
  Login + participant: full 10-player stats
  Captain /visibility public: spectator VOD + match detail public

Tournament/Event match (matchType=ranked_tournament/event):
  Default public: full stats + ELO + VOD
  Captain /visibility private: override to restricted

Player profile:
  Default: private (profileVisibility="private", rsoOptIn=false)
  After RSO opt-in: player controls (public/private/participants-only)
```

VOD: follows match visibility. POV: requires individual player RSO opt-in consent.

---

## Ownership

**Claude owns (Replit never edits):**
`lib/db/src/schema/` · `lib/api-spec/openapi.yaml` · `artifacts/api-server/` · `artifacts/discord-bot/` · `docs/` (except replit.md) · `CLAUDE.md`

**Replit owns (Claude never edits):**
`artifacts/vclol/src/` · `replit.md`

---

## Key Constants

```
Seed: Team Alpha id=8, Beta id=9. Players 39-48. xiNe#NA1=id39.
ELO: only for matchType=ranked_tournament/event. Scrim = W/L record only.
gameDuration: milliseconds
MAX_ROSTER_SIZE: 15 (5 starters + 10 subs, enforced in /submit auto-add)
INACTIVITY_THRESHOLD: 5 (consecutive match absences before auto-inactive)
WIN_STREAK_BADGE: 5 (consecutive wins for badge)
SUBMIT_COOLDOWN_MS: 120000 (2 minutes between submissions per team)
MAX_ACTIVE_TEAMS: 3 (concurrent active teams per captain, enforced in /register-team)
TEAM_INACTIVITY_DAYS: 30 (no match in 30 days → isActive=false, daily check in seasonBroadcaster)
Bot commands: /register-team, /submit, /stats, /roster, /connect, /visibility, /transfer-captain, /leave, /remove, /register-event, /claim-match
Deleted commands: /add (→ .rofl auto-discovery), /link-riot (→ RSO /connect)
```

## Docker Deploy

```
docker-compose.bot.yml — all-in-one stack (PostgreSQL 16 + Bot)
  Portainer: Web editor paste, NOT Repository (ARM64 BuildKit broken)
  Only env var: DISCORD_BOT_TOKEN
  Bot auto-clones variant branch, pnpm install, drizzle-kit push, tsx start
  To update: Restart container (auto git fetch + reset on every start)
DISCORD_CLIENT_ID: 1486274314482356225
```

<!-- GSD:project-start source:PROJECT.md -->
## Project

**VCLoL — 5v5 Scrim Recording Platform**

VCLoL is the missing infrastructure between solo queue and organized competitive play for serious amateur League of Legends players in NA. A Discord bot ingests .rofl replay files to record verified match results; a website displays team profiles, player career resumes, and match stats with a 3-layer privacy model. RSO (Riot Sign On) is the identity layer — zero impersonation tolerance.

**Core Value:** Every match submitted via .rofl produces a verified, permanent competitive record that cannot be faked — the "team play resume" that OP.GG cannot provide.

### Constraints

- **Riot Policy:** Custom game data private by default; 3-layer privacy model required
- **RSO Dependency:** Production key requires Riot approval; build with placeholder, swap on approval
- **Ownership Boundary:** Claude never edits `artifacts/vclol/src/`, Replit never edits backend/bot/docs
- **No SSH:** All deployment via Portainer Web editor only
- **ARM64:** Docker BuildKit broken on ARM64, use stock images + Web editor paste
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript ~5.9.2 - All application code (bot, API server, frontend, shared libraries)
- SQL (PostgreSQL) - Database schema managed via Drizzle ORM
- Shell (bash) - `entrypoint.bot.sh`, Docker compose commands
- YAML - OpenAPI spec (`lib/api-spec/openapi.yaml`), Docker Compose, pnpm workspace
## Runtime
- Node.js 22 (specified in `Dockerfile.bot` and `docker-compose.bot.yml` as `node:22-slim`)
- ES Modules throughout (all packages use `"type": "module"`)
- Target: ES2022 (`tsconfig.base.json` — `"target": "es2022"`, `"lib": ["es2022"]`)
- pnpm 10 (enforced via preinstall script in root `package.json` — rejects npm/yarn)
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace catalog: `pnpm-workspace.yaml` defines shared dependency versions via `catalog:` protocol
## Monorepo Structure
| Package | Path | Purpose |
|---------|------|---------|
| `@workspace/api-server` | `artifacts/api-server/` | Express REST API + SPA serving |
| `@workspace/discord-bot` | `artifacts/discord-bot/` | Discord slash-command bot |
| `@workspace/vclol` | `artifacts/vclol/` | React SPA frontend |
| `@workspace/mockup-sandbox` | `artifacts/mockup-sandbox/` | UI mockup/sandbox environment |
| `@workspace/db` | `lib/db/` | Drizzle schema + DB connection (source of truth) |
| `@workspace/api-spec` | `lib/api-spec/` | OpenAPI spec + Orval codegen config |
| `@workspace/api-client-react` | `lib/api-client-react/` | Generated React Query hooks (never edit directly) |
| `@workspace/api-zod` | `lib/api-zod/` | Generated Zod schemas from OpenAPI |
| `@workspace/rofl-parse` | `lib/rofl-parse/` | ROFL2 replay file parser + ELO calculator |
| `@workspace/scripts` | `scripts/` | Seed data + dev utilities |
## Frameworks
- Express ^5 - API server (`artifacts/api-server/package.json`)
- React 19.1.0 - Frontend SPA (`pnpm-workspace.yaml` catalog)
- discord.js ^14.14.1 - Discord bot (`artifacts/discord-bot/package.json`)
- Drizzle ORM ^0.45.1 - Database ORM/query builder (`pnpm-workspace.yaml` catalog)
- Tailwind CSS ^4.1.14 - Utility-first CSS (`pnpm-workspace.yaml` catalog)
- Radix UI - Headless component primitives (full set: dialog, dropdown, tabs, toast, etc.)
- shadcn/ui pattern - CVA + clsx + tailwind-merge for component variants
- Framer Motion 12.35.1 - Animations
- Recharts ^2.15.2 - Charts/data visualization
- Wouter ^3.3.5 - Lightweight client-side routing (not React Router)
- Lucide React 0.545.0 - Icons
- Sonner ^2.0.7 - Toast notifications
- React Hook Form ^7.55.0 + @hookform/resolvers - Form management
- cmdk ^1.1.1 - Command palette
- Vaul ^1.1.2 - Drawer component
- Embla Carousel ^8.6.0 - Carousel
- next-themes ^0.4.6 - Theme switching (dark/light)
- TanStack React Query ^5.90.21 - Server state management + generated API hooks
- None detected (no test framework in any package.json)
- Vite ^7.3.0 - Frontend bundler + dev server (`pnpm-workspace.yaml` catalog)
- esbuild ^0.27.3 - API server production bundler (`artifacts/api-server/package.json`)
- tsx ^4.21.0 - TypeScript execution for dev/scripts (`pnpm-workspace.yaml` catalog)
- Orval ^8.5.2 - OpenAPI-to-React Query + Zod code generation (`lib/api-spec/package.json`)
- drizzle-kit ^0.31.9 - Schema migration tooling (`lib/db/package.json`)
- Prettier ^3.8.1 - Code formatting (root `package.json`)
- @napi-rs/canvas ^0.1.97 - Server-side image rendering for scoreboard embeds (`artifacts/discord-bot/package.json`)
- @replit/vite-plugin-cartographer ^0.5.0
- @replit/vite-plugin-dev-banner ^0.1.1
- @replit/vite-plugin-runtime-error-modal ^0.0.6
- @vitejs/plugin-react ^5.0.4
- @tailwindcss/vite ^4.1.14
## Key Dependencies
- `drizzle-orm` ^0.45.1 - All database access across bot, API server, and scripts
- `pg` ^8.20.0 - PostgreSQL driver (node-postgres Pool)
- `discord.js` ^14.14.1 - Entire bot functionality
- `express` ^5 - API server HTTP layer
- `zod` ^3.25.76 - Runtime validation across API and generated schemas
- `@tanstack/react-query` ^5.90.21 - All frontend data fetching via generated hooks
- `express-session` ^1.19.0 - Server-side session management (admin + player auth)
- `express-rate-limit` 7.5.0 - API rate limiting (100/min general, 20/15min auth)
- `cors` ^2 - Cross-origin configuration
- `cookie-parser` ^1.4.7 - Cookie handling
- `drizzle-zod` ^0.8.3 - Drizzle-to-Zod schema bridge
- `cross-env` ^10.1.0 - Cross-platform env var setting for dev scripts
- `date-fns` ^3.6.0 - Date formatting utilities
## TypeScript Configuration
- `strict`-like settings: `noImplicitAny`, `strictNullChecks`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`
- Relaxed: `strictFunctionTypes: false`, `noImplicitOverride: false`, `noUnusedLocals: false`
- Module: ESNext with bundler resolution
- Custom conditions: `["workspace"]` for workspace package resolution
## Configuration
- All config via environment variables (see `docs/DEPLOYMENT.md` for full list)
- No `.env` file checked in; `.env.example` exists for `artifacts/discord-bot/`
- Critical env vars: `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`
- `tsconfig.base.json` - Root TypeScript config (extended by all packages)
- `tsconfig.json` - Root project references for `tsc --build`
- `pnpm-workspace.yaml` - Workspace definition + dependency catalog + platform overrides
- `artifacts/vclol/vite.config.ts` - Frontend Vite config (path aliases `@` and `@assets`)
- `lib/api-spec/orval.config.ts` - Code generation config (React Query client + Zod schemas)
- `lib/db/drizzle.config.ts` - Drizzle migration config (PostgreSQL dialect)
## Platform Requirements
- Node.js 22+
- pnpm 10 (enforced; npm/yarn blocked)
- PostgreSQL 16 (local or Docker)
- Windows (primary dev) or Linux (production)
- Docker (Portainer-managed stacks, no SSH)
- PostgreSQL 16 Alpine (`postgres:16-alpine`)
- Node.js 22 Slim (`node:22-slim`)
- Two stacks: `vclol-web` (API server + SPA) and `vclol-bot` (PostgreSQL + Discord bot)
- Volumes: `pgdata` (database), `rofl-uploads` (.rofl files), `bot-app` (cloned repo cache)
## Build & Run Commands
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- Use kebab-case for all source files: `rofl-parser.ts`, `team-matcher.ts`, `claim-match.ts`
- Schema files use camelCase: `matchPlayers.ts`, `teamMembers.ts`, `adminActions.ts`
- Test files use `.test.ts` suffix co-located with source: `rofl-parser.test.ts`
- Use camelCase for all functions: `checkBan()`, `recordMatch()`, `buildSideName()`, `formatDuration()`
- Prefix boolean-returning functions with `is`/`check`/`has`: `isAdminAuthenticated()`, `checkBan()`, `checkOffensiveContent()`
- Async functions use descriptive verbs: `recordMatch()`, `registerCommands()`, `writeHeartbeat()`
- Use camelCase for all variables: `matchId`, `sideAName`, `blueWon`, `roflFilePath`
- Constants use UPPER_SNAKE_CASE: `MAX_FILE_SIZE`, `MAX_ACTIVE_TEAMS`, `SUBMIT_COOLDOWN_MS`
- Environment variables accessed via `process.env.UPPER_SNAKE_CASE`
- Use PascalCase for types and interfaces: `RecordMatchInput`, `PlayerDisplay`, `CommandModule`, `RoflMatch`
- Schema types derived from Drizzle inference: `typeof teamsTable.$inferSelect`, `typeof teamsTable.$inferInsert`
- Export type aliases using `type` keyword: `export type Team = typeof teamsTable.$inferSelect`
- Zod-inferred types: `export type InsertTeam = z.infer<typeof insertTeamSchema>`
- Table variables use camelCase + `Table` suffix: `teamsTable`, `matchPlayersTable`, `eloHistoryTable`
- SQL column names use snake_case: `captain_player_id`, `team_a_id`, `created_at`
- Table SQL names are plural lowercase: `teams`, `matches`, `match_players`
## Code Style
- Prettier v3.8.1 installed at workspace root (`package.json` devDependencies)
- No `.prettierrc` config file detected -- uses Prettier defaults (2-space indent, double quotes likely)
- Actual codebase uses double quotes for imports, 2-space indentation
- No ESLint, Biome, or other linter configured
- TypeScript strict mode serves as primary code quality gate
- `tsconfig.base.json`: `strictNullChecks: true`, `noImplicitAny: true`, `noImplicitReturns: true`, `useUnknownInCatchVariables: true`
- `strictFunctionTypes: false` (relaxed for callback compatibility)
- `noUnusedLocals: false` (unused vars allowed)
- Base config at `tsconfig.base.json` with `target: es2022`, `module: esnext`, `moduleResolution: bundler`
- Each package extends base: `"extends": "../../tsconfig.base.json"`
- Project references used for cross-package dependencies (`references` array in each `tsconfig.json`)
- `isolatedModules: true` for compatibility with bundlers
## Import Organization
- `@workspace/db` -- shared database client + schema (used by bot and API server)
- `@workspace/api-zod` -- generated Zod schemas from OpenAPI (used by API server)
- `@workspace/api-client-react` -- generated React Query hooks (used by frontend)
- `@workspace/rofl-parse` -- shared ROFL parser + ELO calculator (used by bot and API server)
- Always use `.js` extension in relative imports (ESM requirement): `import { db } from "./lib/db.js"`
- Workspace imports use bare specifiers: `import { db } from "@workspace/db"`
## Error Handling
- Try/catch wrapping each route handler
- Return JSON error objects: `res.status(400).json({ error: "message" })`
- Status codes: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)
- PostgreSQL unique constraint violation `code === "23505"` caught for duplicate handling
- Console.error with topic prefix for unexpected errors: `console.error("[teams]", err)`
- Commands defer reply, then use `replyError()` helper for ephemeral error display
- `replyError()` at `artifacts/discord-bot/src/lib/replyError.ts` deletes deferred reply + sends ephemeral followUp
- Global interaction error handler in `artifacts/discord-bot/src/index.ts` catches unhandled throws
- Empty `catch {}` blocks used for non-critical Discord API failures (expired interactions)
- `catch (err: unknown)` preferred (enforced by `useUnknownInCatchVariables`)
- Some legacy `catch (err: any)` exists in API routes for `.code` access on PG errors
## Logging
- Use bracketed topic prefix: `[bot]`, `[teams]`, `[register-team]`, `[audit]`, `[static]`
- `console.log()` for informational: `console.log("[bot] Logged in as ...")`
- `console.error()` for failures: `console.error("[teams]", err)`
- `console.warn()` for non-fatal issues: `console.warn("[register-team] Blocked offensive name...")`
## Comments
- JSDoc-style block comments at the top of every file describing purpose: `/** * /submit - Core match recording command. */`
- Inline section headers using `// ── Section Name ──────` Unicode box-drawing dividers
- Reference doc specs: `// Spec: docs/BOT_SPEC.md -> /submit`
- Reference issue numbers: `// Rate limiting (Issue #28)`, `// (#128 SQL-level pagination)`
- Used on exported functions in library modules with `@param` / `@returns`
- Not used on route handlers or command handlers (file-level comment suffices)
- Example from `artifacts/discord-bot/src/lib/checkBan.ts`:
## Function Design
- Commands decomposed into focused modules: `submit.ts` orchestrates, `matchRecorder.ts` handles DB, `submitHelpers.ts` handles display, `unknownPlayerHandler.ts` handles interactive flows
- Route files can be large (300-500 lines) with multiple endpoints per resource
- Use typed option objects for complex inputs: `RecordMatchInput`, `PlayerDisplay`
- Destructure at function body start: `const { match, sideA, sideB, ... } = input`
- Use `as` type assertions for `req.body` in Express routes (no runtime validation middleware)
- Functions return concrete types, not `any`
- Async functions return `Promise<T>` explicitly
- Express route handlers return `void` (call `res.json()` / `res.status()`)
- Bot commands return `Promise<void>` (call `interaction.editReply()` / `replyError()`)
## Module Design
- Named exports preferred for functions and types: `export async function recordMatch()`
- Default exports used for Express routers: `export default router`
- Bot commands use named exports `data` + `execute` following discord.js pattern
- Re-export pattern used in library index files: `export * from "./teams"` (barrel files)
- `lib/db/src/schema/index.ts` -- re-exports all schema tables and types
- `lib/db/src/index.ts` -- exports `db` client + all schema
- `lib/rofl-parse/src/index.ts` -- exports parser, matcher, ELO functions
- `artifacts/api-server/src/routes/index.ts` -- mounts all route modules on Express router
- Bot accesses DB directly via `@workspace/db` (not HTTP API) for performance
- API server also imports `@workspace/db` directly
- Bot re-exports through `artifacts/discord-bot/src/lib/db.ts` for convenience
- Drizzle query builder used throughout (no raw SQL)
## Schema Definition Pattern
## API Route Pattern
## Bot Command Pattern
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Schema-first development: Drizzle schema (`lib/db/`) is the single source of truth for the database
- Contract-first API: OpenAPI spec (`lib/api-spec/openapi.yaml`) drives codegen for frontend hooks (`lib/api-client-react/`) and Zod validators (`lib/api-zod/`)
- Both bot and API server share the same `@workspace/db` package and connect directly to PostgreSQL via Drizzle ORM (no HTTP intermediary between bot and DB)
- The bot is the primary match data producer; the API server is for display, admin, and auth
- Code ownership split: Claude owns backend/bot/schema/docs, Replit owns frontend (`artifacts/vclol/src/`)
## Layers
- Purpose: Drizzle ORM schema definitions, connection pool, and type exports
- Location: `lib/db/src/`
- Contains: Schema files (`lib/db/src/schema/*.ts`), DB client (`lib/db/src/index.ts`)
- Depends on: PostgreSQL via `pg` pool, `drizzle-orm`, `drizzle-zod`
- Used by: `@workspace/api-server`, `@workspace/discord-bot` (both import `@workspace/db` directly)
- Exported as: `@workspace/db` (workspace package)
- Purpose: Parse .rofl replay files, match players to teams, ELO calculation
- Location: `lib/rofl-parse/src/`
- Contains: `rofl-parser.ts` (binary parse), `team-matcher.ts` (match PUUIDs to DB teams), `elo.ts` (rating calc), `helpers.ts`
- Depends on: Nothing external (pure logic)
- Used by: `@workspace/discord-bot` (primary), `@workspace/api-server` (submit-rofl fallback endpoint)
- Exported as: `@workspace/rofl-parse`
- Purpose: OpenAPI 3.1 spec defining all REST endpoints
- Location: `lib/api-spec/openapi.yaml`
- Contains: Path definitions, request/response schemas
- Used by: `lib/api-client-react/` and `lib/api-zod/` via Orval codegen (`lib/api-spec/orval.config.ts`)
- Purpose: TanStack React Query hooks auto-generated from OpenAPI spec
- Location: `lib/api-client-react/src/generated/`
- Contains: `api.ts` (hooks), `api.schemas.ts` (TypeScript types)
- Generated by: `cd lib/api-spec && pnpm run codegen`
- Used by: `artifacts/vclol/` (React frontend)
- Purpose: Zod validation schemas auto-generated from OpenAPI spec
- Location: `lib/api-zod/src/generated/`
- Contains: `api.ts` (validators), `types/` (TypeScript types)
- Used by: `@workspace/api-server` for request validation
- Purpose: Express REST API serving all HTTP endpoints, admin auth, OAuth flows, schedulers
- Location: `artifacts/api-server/src/`
- Contains: Routes, middlewares, lib helpers, schedulers
- Depends on: `@workspace/db`, `@workspace/api-zod`, `@workspace/rofl-parse`, Express 5, express-session
- Entry point: `artifacts/api-server/src/index.ts` -> `app.ts`
- Purpose: Discord slash commands for match submission, team management, RSO verification
- Location: `artifacts/discord-bot/src/`
- Contains: Commands (`src/commands/`), lib helpers (`src/lib/`), image renderers
- Depends on: `@workspace/db`, `@workspace/rofl-parse`, discord.js
- Entry point: `artifacts/discord-bot/src/index.ts`
- Purpose: SPA for viewing matches, teams, players, admin dashboard
- Location: `artifacts/vclol/src/`
- Contains: Pages, components, hooks
- Depends on: `@workspace/api-client-react` (generated hooks), React 19, TanStack Query, Tailwind CSS
- Served by: API server in production (static files + SPA fallback)
## Data Flow
- Server-side sessions via `express-session` (in-memory store)
- Session data: `adminId`, `playerId`, `playerRiotId`, `discordId`, `connectToken` (defined in `artifacts/api-server/src/lib/session.ts`)
- Frontend state: TanStack React Query cache (no Redux/Zustand)
## Key Abstractions
- Purpose: Define database structure and generate TypeScript types
- Location: `lib/db/src/schema/*.ts` (22 schema files)
- Pattern: Each file exports a `pgTable()` definition, `createInsertSchema()` Zod validator, and inferred types
- Core tables: `teams`, `players`, `matches`, `matchPlayers`, `teamMembers`, `eloHistory`, `seasons`, `events`, `notifications`
- Purpose: Discord slash command handlers
- Location: `artifacts/discord-bot/src/commands/*.ts` (11 commands)
- Pattern: Each file exports `data` (SlashCommandBuilder) and `execute(interaction)` function
- Commands: `submit`, `register-team`, `connect`, `stats`, `roster`, `visibility`, `transfer-captain`, `leave`, `remove`, `register-event`, `claim-match`
- Purpose: Express route handlers for REST endpoints
- Location: `artifacts/api-server/src/routes/*.ts` (22 route files)
- Pattern: Each file creates `Router()`, defines handlers, exports default. Mounted in `routes/index.ts`
- All routes mounted under `/api/` prefix
- Purpose: Generate PNG images for Discord embeds (scoreboards, player cards, leaderboards, team cards)
- Location: `artifacts/discord-bot/src/lib/*Renderer.ts`
- Uses: `@napi-rs/canvas` for server-side image generation
## Entry Points
- Location: `artifacts/api-server/src/index.ts`
- Triggers: `pnpm dev` or `node dist/index.js`
- Responsibilities: Run startup migrations, start Express server on PORT (default 3000), start schedulers (team inactivity, ROFL cleanup)
- Location: `artifacts/discord-bot/src/index.ts`
- Triggers: `pnpm dev` or `node dist/index.js`
- Responsibilities: Register slash commands with Discord API, start notification poller, season broadcaster, team inactivity scheduler, heartbeat interval
- Location: `artifacts/vclol/src/main.tsx`
- Triggers: Vite dev server or built static files served by API server
- Responsibilities: React SPA with client-side routing
## Schedulers & Background Jobs
- `startTeamInactivityScheduler()` — every 6 hours, deactivates teams with no match in 30 days (`artifacts/api-server/src/schedulers/teamInactivity.ts`)
- `startRoflCleanupScheduler()` — daily, deletes .rofl files older than 14 days from disk (`artifacts/api-server/src/schedulers/roflCleanup.ts`)
- `startNotificationPoller()` — every 60s, sends Discord DMs for unread notifications with exponential backoff retry (`artifacts/discord-bot/src/lib/notificationPoller.ts`)
- `startSeasonBroadcaster()` — daily at midnight UTC, broadcasts season-ending warnings to guilds (`artifacts/discord-bot/src/lib/seasonBroadcaster.ts`)
- `startTeamInactivityScheduler()` — duplicated in bot for when API server is not running (`artifacts/discord-bot/src/lib/teamInactivityScheduler.ts`)
- Heartbeat interval — periodic bot health ping to `bot_heartbeats` table
## Error Handling
- Bot commands use `replyError(interaction, message)` helper (`artifacts/discord-bot/src/lib/replyError.ts`) for user-facing errors
- API routes return JSON `{ error: string }` with appropriate HTTP status codes
- DB transaction errors caught per-route; duplicate gameId handled via PostgreSQL unique constraint (error code 23505)
- Schedulers catch errors internally and log — never crash the process
- Startup migrations are non-fatal: server starts even if migrations fail
## Cross-Cutting Concerns
- API request bodies: Zod schemas from `@workspace/api-zod` (generated from OpenAPI)
- Schema inserts: `createInsertSchema()` from `drizzle-zod` on each table
- Bot input: Manual validation in command handlers
- Admin: `express-session` with `req.session.adminId`, checked by `requireAdmin` middleware
- Player: Discord OAuth -> session, then RSO OAuth for identity verification
- Bot: Discord user ID from interaction object, matched to `players.discordId`
- Match visibility: 3-layer privacy model (`isVisible()` in `artifacts/api-server/src/routes/matches.ts`)
- Admin routes protected by `requireAdmin` middleware
- Rate limiting: 100 req/min for API, 20 req/15min for auth (`artifacts/api-server/src/app.ts`)
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
