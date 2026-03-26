# External Integrations

**Analysis Date:** 2026-03-26

## APIs & External Services

**Discord:**
- Discord Bot API - Slash commands, DM notifications, button interactions, heartbeats
  - SDK: `discord.js` ^14.14.1
  - Auth: `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`
  - Intents: Guilds, GuildMessages, DirectMessages, MessageContent
  - Partials: Channel, Message (for DM button interactions)
  - Entry: `artifacts/discord-bot/src/index.ts`
  - Commands registered globally via `Routes.applicationCommands(clientId)`

- Discord OAuth2 - Player website login (identity layer)
  - Endpoints: `https://discord.com/api/oauth2/authorize`, `https://discord.com/api/oauth2/token`, `https://discord.com/api/users/@me`
  - Scopes: `identify email`
  - Auth: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
  - Implementation: `artifacts/api-server/src/routes/auth.ts` (lines 9-92)
  - Flow: `/auth/discord` → Discord → `/auth/discord/callback` → session set → redirect to `/dashboard` or `/register`

**Riot Games:**
- Riot Sign-On (RSO) OAuth2 - Identity verification (launch requirement)
  - Endpoints: `https://auth.riotgames.com/authorize`, `https://auth.riotgames.com/token`
  - Scopes: `openid offline_access`
  - Auth: `RSO_CLIENT_ID`, `RSO_CLIENT_SECRET`, `RSO_REDIRECT_URI`
  - Implementation: `artifacts/api-server/src/routes/auth.ts` (lines 94-308)
  - Two flows:
    1. Bot `/connect` flow: bot generates token → URL with token → website RSO → links discordId + PUUID
    2. Website-only flow: Discord login first → `/auth/rso` → RSO → PUUID stored
  - Returns: PUUID, gameName, tagLine (riot account identity)

- Riot Account API - Fetch verified player identity after RSO
  - Endpoint: `https://americas.api.riotgames.com/riot/account/v1/accounts/me`
  - Auth: Bearer token from RSO OAuth exchange
  - Implementation: `artifacts/api-server/src/routes/auth.ts` (line 204)
  - Returns: `{ puuid, gameName, tagLine }`

