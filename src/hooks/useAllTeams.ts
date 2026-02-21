import { useQuery } from "@tanstack/react-query";
import { getAllTeams } from "../lib/teams";

export const TEAMS_QUERY_KEY = ["teams"] as const;

/**
 * Hook para obtener todos los equipos NBA.
 * TanStack Query gestiona el caché, deduplicación y estados de carga/error.
 */
export function useAllTeams() {
  return useQuery({
    queryKey: TEAMS_QUERY_KEY,
    queryFn: getAllTeams,
  });
}
