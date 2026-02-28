-- Migration: Create game_stats table
-- Caches completed NBA game data (team box score, player box score, game flow)
-- fetched from PBPStats. Populated nightly by the sync-games GitHub Action.
-- The client checks this table first; only falls back to PBPStats for live games.

CREATE TABLE IF NOT EXISTS game_stats (
  -- PBPStats game identifier (e.g. "0022400001")
  game_id          TEXT PRIMARY KEY,

  -- Participants and final score
  home_team_abbr   TEXT    NOT NULL,
  away_team_abbr   TEXT    NOT NULL,
  home_score       INTEGER,
  away_score       INTEGER,

  -- Raw PBPStats API responses for each result type
  -- Shape mirrors LiveGameResponse { status, game_data }
  team_data        JSONB   NOT NULL,
  player_data      JSONB   NOT NULL,
  game_flow_data   JSONB   NOT NULL,

  -- Housekeeping
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security with public read access
-- (game data is public information)
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
  ON game_stats
  FOR SELECT
  USING (true);
