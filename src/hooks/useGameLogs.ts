import { useQuery } from "@tanstack/react-query";
import { fetchCachedGameLogs } from "../api/cachedGameLogs";
import { fetchGameLogs } from "../api/games";
import type { GameLogEntityType, GameLogsResponse } from "../types/games";

/**
 * Fetches game logs with a cache-first strategy:
 * 1. Try Supabase cache (populated by sync-gamelogs script)
 * 2. Fall back to PBPStats API if no cached data
 */
async function fetchGameLogsWithCache(
  entityType: GameLogEntityType,
  entityId: string | number,
): Promise<GameLogsResponse> {
  const cached = await fetchCachedGameLogs(entityType, entityId);
  if (cached) return cached;
  return fetchGameLogs(entityType, entityId);
}

export function useGameLogs(entityType: GameLogEntityType, entityId: string | number) {
  return useQuery<GameLogsResponse>({
    queryKey: ["game-logs", entityType, String(entityId)],
    queryFn: () => fetchGameLogsWithCache(entityType, entityId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: Boolean(entityId),
  });
}
