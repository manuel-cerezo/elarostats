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
  pbp_data: LiveGameResponse | null;
  synced_at: string;
  game_date: string | null;
}

/**
 * Fetches all completed games for the most recent game date in Supabase.
 * Returns an empty array if no games are cached (e.g. games are still live).
 *
 * We query the latest `game_date` rather than hard-coding "today" because the
 * sync runs the morning after games (UTC), so the date depends on time zones.
 */
export async function fetchLatestCompletedGames(): Promise<CompletedGame[]> {
  if (!supabase) return [];

  // Get the most recent game_date
  const { data: latest, error: dateErr } = await supabase
    .from("game_stats")
    .select("game_date")
    .not("game_date", "is", null)
    .order("game_date", { ascending: false })
    .limit(1)
    .single();

  if (dateErr || !latest?.game_date) return [];

  // Fetch all games for that date
  const { data, error } = await supabase
    .from("game_stats")
    .select("*")
    .eq("game_date", latest.game_date);

  if (error || !data) return [];

  return data as CompletedGame[];
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
