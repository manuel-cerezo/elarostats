import { supabase } from "../lib/supabase";
import type { GameLogEntityType, GameLogsResponse } from "../types/games";

/**
 * Fetches cached game logs from Supabase.
 * Returns null if Supabase is not configured or no data exists.
 *
 * The raw_data column stores the original PBPStats API row, so we can
 * reconstruct the same GameLogsResponse format the components expect.
 */
export async function fetchCachedGameLogs(
  entityType: GameLogEntityType,
  entityId: string | number,
): Promise<GameLogsResponse | null> {
  if (!supabase) return null;

  const table = entityType === "Player" ? "player_game_logs" : "team_game_logs";

  const { data, error } = await supabase
    .from(table)
    .select("raw_data")
    .eq("entity_id", Number(entityId))
    .order("date", { ascending: false });

  if (error || !data || data.length === 0) return null;

  return {
    multi_row_table_data: data.map((row: { raw_data: Record<string, unknown> }) => row.raw_data),
  };
}
