import { fetchApi } from "./client";

export interface PlayerStats {
  PlayerId: number;
  PlayerName: string;
  [key: string]: unknown;
}

export interface PlayerStatsResponse {
  multi_row_table_data: PlayerStats[];
}

export function getPlayerStats(
  season: string,
  seasonType: string = "Regular Season",
): Promise<PlayerStatsResponse> {
  return fetchApi<PlayerStatsResponse>("/get-player-stats", {
    Season: season,
    SeasonType: seasonType,
  });
}
