import playersData from "../data/players.json";

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
  "Offensive Archetype": string;
  [key: string]: unknown;
}

const players = playersData as Player[];

export function searchPlayers(query: string): Player[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();

  return players.filter(
    (p) =>
      p.Name?.toLowerCase().includes(q) ||
      p.ShortName?.toLowerCase().includes(q) ||
      p.TeamAbbreviation?.toLowerCase().includes(q),
  );
}

export function getPlayerById(id: number): Player | undefined {
  return players.find((p) => p.nba_id === id);
}

export function getAllPlayers(): Player[] {
  return players;
}
