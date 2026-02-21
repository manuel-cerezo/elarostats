import { useQuery } from "@tanstack/react-query";
import { fetchTodaysGames, parseTodaysGames } from "../api/games";
import type { ParsedGame } from "../types/games";

export const TODAYS_GAMES_QUERY_KEY = ["todays-games"] as const;

const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useTodaysGames() {
  return useQuery<ParsedGame[]>({
    queryKey: TODAYS_GAMES_QUERY_KEY,
    queryFn: async () => {
      const response = await fetchTodaysGames();
      return parseTodaysGames(response);
    },
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
  });
}
