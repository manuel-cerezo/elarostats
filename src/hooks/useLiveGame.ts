import { useQuery } from "@tanstack/react-query";
import { fetchLiveGame } from "../api/games";
import type { LiveGameResponse, LiveResultType } from "../types/games";

const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useLiveGame(gameId: string, resultType: LiveResultType, isFinal = false) {
  return useQuery<LiveGameResponse>({
    queryKey: ["live-game", gameId, resultType],
    queryFn: () => fetchLiveGame(gameId, resultType),
    // When the game is over, cache the result indefinitely — no more refetches needed
    staleTime: isFinal ? Infinity : REFETCH_INTERVAL,
    gcTime: isFinal ? Infinity : undefined,
    refetchInterval: isFinal ? false : REFETCH_INTERVAL,
    enabled: Boolean(gameId),
  });
}
