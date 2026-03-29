# VCLoL Deployment Guide

## Overview

VCLoL runs as two Portainer stacks plus a database backup container. All containers use `unless-stopped` restart policy.

---

## Stack 1: `vclol-web`

Contains the API server. Express serves **both** the API and the compiled Vite SPA, including OG tag injection for Discord/social link previews.

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `api-server` | `vclol-api:latest` | 3000 | Express API + SPA static serving + OG meta tags |

**Note:** The separate `vclol-frontend` container has been removed. Build the Vite SPA separately (`pnpm --filter @workspace/vclol build`), mount the output (`dist/public`) into the `api-server` container, and set `STATIC_DIR` to its path.

Both services connect to the shared PostgreSQL database via `DATABASE_URL`.

## Stack 2: `vclol-bot`

All-in-one stack: PostgreSQL + Discord Bot. No Docker build required.

| Service | Image | Notes |
|---------|-------|-------|
| `db` | `postgres:16-alpine` | Auto-creates `vclol` database, healthcheck enabled |
| `bot` | `node:22-slim` | Clones repo, installs deps, runs migration, starts bot |

**Deploy via Portainer:**

1. Stacks → **Add stack** → Name: `vclol-bot`
2. Select **Web editor** (not Repository — BuildKit not available on ARM64)
3. Paste contents of `docker-compose.bot.yml` from repo root
4. Environment variables → add **one** variable:
   - `DISCORD_BOT_TOKEN` = your bot token
5. Deploy the stack

First start takes 3-5 minutes (pull images + clone + install). Subsequent restarts ~30s (repo cached in volume).

**To update bot code:** Portainer → Containers → `vclol-bot` → Restart. The entrypoint does `git fetch + reset` on every start.

**Env vars bundled in compose (no manual setup needed):**
- `DATABASE_URL` — auto-configured to internal PostgreSQL
- `DISCORD_CLIENT_ID` — hardcoded in compose
- `PLATFORM_URL` — defaults to `https://vclol.gg`

**Logs:** Containers → `vclol-bot` → Logs icon. Expected output:
```
[setup] Cloning repo...
[setup] Installing dependencies...
[setup] Running DB migration...
[setup] Starting bot...
[bot] Logged in as VCLoL#xxxx
[bot] Registering 11 slash commands...
[bot] Slash commands registered.
[poller] Notification poller started.
[season-broadcast] Broadcaster started.
```

---

## Database Backup

A dedicated cron container runs a daily `pg_dump` to a mounted NAS volume.

### Sample docker-compose for backup container

```yaml
version: "3.8"

services:
  db-backup:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      PGHOST: ${DB_HOST}
      PGPORT: ${DB_PORT:-5432}
      PGUSER: ${DB_USER}
      PGPASSWORD: ${DB_PASSWORD}
      PGDATABASE: ${DB_NAME}
    volumes:
      - /mnt/nas/vclol-backups:/backups
    entrypoint: >
      sh -c '
        while true; do
          FILENAME="/backups/vclol_$$(date +%Y%m%d_%H%M%S).sql.gz"
          echo "[backup] Starting pg_dump -> $$FILENAME"
          pg_dump | gzip > "$$FILENAME"
          echo "[backup] Done. Pruning backups older than 30 days..."
          find /backups -name "vclol_*.sql.gz" -mtime +30 -delete
          sleep 86400
        done
      '
```

This runs `pg_dump` once every 24 hours, compresses the output with gzip, and prunes backups older than 30 days.

To restore from a backup:

