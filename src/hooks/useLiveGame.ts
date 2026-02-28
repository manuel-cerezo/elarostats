import { useQuery } from "@tanstack/react-query";
import { fetchLiveGame } from "../api/games";
import type { LiveGameResponse, LiveResultType } from "../types/games";

const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useLiveGame(
  gameId: string,
  resultType: LiveResultType,
  isFinal = false,
  options: { enabled?: boolean } = {},
) {
  const enabled = options.enabled !== undefined ? options.enabled : Boolean(gameId);
  return useQuery<LiveGameResponse>({
    queryKey: ["live-game", gameId, resultType],
    queryFn: () => fetchLiveGame(gameId, resultType),
    // Keep data in cache forever — prevents GC during navigation (even before isFinal is known)
    gcTime: Infinity,
    // When the game is over, mark stale immediately and stop polling
    staleTime: isFinal ? Infinity : REFETCH_INTERVAL,
    refetchInterval: isFinal ? false : REFETCH_INTERVAL,
    enabled,
  });
}
