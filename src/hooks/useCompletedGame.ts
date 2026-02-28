import { useQuery } from "@tanstack/react-query";
import { fetchCompletedGame } from "../api/completedGames";
import type { CompletedGame } from "../api/completedGames";

/**
 * Looks up a completed game in Supabase before falling back to PBPStats.
 * Data is cached indefinitely — completed game data never changes.
 */
export function useCompletedGame(gameId: string) {
  return useQuery<CompletedGame | null>({
    queryKey: ["completed-game", gameId],
    queryFn: () => fetchCompletedGame(gameId),
    staleTime: Infinity,
    gcTime: Infinity,
    enabled: Boolean(gameId),
  });
}
