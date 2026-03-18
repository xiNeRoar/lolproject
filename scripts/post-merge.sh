#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
pnpm install --frozen-lockfile

echo "[post-merge] Pushing database schema..."
pnpm --filter @workspace/db run push

echo "[post-merge] Running codegen..."
pnpm --filter @workspace/api-spec run codegen

echo "[post-merge] Seeding database (full reset to match git)..."
pnpm --filter @workspace/scripts run seed

echo "[post-merge] Done. DB synced to git seed."
