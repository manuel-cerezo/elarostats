export interface Player {
  Name: string;
  ShortName: string;
  TeamAbbreviation: string;
  Pos2: string;
  nba_id: number;
  MPG: number;
  GamesPlayed: number;
  Minutes: number;
  TS_pct: number;
  dpm: number;
  o_dpm: number;
  d_dpm: number;
  three_year_rapm: number;
  Pts75: number;
  FT_PERC: number;
  "Offensive Archetype": string;
  "3P_PERC": number;
  TeamId?: number;
  [key: string]: unknown;
}
