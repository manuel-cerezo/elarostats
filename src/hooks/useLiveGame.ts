import { useQuery } from "@tanstack/react-query";
import { fetchLiveGame } from "../api/games";
import type { LiveGameResponse, LiveResultType } from "../types/games";

const REFETCH_INTERVAL = 30_000; // 30 seconds

export function useLiveGame(gameId: string, resultType: LiveResultType) {
  return useQuery<LiveGameResponse>({
    queryKey: ["live-game", gameId, resultType],
    queryFn: () => fetchLiveGame(gameId, resultType),
    staleTime: REFETCH_INTERVAL,
    refetchInterval: REFETCH_INTERVAL,
    enabled: Boolean(gameId),
  });
}
