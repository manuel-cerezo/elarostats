import { fetchApi } from "./client";

export interface TeamStats {
  TeamId: number;
  TeamName: string;
  [key: string]: unknown;
}

export interface TeamStatsResponse {
  multi_row_table_data: TeamStats[];
}

export function getTeamStats(
  season: string,
  seasonType: string = "Regular Season",
): Promise<TeamStatsResponse> {
  return fetchApi<TeamStatsResponse>("/get-team-stats", {
    Season: season,
    SeasonType: seasonType,
  });
}
