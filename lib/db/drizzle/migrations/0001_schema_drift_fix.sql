-- Migration: Fix schema drift (Issue #32)
-- Adds three columns that exist in Drizzle schema but were missing from DB.
-- Safe to run multiple times (IF NOT EXISTS).

ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS last_match_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS default_match_visibility TEXT DEFAULT 'participants';

-- Verify
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='team_members' AND column_name='last_active_at'
  ), 'team_members.last_active_at missing';
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='teams' AND column_name='last_match_at'
  ), 'teams.last_match_at missing';
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='teams' AND column_name='default_match_visibility'
  ), 'teams.default_match_visibility missing';
  RAISE NOTICE 'Schema drift fix: all 3 columns present ✅';
END $$;