```bash
gunzip -c /mnt/nas/vclol-backups/vclol_20260320_030000.sql.gz | psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

---

## Environment Variables

| Variable | Required | Default | Notes |
|----------|----------|---------|-------|
| `DATABASE_URL` | Yes | -- | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (prod) | `"vclol-dev-secret"` | Must be random in production |
| `DISCORD_CLIENT_ID` | Yes | -- | Discord OAuth app |
| `DISCORD_CLIENT_SECRET` | Yes | -- | Discord OAuth app |
| `DISCORD_REDIRECT_URI` | Yes | `http://localhost:5173/auth/discord/callback` | Must match Discord app config |
| `DISCORD_BOT_TOKEN` | Yes | -- | Discord bot token |
| `RIOT_API_KEY` | No | -- | Production API Key (apply at developer.riotgames.com). Required for RSO + Tournament API. |
| `RSO_CLIENT_ID` | Yes (launch) | -- | RSO OAuth2 client ID. Provided by Riot after Production Key approval. |
| `RSO_CLIENT_SECRET` | Yes (launch) | -- | RSO OAuth2 client secret. Keep secure. |
| `RSO_REDIRECT_URI` | Yes (launch) | -- | RSO OAuth callback URL. Must match Riot Developer Portal config. e.g. `https://vclol.gg/auth/rso/callback` |
| `ROFL_UPLOAD_DIR` | No | `./uploads/rofl` | Where .rofl files are stored |
| `PLATFORM_URL` | No | `https://vclol.gg` | Public domain for user-facing links in bot embeds and images. Must be the same domain users access the website on. |
| `API_BASE_URL` | No | `http://localhost:3000` | Internal API server address for bot→server HTTP calls (e.g. /register-event). Not user-facing. |
| `STATIC_DIR` | No | `../vclol/dist/public` | Path to compiled Vite SPA output (for consolidated serving). |
| `VITE_SITE_URL` | No | `https://vclol.gg` | Canonical base URL used in OG meta tags. Set to your production domain. |
| `RESEND_API_KEY` | No | -- | Resend API key for email notifications. If unset, email delivery is skipped. |
| `EMAIL_FROM` | No | `VCLoL <noreply@vclol.gg>` | From address for notification emails (requires verified domain in Resend). |
| `DISCORD_BOT_TOKEN` | No | -- | Bot token for Discord DM notifications. Same token as the bot stack. If unset, Discord DMs are skipped. |
| `PORT` | No | `3000` | API server port |

For the backup container, set the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` variables separately (or derive them from `DATABASE_URL`).

---

## Restart Policies

All containers across both stacks and the backup container use `restart: unless-stopped`. This ensures services come back after host reboots or crashes but stay stopped if manually stopped via Portainer.

---

## Deployment Workflow

1. Build images locally or in CI and push to your container registry.
2. In Portainer, create or update the `vclol-web` stack with the api-server and frontend services.
3. In Portainer, create `vclol-bot` stack via **Web editor** — paste `docker-compose.bot.yml` contents, add `DISCORD_BOT_TOKEN` env var, deploy.
4. Deploy the backup container as a standalone container or its own stack.
5. Verify health: `GET /healthz` should return `{"status":"ok"}`.
6. Verify bot: `GET /bot-status` should return `{"online":true,"lastSeen":"..."}` once the bot starts sending heartbeats.

---

## Notes

- Never deploy via SSH. All management is done through the Portainer UI.
- After schema changes, run `cd lib/db && pnpm run push` to apply migrations before deploying new API server images.
- The NAS volume mount path (`/mnt/nas/vclol-backups`) should be adjusted to match your actual NAS mount point.


---

## Automatic Schema Migrations

The API server runs schema migrations automatically on every startup via `artifacts/api-server/src/lib/runStartupMigrations.ts`.

This uses `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — safe to run repeatedly. No manual SQL required after deploy.

**To apply a schema change in production:** restart the API server container in Portainer. The migration runs before the server accepts any requests. Server logs confirm:
```
[migration] Running startup migrations...
[migration] ✅ All schema columns verified
```

**Columns currently managed by startup migration:**
- `team_members.last_active_at` — updated when member appears in .rofl
- `teams.last_match_at` — updated on every match submission
- `teams.default_match_visibility` — captain preference (private/participants/public)

---

## Pre-Launch Checklist

Complete every item before going live. Each checkbox must be ticked.

### Discord App Setup (one-time)

- [ ] Create application at https://discord.com/developers/applications
- [ ] Copy **Application ID** → set as `DISCORD_CLIENT_ID` env var
- [ ] Bot section → **Reset Token** → copy → set as `DISCORD_BOT_TOKEN`
- [ ] Bot section → **Privileged Gateway Intents** → enable:
  - **MESSAGE CONTENT INTENT** (required — bot reads attachment metadata)
  - **SERVER MEMBERS INTENT** (required — bot fetches user info for team management)
  - PRESENCE INTENT — not needed