- Riot Data Dragon CDN - Champion and item icon assets (no API key needed)
  - Base URL: `https://ddragon.leagueoflegends.com/cdn/14.24.1/img/`
  - Champion icons: `.../champion/{ChampId}.png`
  - Item icons: `.../item/{itemId}.png`
  - Loading splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/{ChampId}_0.jpg`
  - Bot implementation: `artifacts/discord-bot/src/lib/iconCache.ts` (in-memory cache, process lifetime)
  - Frontend implementation: `artifacts/vclol/src/lib/lol-utils.ts`
  - Hardcoded version: `14.24.1` (must be manually updated for new patches)

- Riot Tournament API - Tournament code generation (planned, not yet active)
  - Auth: `RIOT_API_KEY` (optional env var, not yet required)
  - Schema support: `matches.tournamentCode` column in `lib/db/src/schema/matches.ts`

**Email (Optional):**
- Resend - Email notification delivery
  - Auth: `RESEND_API_KEY` (optional — if unset, email delivery is skipped)
  - From: `EMAIL_FROM` env var (default: `VCLoL <noreply@vclol.gg>`)
  - Used by: API server notification system

## Data Storage

**Database:**
- PostgreSQL 16 Alpine (`postgres:16-alpine`)
  - Connection: `DATABASE_URL` env var (connection string)
  - Client: `pg` ^8.20.0 (node-postgres Pool) via `lib/db/src/index.ts`
  - ORM: Drizzle ORM ^0.45.1 with full schema typing
  - Schema source of truth: `lib/db/src/schema/` (22 schema files)
  - Migration tool: drizzle-kit ^0.31.9 (`generate` + `migrate` for production, `push` for dev)
  - Startup migrations: `artifacts/api-server/src/lib/runStartupMigrations.ts` (ADD COLUMN IF NOT EXISTS)
  - Tables: teams, team_members, matches, match_players, players, elo_history, seasons, events, notifications, admin_actions, player_bans, bot_heartbeats, auth_sessions, player_badges, season_champions, vod_entries, vod_timestamps, ladder_settings, event_registrations, replay_submissions, admin_users

**File Storage:**
- Local filesystem - .rofl replay files
  - Path: `ROFL_UPLOAD_DIR` env var (default: `./uploads/rofl`, Docker: `/data/rofl`)
  - Docker volume: `rofl-uploads` mounted at `/data/rofl`
  - Cleanup: `artifacts/api-server/src/schedulers/roflCleanup.ts` (scheduled cleanup)
  - Size: ~10 MB per match

**Caching:**
- In-memory only (no Redis/Memcached)
  - Data Dragon icons: `Map<string, Buffer>` in `artifacts/discord-bot/src/lib/iconCache.ts`
  - Sessions: express-session with default MemoryStore (not persistent across restarts)

## Authentication & Identity

**Admin Auth:**
- express-session with `req.session.adminId`
  - Secret: `SESSION_SECRET` env var (default: `"vclol-admin-secret-2024"` — MUST change in prod)
  - Cookie: httpOnly, secure in production, 7-day maxAge
  - Implementation: `artifacts/api-server/src/app.ts` (lines 35-46)

**Player Identity (Website):**
- Two-step flow: Discord OAuth → discordId → RSO OAuth → PUUID
- Or: RSO OAuth directly → PUUID (no Discord needed)
- Session fields: `playerId`, `playerRiotId`, `discordUsername`, `discordId`, `connectToken`, `connectDiscordId`
- Implementation: `artifacts/api-server/src/routes/auth.ts`

**Player Identity (Bot):**
- `/connect` command generates auth token → stores in `auth_sessions` table → sends URL to player
- Player clicks URL → website RSO flow → links discordId + PUUID
- Implementation: `artifacts/discord-bot/src/commands/connect.ts`

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, DataDog, etc.)
- Console logging only (`console.log`, `console.error` throughout)

**Health Checks:**
- `GET /api/health` - API server health endpoint (`artifacts/api-server/src/routes/health.ts`)
- `GET /api/bot-status` - Bot online status (checks `bot_heartbeats` table for recent entry)
- Bot heartbeat: writes to `bot_heartbeats` table every 5 minutes (`artifacts/discord-bot/src/index.ts` lines 108-116)
- PostgreSQL healthcheck: `pg_isready -U vclol` every 5s in Docker (`docker-compose.bot.yml`)

**Logs:**
- Console output only, viewed via Portainer container log viewer
- Prefixed by subsystem: `[bot]`, `[setup]`, `[entrypoint]`, `[migration]`, `[poller]`, `[season-broadcast]`

## Background Processes

**API Server Schedulers** (`artifacts/api-server/src/schedulers/`):
- `teamInactivity.ts` - Marks teams inactive after 30 days without a match
- `roflCleanup.ts` - Cleans up old .rofl files from disk

**Bot Background Tasks** (`artifacts/discord-bot/src/lib/`):
- `notificationPoller.ts` - Polls notifications table, sends Discord DMs with exponential backoff retry
- `seasonBroadcaster.ts` - Broadcasts season start/end announcements
- `teamInactivityScheduler.ts` - Team inactivity checks (bot-side)
- Heartbeat writer - Every 5 minutes (`artifacts/discord-bot/src/index.ts`)
- Expired invite cleanup on startup (`artifacts/discord-bot/src/lib/inviteHandler.ts`)
- Expired auth session cleanup on startup (`artifacts/discord-bot/src/commands/connect.ts`)

## CI/CD & Deployment

**Hosting:**
- Self-hosted Docker via Portainer (no cloud provider)
- Two Portainer stacks: `vclol-web` (API + SPA) and `vclol-bot` (PostgreSQL + bot)
- No SSH access — all management via Portainer UI

**CI Pipeline:**
- None detected (no GitHub Actions, no CI config files)
- Manual deploy: paste `docker-compose.bot.yml` into Portainer Web editor
- Bot updates: Portainer restart → container does `git fetch origin variant && git reset --hard`

**Docker:**
- `Dockerfile.bot` - Multi-stage build for bot (node:22-slim base)
- `docker-compose.bot.yml` - All-in-one bot stack (PostgreSQL 16 + Node 22 bot)
- Bot container clones repo at runtime, no pre-built image for bot
- API server uses esbuild bundle (`dist/index.cjs`) for production

## API Contract & Code Generation

**OpenAPI Spec:**
- Location: `lib/api-spec/openapi.yaml` (source of truth for API contract)
- Code generator: Orval ^8.5.2 (`lib/api-spec/orval.config.ts`)
- Generates two outputs:
  1. React Query hooks → `lib/api-client-react/src/generated/` (client: `react-query`, custom fetch mutator)
  2. Zod validation schemas → `lib/api-zod/src/generated/` (with coercion for query/param types)
- Base URL for generated client: `/api`
- Custom fetch: `lib/api-client-react/src/custom-fetch.ts`

## Environment Configuration

**Required env vars (production):**
- `DATABASE_URL` - PostgreSQL connection string
- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord OAuth app ID (hardcoded in compose: `1486274314482356225`)
- `DISCORD_CLIENT_SECRET` - Discord OAuth app secret
- `DISCORD_REDIRECT_URI` - Discord OAuth callback URL
- `SESSION_SECRET` - Express session secret (cryptographically random in prod)
- `RSO_CLIENT_ID` - Riot Sign-On OAuth client ID (launch requirement)
- `RSO_CLIENT_SECRET` - Riot Sign-On OAuth client secret (launch requirement)
- `RSO_REDIRECT_URI` - RSO OAuth callback URL

**Optional env vars:**
- `ROFL_UPLOAD_DIR` - .rofl file storage path (default: `./uploads/rofl`)
- `PLATFORM_URL` - Public domain (default: `https://vclol.gg`)
- `API_BASE_URL` - Internal API URL for bot→server calls (default: `http://localhost:3000`)
- `STATIC_DIR` - Compiled SPA path (default: `../vclol/dist/public`)
- `VITE_SITE_URL` - Canonical URL for OG meta tags (default: `https://vclol.gg`)
- `RESEND_API_KEY` - Email delivery (skipped if unset)
- `EMAIL_FROM` - Email sender address (default: `VCLoL <noreply@vclol.gg>`)
- `RIOT_API_KEY` - Riot Production API Key (future: Tournament API)
- `PORT` - API server port (default: `3000`)
- `NODE_ENV` - `production` enables secure cookies

**Secrets location:**
- Portainer stack environment variables (not committed to git)
- `.env.example` exists at `artifacts/discord-bot/.env.example` (template only)

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/discord/callback` - Discord OAuth2 callback
- `GET /auth/rso/callback` - Riot RSO OAuth2 callback
- `GET /auth/connect/:token` - Bot-initiated RSO flow entry point

**Outgoing:**
- Discord API (slash command registration, DM notifications, button interactions)
- Riot Auth + Account API (OAuth token exchange, account lookup)
- Data Dragon CDN (icon fetching)
- Resend API (email notifications, optional)

## Rate Limiting

**API Server** (`artifacts/api-server/src/app.ts`):
- General API: 100 requests/minute per IP (skip localhost)
- Auth endpoints (`/api/auth/*`): 20 requests/15 minutes per IP
- Bot submit cooldown: 120,000ms (2 min) between submissions per team (application-level)

---

*Integration audit: 2026-03-26*
