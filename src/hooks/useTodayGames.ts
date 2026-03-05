import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLatestCompletedGames, type CompletedGame } from "../api/completedGames";
import { useLiveGamesData, type ParsedLiveGame } from "./useLiveGamesData";

/**
 * Convert a Supabase CompletedGame into the ParsedLiveGame shape used by the UI.
 */
export function completedToParsed(game: CompletedGame): ParsedLiveGame {
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
 * Strategy:
 * 1. Always check PBPStats for live/upcoming games.
 * 2. Fetch the latest completed games from Supabase (our own DB).
 * 3. If PBPStats has live or upcoming games for today, prefer those.
 * 4. If PBPStats returns nothing (no games today / API rolled over),
 *    show the latest completed games from Supabase regardless of date.
 * 5. If Supabase games match today AND PBPStats has games, merge them
 *    (PBPStats for live/upcoming, Supabase for already-final).
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

  // Check PBPStats for live/upcoming games
  const {
    data: pbpGames,
    isLoading: pbpLoading,
    isError: pbpError,
  } = useLiveGamesData(true);

  const todayET = getTodayET();
  const hasSupabaseGames =
    supabaseFetched && !supabaseError && completedGames != null && completedGames.length > 0;
  const supabaseGamesAreToday = hasSupabaseGames && completedGames[0]?.game_date === todayET;

  // PBPStats has meaningful data when it returns games (live, upcoming, or final)
  const pbpHasGames = pbpGames != null && pbpGames.length > 0;
  const pbpHasLiveOrUpcoming = pbpHasGames && pbpGames.some((g) => !g.isFinal);

  // Derive final game list
  let games: ParsedLiveGame[] | undefined;

  if (pbpHasLiveOrUpcoming) {
    // PBPStats has active/upcoming games today — use PBPStats as primary
    // Merge with Supabase completed games if they're from today
    // (handles mid-day: some games final in Supabase, others still live in PBPStats)
    if (supabaseGamesAreToday) {
      const pbpIds = new Set(pbpGames.map((g) => g.gameId));
      const supabaseOnly = completedGames
        .filter((g) => !pbpIds.has(g.game_id))
        .map(completedToParsed);
      games = [...pbpGames, ...supabaseOnly];
    } else {
      games = pbpGames;
    }
  } else if (pbpHasGames && pbpGames.every((g) => g.isFinal)) {
    // PBPStats has all games as final — use PBPStats (still today's games)
    games = pbpGames;
  } else if (hasSupabaseGames) {
    // PBPStats returned empty or errored — show latest Supabase games
    // regardless of date (yesterday's completed games are better than nothing)
    games = completedGames.map(completedToParsed);
  } else {
    games = pbpGames; // will be undefined or empty
  }

  const isLoading = !supabaseFetched || pbpLoading;
  const isError = supabaseError && pbpError;

  return { data: games, isLoading, isError, gameDate: hasSupabaseGames ? completedGames[0]?.game_date : undefined };
}
