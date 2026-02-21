import { useQuery } from "@tanstack/react-query";
import { fetchAllPlayers } from "../api/local";

export const PLAYERS_QUERY_KEY = ["players"] as const;

/**
 * Hook principal para obtener todos los jugadores desde Supabase.
 * TanStack Query se encarga del caché (5 min stale, 30 min en memoria),
 * la deduplicación de requests y los estados de carga/error.
 */
export function useAllPlayers() {
  return useQuery({
    queryKey: PLAYERS_QUERY_KEY,
    queryFn: fetchAllPlayers,
  });
}
