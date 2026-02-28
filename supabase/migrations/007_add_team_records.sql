-- 007_add_team_records.sql
-- Adds W-L record columns to pbp_team_totals and conference/division to teams

-- ──────────────────────────────────────────────────────────
-- A) New columns on pbp_team_totals for win-loss records
-- ──────────────────────────────────────────────────────────

ALTER TABLE pbp_team_totals
  ADD COLUMN IF NOT EXISTS wins            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses          INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_pct         NUMERIC(4,3),
  ADD COLUMN IF NOT EXISTS home_wins       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS home_losses     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS away_wins       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS away_losses     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_10_wins    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_10_losses  INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak          TEXT,
  ADD COLUMN IF NOT EXISTS pace            NUMERIC;

-- ──────────────────────────────────────────────────────────
-- B) Conference & division on teams table
-- ──────────────────────────────────────────────────────────

ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS conference TEXT,
  ADD COLUMN IF NOT EXISTS division   TEXT;

-- Eastern Conference
UPDATE teams SET conference = 'East', division = 'Atlantic'   WHERE abbreviation IN ('BOS', 'BKN', 'NYK', 'PHI', 'TOR');
UPDATE teams SET conference = 'East', division = 'Central'    WHERE abbreviation IN ('CHI', 'CLE', 'DET', 'IND', 'MIL');
UPDATE teams SET conference = 'East', division = 'Southeast'  WHERE abbreviation IN ('ATL', 'CHA', 'MIA', 'ORL', 'WAS');

-- Western Conference
UPDATE teams SET conference = 'West', division = 'Northwest'  WHERE abbreviation IN ('DEN', 'MIN', 'OKC', 'POR', 'UTA');
UPDATE teams SET conference = 'West', division = 'Pacific'    WHERE abbreviation IN ('GSW', 'LAC', 'LAL', 'PHX', 'SAC');
UPDATE teams SET conference = 'West', division = 'Southwest'  WHERE abbreviation IN ('DAL', 'HOU', 'MEM', 'NOP', 'SAS');

-- ──────────────────────────────────────────────────────────
-- C) RLS on pbp_team_totals (idempotent)
-- ──────────────────────────────────────────────────────────

ALTER TABLE pbp_team_totals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pbp_team_totals' AND policyname = 'Allow public read'
  ) THEN
    CREATE POLICY "Allow public read" ON pbp_team_totals FOR SELECT USING (true);
  END IF;
END $$;

-- ──────────────────────────────────────────────────────────
-- D) Index for common query pattern
-- ──────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pbp_team_totals_season
  ON pbp_team_totals (season, season_type);
