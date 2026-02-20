import playersData from "../data/players.json";
import type { Player } from "../types/player";

export type { Player };

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
