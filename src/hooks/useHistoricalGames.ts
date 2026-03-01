import { useQuery } from "@tanstack/react-query";
import { fetchHistoricalGameDates, fetchGamesByDate } from "../api/completedGames";
import type { CompletedGame } from "../api/completedGames";

/**
 * Fetches the list of distinct game dates available in Supabase.
 * Cached indefinitely — historical dates don't change during a session.
 */
export function useHistoricalGameDates() {
  return useQuery<string[]>({
    queryKey: ["historical-game-dates"],
    queryFn: fetchHistoricalGameDates,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

/**
 * Fetches all completed games for a specific date from Supabase.
 * Only fires when `enabled` is true (i.e., user has expanded that day).
 * Cached indefinitely — completed game data never changes.
 */
export function useGamesByDate(date: string, enabled: boolean) {
  return useQuery<CompletedGame[]>({
    queryKey: ["games-by-date", date],
    queryFn: () => fetchGamesByDate(date),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled,
  });
}
