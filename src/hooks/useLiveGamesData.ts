import { useQuery } from "@tanstack/react-query";

// --- Types (shared between LiveScores & GamesView) ---

export interface PbpGame {
  gameid: string;
  time: string;
  home: string; // e.g. "PHX 41"
  away: string; // e.g. "ORL 51"
}

export interface PbpGamesResponse {
  live_games: number;
  game_data: PbpGame[];
}

export interface ParsedLiveGame {
  gameId: string;
  time: string;
  homeAbbr: string;
  homeScore: number;
  awayAbbr: string;
  awayScore: number;
  isLive: boolean;
  isFinal: boolean;
  isPregame: boolean;
}

// --- Parsing ---

function parseTeamField(field: string): { abbr: string; score: number } {
  const parts = field.trim().split(" ");
  return { abbr: parts[0] ?? "", score: parseInt(parts[1] ?? "0", 10) };
}

function parseGame(g: PbpGame, hasLiveGames: boolean): ParsedLiveGame {
  const home = parseTeamField(g.home);
  const away = parseTeamField(g.away);
  const hasStarted = home.score > 0 || away.score > 0;
  // Use .trim() to handle trailing whitespace in API responses (e.g. "Final               ")
  const isFinal = g.time.trim().toLowerCase().startsWith("final");
  // Pregame times look like "6:00 pm ET" — detect by presence of am/pm
  const isScheduled = /\d:\d{2}\s*(am|pm)/i.test(g.time);
  // A game is live if pbpstats reports live games AND it hasn't ended AND isn't scheduled
  // Note: using !isScheduled (not hasStarted) so 0-0 tip-off games are correctly shown as live
  const isLive = hasLiveGames && !isFinal && !isScheduled;
  const isPregame = !hasStarted && !isFinal && !isLive;

  return {
    gameId: g.gameid,
    time: g.time.trim(),
    homeAbbr: home.abbr,
    homeScore: home.score,
    awayAbbr: away.abbr,
    awayScore: away.score,
    isLive,
    isFinal,
    isPregame,
  };
}

// --- Fetcher ---

async function fetchLiveGames(): Promise<ParsedLiveGame[]> {
  const res = await fetch("https://api.pbpstats.com/live/games/nba");
  if (!res.ok) throw new Error(`PBPStats API error: ${res.status}`);
  const data: PbpGamesResponse = await res.json();
  if (!data.game_data?.length) return [];
  return data.game_data.map((g) => parseGame(g, data.live_games > 0));
}

// --- Hook ---

const REFETCH_INTERVAL = 30_000; // 30s

/**
 * Shared hook for live NBA game data.
 * Uses TanStack Query for caching, deduplication, and background refetch.
 *
 * @param enabled — set to false to pause fetching & polling (e.g. when component is hidden)
 */
export function useLiveGamesData(enabled = true) {
  return useQuery<ParsedLiveGame[]>({
    queryKey: ["live-games-pbp"],
    queryFn: fetchLiveGames,
    staleTime: REFETCH_INTERVAL,
    refetchInterval: enabled ? REFETCH_INTERVAL : false,
    enabled,
  });
}
