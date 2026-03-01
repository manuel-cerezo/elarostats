-- 008_create_game_logs.sql
-- Creates tables to cache per-game stats for players and teams,
-- fetched from PBPStats /get-game-logs endpoint.
-- Populated daily by the sync-gamelogs GitHub Action.
-- The client checks these tables first; only falls back to PBPStats
-- when no cached data is available.

-- ──────────────────────────────────────────────────────────
-- A) player_game_logs — one row per player per game
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS player_game_logs (
  entity_id       INTEGER         NOT NULL,   -- nba_id of the player
  game_id         TEXT            NOT NULL,   -- PBPStats game identifier
  season          TEXT            NOT NULL,   -- e.g. "2025-26"
  season_type     TEXT            NOT NULL,   -- e.g. "Regular Season"
  date            TEXT,                       -- e.g. "2025-01-15"
  opponent        TEXT,
  points          INTEGER,
  rebounds        INTEGER,
  assists         INTEGER,
  steals          INTEGER,
  blocks          INTEGER,
  turnovers       INTEGER,
  minutes         TEXT,                       -- raw string from API e.g. "40:59"
  fg2m            INTEGER,
  fg2a            INTEGER,
  fg3m            INTEGER,
  fg3a            INTEGER,
  ft_points       INTEGER,
  fta             INTEGER,
  efg_pct         NUMERIC,
  ts_pct          NUMERIC,
  plus_minus      NUMERIC,
  raw_data        JSONB           NOT NULL,   -- full API row for flexibility
  synced_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_id, game_id)
);

ALTER TABLE player_game_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'player_game_logs' AND policyname = 'Allow public read'
  ) THEN
    CREATE POLICY "Allow public read" ON player_game_logs FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_player_game_logs_entity_season
  ON player_game_logs (entity_id, season);

-- ──────────────────────────────────────────────────────────
-- B) team_game_logs — one row per team per game
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_game_logs (
  entity_id       INTEGER         NOT NULL,   -- team ID
  game_id         TEXT            NOT NULL,   -- PBPStats game identifier
  season          TEXT            NOT NULL,
  season_type     TEXT            NOT NULL,
  date            TEXT,
  opponent        TEXT,
  points          INTEGER,
  rebounds        INTEGER,
  assists         INTEGER,
  steals          INTEGER,
  turnovers       INTEGER,
  fg2m            INTEGER,
  fg2a            INTEGER,
  fg3m            INTEGER,
  fg3a            INTEGER,
  ft_points       INTEGER,
  fta             INTEGER,
  efg_pct         NUMERIC,
  ts_pct          NUMERIC,
  raw_data        JSONB           NOT NULL,
  synced_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  PRIMARY KEY (entity_id, game_id)
);

ALTER TABLE team_game_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'team_game_logs' AND policyname = 'Allow public read'
  ) THEN
    CREATE POLICY "Allow public read" ON team_game_logs FOR SELECT USING (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_team_game_logs_entity_season
  ON team_game_logs (entity_id, season);