- [ ] OAuth2 → Redirects → add `https://yourdomain/auth/discord/callback`
- [ ] Copy **Client Secret** → set as `DISCORD_CLIENT_SECRET`
- [ ] OAuth2 URL Generator → Scopes: `bot`, `applications.commands` → Permissions: `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Use Slash Commands`
- [ ] Copy generated invite URL → update `/register` page button (remove `disabled`)
- [ ] Set `DISCORD_REDIRECT_URI` to your production callback URL

### Riot RSO Setup (launch requirement)

**RSO backend routes are implemented** (Phase 10). Three route handlers in `artifacts/api-server/src/routes/auth.ts`:

| Route | Purpose |
|-------|---------|
| `GET /api/auth/connect/:token` | Bot `/connect` flow -- validates token, redirects to RSO |
| `GET /api/auth/rso` | Website flow -- requires session, redirects to RSO |
| `GET /api/auth/rso/callback` | Callback -- exchanges code for PUUID, updates player record |

**Sessions are stored in PostgreSQL** via `connect-pg-simple`. The `session` table is auto-created on first server start. Sessions survive Portainer redeploys.

- [ ] Register product at https://developer.riotgames.com with deployed site + ToS + Privacy Policy
- [ ] Receive Production API Key approval → set as `RIOT_API_KEY`
- [ ] Apply for RSO client (Riot contacts you after Production Key approval)
- [ ] Receive RSO client credentials → set `RSO_CLIENT_ID` and `RSO_CLIENT_SECRET`
- [ ] Configure RSO redirect URI in Riot Developer Portal → set `RSO_REDIRECT_URI` (must match `https://yourdomain/api/auth/rso/callback`)
- [ ] Verify RSO flow end-to-end: `/connect` → click link → Riot login → redirect → player record updated with PUUID
- [ ] Verify `/register-team` blocks unverified users with "Please run `/connect` first"

### Security

- [ ] `SESSION_SECRET` set to a cryptographically random string (not the dev default `vclol-admin-secret-2024`)
  - Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] `NODE_ENV=production` set in all container env vars
  - This enables `cookie.secure: true` (enforced in app.ts)
- [ ] `DISCORD_REDIRECT_URI` points to production domain (not localhost)

### Storage

- [ ] `ROFL_UPLOAD_DIR` volume is mounted and writable in Portainer stack
- [ ] Estimated storage need: ~10 MB per match × expected monthly matches
- [ ] DB backup container running with NAS volume mounted (see Database Backup section above)

### Portainer Stacks

- [ ] `vclol-web` stack deployed with all required env vars (see Environment Variables table)
- [ ] `vclol-bot` stack deployed via Web editor with `DISCORD_BOT_TOKEN` only (PostgreSQL bundled)
- [ ] All containers showing healthy in Portainer
- [ ] DB backup container running

### Verification

- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] `GET /api/bot-status` returns `{"online":true}` within 10 min of bot starting
- [ ] Admin login works at `/admin/login`
- [ ] Discord OAuth login completes end-to-end (click login → Discord → redirect back → session set)
- [ ] RSO OAuth flow completes end-to-end (`/connect` → click link → Riot login → redirect → PUUID stored)
- [ ] Bot blocks `/register-team` for unverified user → "Please run `/connect` first"
- [ ] After RSO verification: `/register-team test T123` succeeds in private test Discord server
- [ ] First `/submit` with a real `.rofl` file records match + auto-adds unknown players

### Schema Migration (before first deploy and after each schema change)

```bash
cd lib/db
# Generate migration file from current schema:
pnpm run generate

# Apply migrations to production DB:
pnpm run migrate
```

> ⚠️ Run `pnpm run migrate` (not `pnpm run push`) in production.
> `push` overwrites schema directly — no rollback possible.
> `migrate` uses versioned migration files in `drizzle/migrations/`.

---

## Schema Change Workflow (updated for Issue #29)

Old workflow (dev only): `cd lib/db && pnpm run push`
New workflow (dev + prod safe):

```bash
# 1. Edit schema file in lib/db/src/schema/
# 2. Generate migration file:
cd lib/db && pnpm run generate
# 3. Commit the generated migration file
# 4. Apply to DB:
pnpm run migrate
```
