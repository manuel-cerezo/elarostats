import { supabase } from "../lib/supabase";
import type { GameLogEntityType, GameLogsResponse } from "../types/games";

/**
 * Fetches cached game logs from Supabase.
 * Returns null if Supabase is not configured or no data exists.
 *
 * Selects structured columns and maps them to PBPStats-compatible keys
 * that the PlayerGameLogs component expects.
 */
export async function fetchCachedGameLogs(
  entityType: GameLogEntityType,
  entityId: string | number,
): Promise<GameLogsResponse | null> {
  if (!supabase) return null;

  const isPlayer = entityType === "Player";
  const table = isPlayer ? "player_game_logs" : "team_game_logs";

  // team_game_logs lacks blocks, minutes, plus_minus columns
  const columns = isPlayer
    ? "game_id, date, opponent, points, rebounds, assists, steals, blocks, turnovers, minutes, fg2m, fg2a, fg3m, fg3a, ft_points, fta, efg_pct, ts_pct, plus_minus, wl"
    : "game_id, date, opponent, points, rebounds, assists, steals, turnovers, fg2m, fg2a, fg3m, fg3a, ft_points, fta, efg_pct, ts_pct, wl";

  const { data, error } = await supabase
    .from(table)
    .select(columns)
    .eq("entity_id", Number(entityId))
    .order("date", { ascending: false });

  if (error || !data || data.length === 0) return null;

  return {
    multi_row_table_data: data.map((row) => ({
      // Map to PBPStats-compatible keys expected by game log components
      Date: row.date,
      GameId: row.game_id,
      Opponent: row.opponent,
      Points: row.points,
      Rebounds: row.rebounds,
      Assists: row.assists,
      Steals: row.steals,
      Blocks: row.blocks ?? null,
      Turnovers: row.turnovers,
      Minutes: row.minutes ?? null,
      FG2M: row.fg2m,
      FG2A: row.fg2a,
      FG3M: row.fg3m,
      FG3A: row.fg3a,
      FtPoints: row.ft_points,
      FTA: row.fta,
      EfgPct: row.efg_pct,
      TsPct: row.ts_pct,
      PlusMinus: row.plus_minus ?? null,
      WL: row.wl,
    })),
  };
}
