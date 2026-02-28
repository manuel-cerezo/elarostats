-- Migration: Add game_date column to game_stats
-- Stores the actual NBA game date (YYYY-MM-DD) separately from synced_at,
-- which is the time the sync script ran (the morning after the game).

ALTER TABLE game_stats
  ADD COLUMN IF NOT EXISTS game_date TEXT;
