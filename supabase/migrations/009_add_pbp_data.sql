-- Migration: Add pbp_data column to game_stats
-- Stores cached Play-by-Play (possession-by-possession) data alongside
-- the existing team_data, player_data, and game_flow_data columns.
-- Nullable because existing rows won't have PBP until re-synced.

ALTER TABLE game_stats
  ADD COLUMN IF NOT EXISTS pbp_data JSONB;
