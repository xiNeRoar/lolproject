#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL..."
until npx tsx -e "
  import pg from 'pg';
  const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await c.connect();
  await c.end();
  console.log('connected');
" 2>/dev/null; do
  sleep 2
done
echo "[entrypoint] PostgreSQL ready."

echo "[entrypoint] Running DB migration..."
cd /app/lib/db
yes | npx drizzle-kit push 2>&1 || echo "[entrypoint] Migration may have already been applied."

echo "[entrypoint] Starting bot..."
cd /app/artifacts/discord-bot
exec npx tsx src/index.ts
