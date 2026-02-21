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
