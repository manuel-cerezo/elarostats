import { useQuery } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

interface TeamRecord {
  wins: number;
  losses: number;
  totalGames: number;
}

/**
 * Fetches the W-L record for a team from pbp_team_totals.
 * Used to show "player GP / team GP" on player pages.
 */
export function useTeamRecord(teamAbbr: string | undefined) {
  return useQuery<TeamRecord | null>({
    queryKey: ["teamRecord", teamAbbr],
    queryFn: async () => {
      if (!supabase || !teamAbbr) return null;
      const { data, error } = await supabase
        .from("pbp_team_totals")
        .select("wins, losses")
        .eq("season", "2025-26")
        .eq("team_abbreviation", teamAbbr)
        .single();
      if (error || !data) return null;
      const wins = data.wins ?? 0;
      const losses = data.losses ?? 0;
      return { wins, losses, totalGames: wins + losses };
    },
    enabled: !!teamAbbr,
  });
}
