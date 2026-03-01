export interface GameItem {
  gameid: string;
  time: string;
  home: string;
  away: string;
}

export interface TodaysGamesResponse {
  live_games: number;
  game_data: GameItem[];
}

export interface ParsedGame {
  gameid: string;
  time: string;
  homeTeam: string;
  homeScore: number;
  awayTeam: string;
  awayScore: number;
  isLive: boolean;
  isFinal: boolean;
}

export interface LiveGameResponse {
  status: string;
  game_data: Record<string, unknown>;
}

export type LiveResultType =
  | "team"
  | "player"
  | "lineup"
  | "possession-start"
  | "game-flow"
  | "possession-by-possession";

// --- Game Logs ---

export type GameLogEntityType = "Player" | "Team";

export interface GameLogsResponse {
  multi_row_table_data: Record<string, unknown>[];
}

// --- Play-by-Play ---

export interface Possession {
  home_team_on_offense: boolean;
  start_type: string;
  possession_length: number;
  events: string[];
  possession_result: string | null;
  start_period: boolean;
  number: number;
  score: string;
}
