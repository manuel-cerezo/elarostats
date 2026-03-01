-- Add win/loss column to game log tables
ALTER TABLE player_game_logs ADD COLUMN IF NOT EXISTS wl TEXT;
ALTER TABLE team_game_logs ADD COLUMN IF NOT EXISTS wl TEXT;
