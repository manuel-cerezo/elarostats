import { supabase } from "../lib/supabase";
import type { LiveGameResponse } from "../types/games";

export interface CompletedGame {
  game_id: string;
  home_team_abbr: string;
  away_team_abbr: string;
  home_score: number | null;
  away_score: number | null;
  team_data: LiveGameResponse;
  player_data: LiveGameResponse;
  game_flow_data: LiveGameResponse;
  synced_at: string;
}

/**
 * Fetches a completed game from Supabase cache.
 * Returns null if the game hasn't been synced yet (live or very recent game).
 */
export async function fetchCompletedGame(gameId: string): Promise<CompletedGame | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("game_stats")
    .select("*")
    .eq("game_id", gameId)
    .single();

  if (error || !data) return null;

  return data as CompletedGame;
}
