# Technology Stack

**Analysis Date:** 2026-03-26

## Languages

**Primary:**
- TypeScript ~5.9.2 - All application code (bot, API server, frontend, shared libraries)

**Secondary:**
- SQL (PostgreSQL) - Database schema managed via Drizzle ORM
- Shell (bash) - `entrypoint.bot.sh`, Docker compose commands
- YAML - OpenAPI spec (`lib/api-spec/openapi.yaml`), Docker Compose, pnpm workspace

## Runtime

**Environment:**
- Node.js 22 (specified in `Dockerfile.bot` and `docker-compose.bot.yml` as `node:22-slim`)
- ES Modules throughout (all packages use `"type": "module"`)
- Target: ES2022 (`tsconfig.base.json` — `"target": "es2022"`, `"lib": ["es2022"]`)

**Package Manager:**
- pnpm 10 (enforced via preinstall script in root `package.json` — rejects npm/yarn)
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace catalog: `pnpm-workspace.yaml` defines shared dependency versions via `catalog:` protocol

## Monorepo Structure

**Workspace packages** (defined in `pnpm-workspace.yaml`):
```
packages:
  - artifacts/*        # Deployable apps
  - lib/*              # Shared libraries
  - lib/integrations/* # Integration libraries
  - scripts            # Dev/seed scripts
```

**Packages:**
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

**Core:**
- Express ^5 - API server (`artifacts/api-server/package.json`)
- React 19.1.0 - Frontend SPA (`pnpm-workspace.yaml` catalog)
- discord.js ^14.14.1 - Discord bot (`artifacts/discord-bot/package.json`)
- Drizzle ORM ^0.45.1 - Database ORM/query builder (`pnpm-workspace.yaml` catalog)

**Frontend UI:**
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

**State Management & Data Fetching:**
- TanStack React Query ^5.90.21 - Server state management + generated API hooks

**Testing:**
- None detected (no test framework in any package.json)

**Build/Dev:**
- Vite ^7.3.0 - Frontend bundler + dev server (`pnpm-workspace.yaml` catalog)
- esbuild ^0.27.3 - API server production bundler (`artifacts/api-server/package.json`)
- tsx ^4.21.0 - TypeScript execution for dev/scripts (`pnpm-workspace.yaml` catalog)
- Orval ^8.5.2 - OpenAPI-to-React Query + Zod code generation (`lib/api-spec/package.json`)
- drizzle-kit ^0.31.9 - Schema migration tooling (`lib/db/package.json`)
- Prettier ^3.8.1 - Code formatting (root `package.json`)
- @napi-rs/canvas ^0.1.97 - Server-side image rendering for scoreboard embeds (`artifacts/discord-bot/package.json`)

**Vite Plugins (Replit-specific):**
- @replit/vite-plugin-cartographer ^0.5.0
- @replit/vite-plugin-dev-banner ^0.1.1
- @replit/vite-plugin-runtime-error-modal ^0.0.6
- @vitejs/plugin-react ^5.0.4
- @tailwindcss/vite ^4.1.14

## Key Dependencies

**Critical (application cannot function without):**
- `drizzle-orm` ^0.45.1 - All database access across bot, API server, and scripts
- `pg` ^8.20.0 - PostgreSQL driver (node-postgres Pool)
- `discord.js` ^14.14.1 - Entire bot functionality
- `express` ^5 - API server HTTP layer
- `zod` ^3.25.76 - Runtime validation across API and generated schemas
- `@tanstack/react-query` ^5.90.21 - All frontend data fetching via generated hooks

**Infrastructure:**
- `express-session` ^1.19.0 - Server-side session management (admin + player auth)
- `express-rate-limit` 7.5.0 - API rate limiting (100/min general, 20/15min auth)
- `cors` ^2 - Cross-origin configuration
- `cookie-parser` ^1.4.7 - Cookie handling
- `drizzle-zod` ^0.8.3 - Drizzle-to-Zod schema bridge
- `cross-env` ^10.1.0 - Cross-platform env var setting for dev scripts
- `date-fns` ^3.6.0 - Date formatting utilities

## TypeScript Configuration

**Base config** (`tsconfig.base.json`):
- `strict`-like settings: `noImplicitAny`, `strictNullChecks`, `strictBindCallApply`, `strictPropertyInitialization`, `alwaysStrict`
- Relaxed: `strictFunctionTypes: false`, `noImplicitOverride: false`, `noUnusedLocals: false`
- Module: ESNext with bundler resolution
- Custom conditions: `["workspace"]` for workspace package resolution

## Configuration

**Environment:**
- All config via environment variables (see `docs/DEPLOYMENT.md` for full list)
- No `.env` file checked in; `.env.example` exists for `artifacts/discord-bot/`
- Critical env vars: `DATABASE_URL`, `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`

**Build:**
- `tsconfig.base.json` - Root TypeScript config (extended by all packages)
- `tsconfig.json` - Root project references for `tsc --build`
- `pnpm-workspace.yaml` - Workspace definition + dependency catalog + platform overrides
- `artifacts/vclol/vite.config.ts` - Frontend Vite config (path aliases `@` and `@assets`)
- `lib/api-spec/orval.config.ts` - Code generation config (React Query client + Zod schemas)
- `lib/db/drizzle.config.ts` - Drizzle migration config (PostgreSQL dialect)

## Platform Requirements

**Development:**
- Node.js 22+
- pnpm 10 (enforced; npm/yarn blocked)
- PostgreSQL 16 (local or Docker)
- Windows (primary dev) or Linux (production)

**Production:**
- Docker (Portainer-managed stacks, no SSH)
- PostgreSQL 16 Alpine (`postgres:16-alpine`)
- Node.js 22 Slim (`node:22-slim`)
- Two stacks: `vclol-web` (API server + SPA) and `vclol-bot` (PostgreSQL + Discord bot)
- Volumes: `pgdata` (database), `rofl-uploads` (.rofl files), `bot-app` (cloned repo cache)

## Build & Run Commands

**Root:**
```bash
pnpm run build        # Typecheck + build all packages
pnpm run typecheck    # Typecheck libs then artifacts
```

**API Server** (`artifacts/api-server/`):
```bash
pnpm run dev          # cross-env NODE_ENV=development tsx ./src/index.ts
pnpm run build        # esbuild bundle → dist/index.cjs (minified CJS)
```

**Discord Bot** (`artifacts/discord-bot/`):
```bash
pnpm run dev          # tsx watch src/index.ts
pnpm run build        # tsc
pnpm run start        # node dist/index.js
```

**Frontend** (`artifacts/vclol/`):
```bash
pnpm run dev          # vite --host 0.0.0.0
pnpm run build        # vite build → dist/public/
```

**Database** (`lib/db/`):
```bash
pnpm run generate     # drizzle-kit generate (create migration files)
pnpm run migrate      # drizzle-kit migrate (apply migrations - production)
pnpm run push         # drizzle-kit push (direct schema push - dev only)
```

**Code Generation** (`lib/api-spec/`):
```bash
pnpm run codegen      # orval → generates api-client-react + api-zod
```

**Scripts** (`scripts/`):
```bash
pnpm run seed         # tsx ./src/seed.ts
```

---

*Stack analysis: 2026-03-26*
