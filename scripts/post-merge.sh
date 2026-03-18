#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[post-merge] Pushing database schema..."
pnpm --filter @workspace/db run push

echo "[post-merge] Running codegen..."
pnpm --filter @workspace/api-spec run codegen

echo "[post-merge] Checking if seed needed..."
ADMIN_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT count(*) FROM admin_users;" 2>/dev/null | tr -d ' ' || echo "0")
if [ "$ADMIN_COUNT" = "0" ]; then
  echo "[post-merge] Seeding database (first run)..."
  pnpm --filter @workspace/scripts run seed
else
  echo "[post-merge] Database already seeded, skipping."
fi

echo "[post-merge] Done."
