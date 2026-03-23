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
        ADD COLUMN IF NOT EXISTS default_match_visibility TEXT DEFAULT 'default';

      ALTER TABLE notifications
        ADD COLUMN IF NOT EXISTS entity_id INTEGER DEFAULT NULL;

      ALTER TABLE players
        ADD COLUMN IF NOT EXISTS profile_visibility TEXT NOT NULL DEFAULT 'public';

      ALTER TABLE bot_heartbeats
        ADD COLUMN IF NOT EXISTS last_broadcast_date TEXT DEFAULT NULL;
    `);

    // Verify all columns exist
    const result = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='team_members' AND column_name='last_active_at') AS has_last_active_at,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='teams' AND column_name='last_match_at') AS has_last_match_at,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='teams' AND column_name='default_match_visibility') AS has_default_visibility,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='notifications' AND column_name='entity_id') AS has_notification_entity_id,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='players' AND column_name='profile_visibility') AS has_profile_visibility,
        (SELECT COUNT(*) FROM information_schema.columns
         WHERE table_name='bot_heartbeats' AND column_name='last_broadcast_date') AS has_last_broadcast_date
    `);

    const row = result.rows[0];
    const allPresent =
      Number(row.has_last_active_at) > 0 &&
      Number(row.has_last_match_at) > 0 &&
      Number(row.has_default_visibility) > 0 &&
      Number(row.has_notification_entity_id) > 0 &&
      Number(row.has_profile_visibility) > 0 &&
      Number(row.has_last_broadcast_date) > 0;

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
