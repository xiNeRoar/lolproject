-- Migration: SCHM-01 — Add missing columns to matches table
-- Resolves: GitHub Issue #221 (P0 — match_type column missing)
-- Safe to run multiple times (IF NOT EXISTS).

-- match_type: scrim | ranked_tournament | event
-- PRD v3.1 section 8: only ranked_tournament + event count toward ELO
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS match_type TEXT NOT NULL DEFAULT 'scrim';

-- tournament_code: Riot Tournament API code, nullable
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tournament_code TEXT;

-- Verify
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='matches' AND column_name='match_type'
  ), 'matches.match_type missing';
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='matches' AND column_name='tournament_code'
  ), 'matches.tournament_code missing';
  RAISE NOTICE 'SCHM-01 migration: match_type + tournament_code present';
END $$;
