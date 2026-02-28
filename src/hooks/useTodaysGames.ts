import { useQuery } from "@tanstack/react-query";
import { fetchTodaysGames, parseTodaysGames } from "../api/games";
import type { ParsedGame } from "../types/games";

export const TODAYS_GAMES_QUERY_KEY = ["todays-games"] as const;

const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useTodaysGames({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery<ParsedGame[]>({
    queryKey: TODAYS_GAMES_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const response = await fetchTodaysGames();
      return parseTodaysGames(response);
    },
    // When all games are final, cache forever — no need to ever refetch
    staleTime: (query) => {
      const data = query.state.data as ParsedGame[] | undefined;
      if (data?.length && data.every((g) => g.isFinal)) return Infinity;
      return REFETCH_INTERVAL;
    },
    refetchInterval: (query) => {
      const data = query.state.data as ParsedGame[] | undefined;
      // Stop polling once all games of the day are finished
      if (data?.length && data.every((g) => g.isFinal)) return false;
      return REFETCH_INTERVAL;
    },
  });
}
