import type {
  LiveGameResponse,
  LiveResultType,
  ParsedGame,
  TodaysGamesResponse,
} from "../types/games";

const PBPSTATS_BASE = "https://api.pbpstats.com";

export function parseTeamField(field: string): { abbr: string; score: number } {
  const parts = field.trim().split(" ");
  return { abbr: parts[0] ?? "", score: parseInt(parts[1] ?? "0", 10) };
}

export async function fetchTodaysGames(): Promise<TodaysGamesResponse> {
  const res = await fetch(`${PBPSTATS_BASE}/live/games/nba`, {
    referrerPolicy: "no-referrer",
  });
  if (!res.ok) {
    throw new Error(`Error fetching today's games: ${res.status}`);
  }
  return res.json() as Promise<TodaysGamesResponse>;
}

export async function fetchLiveGame(
  gameId: string,
  resultType: LiveResultType,
): Promise<LiveGameResponse> {
  const res = await fetch(
    `${PBPSTATS_BASE}/live/game/${gameId}/${resultType}`,
    { referrerPolicy: "no-referrer" },
  );
  if (!res.ok) {
    throw new Error(`Error fetching live game ${gameId}: ${res.status}`);
  }
  return res.json() as Promise<LiveGameResponse>;
}

export function parseTodaysGames(
  response: TodaysGamesResponse,
): ParsedGame[] {
  return response.game_data.map((game) => {
    const home = parseTeamField(game.home);
    const away = parseTeamField(game.away);
    // A game is considered live if live_games > 0 and at least one team has scored
    const hasStarted = home.score > 0 || away.score > 0;
    return {
      gameid: game.gameid,
      time: game.time,
      homeTeam: home.abbr,
      homeScore: home.score,
      awayTeam: away.abbr,
      awayScore: away.score,
      isLive: response.live_games > 0 && hasStarted,
    };
  });
}
