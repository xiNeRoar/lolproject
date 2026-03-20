# VCLoL Deployment Guide

## Overview

VCLoL runs as two Portainer stacks plus a database backup container. All containers use `unless-stopped` restart policy.

---

## Stack 1: `vclol-web`

Contains the API server and the VCLoL frontend (Vite SPA).

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `api-server` | `vclol-api:latest` | 3000 | Express API |
| `vclol` | `vclol-frontend:latest` | 5173 | Vite production build served via static server |

Both services connect to the shared PostgreSQL database via `DATABASE_URL`.

## Stack 2: `vclol-bot`

Contains the Discord bot process.

| Service | Image | Port | Notes |
|---------|-------|------|-------|
| `discord-bot` | `vclol-bot:latest` | — | discord.js v14, no HTTP port |

The bot connects to the same PostgreSQL database and uses `DISCORD_BOT_TOKEN` for authentication.

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
| `RIOT_API_KEY` | No | -- | Phase 2: validates Riot ID exists |
| `ROFL_UPLOAD_DIR` | No | `./uploads/rofl` | Where .rofl files are stored |
| `PORT` | No | `3000` | API server port |

For the backup container, set the `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` variables separately (or derive them from `DATABASE_URL`).

---

## Restart Policies

All containers across both stacks and the backup container use `restart: unless-stopped`. This ensures services come back after host reboots or crashes but stay stopped if manually stopped via Portainer.

---

## Deployment Workflow

1. Build images locally or in CI and push to your container registry.
2. In Portainer, create or update the `vclol-web` stack with the api-server and frontend services.
3. In Portainer, create or update the `vclol-bot` stack with the discord-bot service.
4. Deploy the backup container as a standalone container or its own stack.
5. Verify health: `GET /healthz` should return `{"status":"ok"}`.
6. Verify bot: `GET /bot-status` should return `{"online":true,"lastSeen":"..."}` once the bot starts sending heartbeats.

---

## Notes

- Never deploy via SSH. All management is done through the Portainer UI.
- After schema changes, run `cd lib/db && pnpm run push` to apply migrations before deploying new API server images.
- The NAS volume mount path (`/mnt/nas/vclol-backups`) should be adjusted to match your actual NAS mount point.

---

## Pre-Launch Checklist

Complete every item before going live. Each checkbox must be ticked.

### Discord App Setup (one-time)

- [ ] Create application at https://discord.com/developers/applications
- [ ] Copy **Application ID** → set as `DISCORD_CLIENT_ID` env var
- [ ] Bot section → **Reset Token** → copy → set as `DISCORD_BOT_TOKEN`
- [ ] OAuth2 → Redirects → add `https://yourdomain/auth/discord/callback`
- [ ] Copy **Client Secret** → set as `DISCORD_CLIENT_SECRET`
- [ ] OAuth2 URL Generator → Scopes: `bot`, `applications.commands` → Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`
- [ ] Copy generated invite URL → update `/register` page button (remove `disabled`)
- [ ] Set `DISCORD_REDIRECT_URI` to your production callback URL

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
- [ ] `vclol-bot` stack deployed with `DISCORD_BOT_TOKEN` + `DATABASE_URL`
- [ ] All containers showing healthy in Portainer
- [ ] DB backup container running

### Verification

- [ ] `GET /api/health` returns `{"status":"ok"}`
- [ ] `GET /api/bot-status` returns `{"online":true}` within 10 min of bot starting
- [ ] Admin login works at `/admin/login`
- [ ] Discord OAuth login completes end-to-end (click login → Discord → redirect back → session set)
- [ ] Bot responds to `/register-team test T123` in a private test Discord server
- [ ] First `/submit` with a real `.rofl` file records match in DB

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
