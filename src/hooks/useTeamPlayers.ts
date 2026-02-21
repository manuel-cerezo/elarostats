import { useQuery } from "@tanstack/react-query";
import { fetchPlayersByTeam } from "../api/local";
import { PLAYERS_QUERY_KEY } from "./useAllPlayers";

/**
 * Hook para obtener los jugadores de un equipo concreto.
 * Reutiliza la caché de useAllPlayers (misma queryKey base) y filtra en cliente.
 */
export function useTeamPlayers(teamId: number) {
  return useQuery({
    queryKey: [...PLAYERS_QUERY_KEY, "team", teamId],
    queryFn: () => fetchPlayersByTeam(teamId),
    enabled: teamId > 0,
  });
}
