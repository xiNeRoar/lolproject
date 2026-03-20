/**
 * Startup migrations — runs on every server start.
 *
 * Uses IF NOT EXISTS so it is safe to run repeatedly.
 * This handles schema drift between Drizzle schema definitions and
 * the actual PostgreSQL database (Issue #32).
 */

import { pool } from "@workspace/db";

export async function runStartupMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log("[migration] Running startup migrations...");

    await client.query(`
      ALTER TABLE team_members
        ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;

      ALTER TABLE teams
        ADD COLUMN IF NOT EXISTS last_match_at TIMESTAMPTZ DEFAULT NULL;

      ALTER TABLE teams
        ADD COLUMN IF NOT EXISTS default_match_visibility TEXT DEFAULT 'participants';
    `);

    // Verify all columns exist
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='team_members' AND column_name='last_active_at') AS has_last_active_at,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='teams' AND column_name='last_match_at') AS has_last_match_at,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='teams' AND column_name='default_match_visibility') AS has_default_visibility
    `);

    const row = result.rows[0];
    const allPresent =
      Number(row.has_last_active_at) > 0 &&
      Number(row.has_last_match_at) > 0 &&
      Number(row.has_default_visibility) > 0;

    if (allPresent) {
      console.log("[migration] ✅ All schema columns verified");
    } else {
      console.error("[migration] ❌ Some columns still missing after migration:", row);
    }
  } catch (err) {
    console.error("[migration] ❌ Startup migration failed:", err);
    // Do not crash the server — log and continue
  } finally {
    client.release();
  }
}
