import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLatestCompletedGames, type CompletedGame } from "../api/completedGames";
import { useLiveGamesData, type ParsedLiveGame } from "./useLiveGamesData";

/**
 * Convert a Supabase CompletedGame into the ParsedLiveGame shape used by the UI.
 */
function completedToParsed(game: CompletedGame): ParsedLiveGame {
  return {
    gameId: game.game_id,
    time: "Final",
    homeAbbr: game.home_team_abbr,
    homeScore: game.home_score ?? 0,
    awayAbbr: game.away_team_abbr,
    awayScore: game.away_score ?? 0,
    isLive: false,
    isFinal: true,
    isPregame: false,
  };
}

/**
 * Returns today's date in YYYY-MM-DD format in US Eastern time (NBA's timezone).
 */
function getTodayET(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

/**
 * Supabase-first hook for the games page.
 *
 * 1. Fetches the latest completed games from Supabase (fast, our own DB).
 * 2. If Supabase has games **for today**, uses them and skips PBPStats.
 * 3. Otherwise (games are from a previous day, or no games), falls back to PBPStats.
 *
 * Also pre-seeds the TanStack Query cache for each completed game so that
 * individual GameCard `useCompletedGame` calls get instant cache hits.
 */
export function useTodayGames() {
  const queryClient = useQueryClient();

  const {
    data: completedGames,
    isFetched: supabaseFetched,
    isError: supabaseError,
  } = useQuery<CompletedGame[]>({
    queryKey: ["today-completed-games"],
    queryFn: async () => {
      const games = await fetchLatestCompletedGames();

      // Pre-seed individual game caches so GameCard doesn't re-fetch from Supabase
      for (const game of games) {
        queryClient.setQueryData(["completed-game", game.game_id], game);
      }

      return games;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Only use Supabase games if they match today's date (ET)
  const todayET = getTodayET();
  const hasSupabaseGamesForToday =
    supabaseFetched &&
    !supabaseError &&
    completedGames != null &&
    completedGames.length > 0 &&
    completedGames[0]?.game_date === todayET;

  // Fall back to PBPStats if Supabase has no games for today
  const {
    data: pbpGames,
    isLoading: pbpLoading,
    isError: pbpError,
  } = useLiveGamesData(supabaseFetched && !hasSupabaseGamesForToday);

  // Derive final game list
  const games: ParsedLiveGame[] | undefined = hasSupabaseGamesForToday
    ? completedGames.map(completedToParsed)
    : pbpGames;

  const isLoading = !supabaseFetched || (!hasSupabaseGamesForToday && pbpLoading);
  const isError = supabaseError && pbpError;

  return { data: games, isLoading, isError };
}
