-- Migration: Create player_stats table
-- Stores NBA player statistics synced from the databallr API.
-- Key metrics are stored as typed columns for query performance.
-- The full API response is preserved as raw_data (JSONB) for flexibility.

CREATE TABLE IF NOT EXISTS player_stats (
  -- Identity
  nba_id          INTEGER PRIMARY KEY,
  name            TEXT    NOT NULL,
  short_name      TEXT,
  team_id         INTEGER,
  team_abbreviation TEXT,
  pos2            TEXT,
  year            INTEGER NOT NULL,

  -- Volume
  games_played    INTEGER,
  minutes         NUMERIC,
  mpg             NUMERIC,

  -- Shooting
  ts_pct          NUMERIC,
  three_p_perc    NUMERIC,
  ft_perc         NUMERIC,

  -- Impact / advanced
  dpm             NUMERIC,
  o_dpm           NUMERIC,
  d_dpm           NUMERIC,
  three_year_rapm NUMERIC,
  pts75           NUMERIC,

  -- Archetype
  offensive_archetype TEXT,

  -- Full response payload — keeps every field from the API
  raw_data        JSONB,

  -- Housekeeping
  synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Speed up the most common lookups
CREATE INDEX IF NOT EXISTS idx_player_stats_year      ON player_stats (year);
CREATE INDEX IF NOT EXISTS idx_player_stats_dpm       ON player_stats (dpm DESC);
CREATE INDEX IF NOT EXISTS idx_player_stats_name      ON player_stats USING gin (to_tsvector('simple', name));

-- Optional: enable Row Level Security and allow public read access
-- (safe because player stats are public information)
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
  ON player_stats
  FOR SELECT
  USING (true);
