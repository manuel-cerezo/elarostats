import { useQuery } from "@tanstack/react-query";
import teamsData from "../data/teams.json";
import { useTranslation } from "../hooks/useTranslation";
import {
  useLiveGamesData,
  type ParsedLiveGame,
} from "../hooks/useLiveGamesData";

const PBPSTATS_BASE = "https://api.pbpstats.com";

// --- Types (game detail) ---

interface GameInfo {
  home_score: number;
  home_team: string;
  visitor_score: number;
  visitor_team: string;
  status: string;
  clock: string;
  home_win_probability?: number;
  visitor_win_probability?: number;
}

interface TeamStatRow {
  stat: string;
  home: number | string;
  visitor: number | string;
}

interface GameDetail {
  game_data: {
    rows: TeamStatRow[];
    game_info: GameInfo;
    headers: { field: string; label: string }[];
  };
  status: string;
}

// --- Helpers ---

const abbrToTeamId = new Map(teamsData.map((t) => [t.abbreviation, t.teamId]));
const teamByAbbr = new Map(teamsData.map((t) => [t.abbreviation, t]));

function getStatValue(
  rows: TeamStatRow[],
  stat: string,
  side: "home" | "visitor",
): string | number | undefined {
  const row = rows.find((r) => r.stat === stat);
  return row ? row[side] : undefined;
}

// Key stats we display
const DISPLAY_STATS = [
  "Points",
  "eFG%",
  "TS%",
  "3pt FG%",
  "FT%",
  "Offensive Rating",
  "Possessions",
  "Assist Points",
  "Second Chance Points",
  "Penalty Points",
] as const;

function formatStatValue(value: string | number | undefined): string {
  if (value === undefined) return "—";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(1);
  }
  return String(value);
}

// --- Detail hook (per-game) ---

const DETAIL_REFETCH = 30_000;

function useGameDetail(gameId: string, enabled: boolean) {
  return useQuery<GameDetail | null>({
    queryKey: ["game-detail", gameId],
    queryFn: async () => {
      const res = await fetch(`${PBPSTATS_BASE}/live/game/${gameId}/team`, {
        referrerPolicy: "no-referrer",
      });
      if (!res.ok) return null;
      return (await res.json()) as GameDetail;
    },
    staleTime: DETAIL_REFETCH,
    refetchInterval: enabled ? DETAIL_REFETCH : false,
    enabled,
  });
}

// --- Components ---

function StatRow({ label, home, away }: { label: string; home: string; away: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 py-1">
      <span className="text-right text-sm tabular-nums text-gray-600 dark:text-gray-300">{away}</span>
      <span className="min-w-[120px] text-center text-xs text-gray-500">{label}</span>
      <span className="text-left text-sm tabular-nums text-gray-600 dark:text-gray-300">{home}</span>
    </div>
  );
}

function GameCard({ game, t }: { game: ParsedLiveGame; t: ReturnType<typeof useTranslation>["t"] }) {
  const hasStarted = game.homeScore > 0 || game.awayScore > 0;
  const homeWins = hasStarted && game.homeScore > game.awayScore;
  const awayWins = hasStarted && game.awayScore > game.homeScore;

  const homeTeam = teamByAbbr.get(game.homeAbbr);
  const awayTeam = teamByAbbr.get(game.awayAbbr);
  const homeId = abbrToTeamId.get(game.homeAbbr);
  const awayId = abbrToTeamId.get(game.awayAbbr);

  // Fetch detail only for started games
  const { data: detail, isLoading: detailLoading } = useGameDetail(
    game.gameId,
    hasStarted,
  );

  const rows = detail?.game_data?.rows ?? [];
  const gameInfo = detail?.game_data?.game_info;

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        game.isLive
          ? "border-red-500/20 bg-white dark:bg-gray-900"
          : "border-gray-200 bg-white dark:border-gray-700/50 dark:bg-gray-900"
      }`}
    >
      {/* Header with status */}
      <a
        href={`/games/live?id=${game.gameId}`}
        className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5 transition-colors hover:bg-gray-50 dark:border-gray-800/60 dark:hover:bg-gray-800/40"
      >
        <div className="flex items-center gap-2">
          {game.isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              {game.time}
            </span>
          )}
          {game.isFinal && (
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/5 dark:text-gray-400">
              Final
            </span>
          )}
          {!game.isLive && !game.isFinal && (
            <span className="text-sm font-semibold text-orange-400">{game.time}</span>
          )}
        </div>
        {gameInfo && gameInfo.home_win_probability != null && (
          <span className="text-xs text-gray-600">
            WP: {gameInfo.home_win_probability}% – {gameInfo.visitor_win_probability}%
          </span>
        )}
      </a>

      {/* Scoreboard */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4">
          {/* Away team */}
          <a
            href={awayId ? `/teams/${awayId}` : "#"}
            className={`flex items-center justify-end gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/40 ${hasStarted && !awayWins ? "opacity-50" : ""}`}
          >
            <div className="text-right">
              <div className={`font-semibold ${awayWins ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
                {awayTeam?.teamName ?? game.awayAbbr}
              </div>
              <div className="text-xs text-gray-500">{t("away")}</div>
            </div>
            {awayId && (
              <img
                src={`/teams/${awayId}.svg`}
                alt={game.awayAbbr}
                className="h-10 w-10 flex-shrink-0 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
          </a>

          {/* Score */}
          {hasStarted ? (
            <div className="text-center">
              <span className="text-3xl font-bold tabular-nums text-gray-900 dark:text-white">
                {game.awayScore}
                <span className="mx-2 text-lg text-gray-400 dark:text-gray-600">–</span>
                {game.homeScore}
              </span>
            </div>
          ) : (
            <span className="text-center text-sm text-gray-500">vs</span>
          )}

          {/* Home team */}
          <a
            href={homeId ? `/teams/${homeId}` : "#"}
            className={`flex items-center justify-start gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/40 ${hasStarted && !homeWins ? "opacity-50" : ""}`}
          >
            {homeId && (
              <img
                src={`/teams/${homeId}.svg`}
                alt={game.homeAbbr}
                className="h-10 w-10 flex-shrink-0 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <div>
              <div className={`font-semibold ${homeWins ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-300"}`}>
                {homeTeam?.teamName ?? game.homeAbbr}
              </div>
              <div className="text-xs text-gray-500">{t("home")}</div>
            </div>
          </a>
        </div>
      </div>

      {/* Team stats comparison */}
      {hasStarted && rows.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800/40">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-600">
            {t("teamStats")}
          </p>
          <div className="divide-y divide-gray-100 dark:divide-gray-800/30">
            {DISPLAY_STATS.map((statName) => {
              const home = getStatValue(rows, statName, "home");
              const away = getStatValue(rows, statName, "visitor");
              if (home === undefined && away === undefined) return null;
              return (
                <StatRow
                  key={statName}
                  label={statName}
                  home={formatStatValue(home)}
                  away={formatStatValue(away)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Loading skeleton for stats */}
      {hasStarted && rows.length === 0 && detailLoading && (
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800/40">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-600">
            {t("teamStats")}
          </p>
          <div className="space-y-2">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-4 py-1">
                <div className="ml-auto h-3.5 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-800/60" />
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200 dark:bg-gray-800/40" />
                <div className="h-3.5 w-10 animate-pulse rounded bg-gray-200 dark:bg-gray-800/60" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export default function GamesView() {
  const { t, locale } = useTranslation();

  // Shared hook — same cache key as LiveScores, no duplicate requests
  const { data: games, isLoading, isError } = useLiveGamesData();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800/40" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700/50 dark:bg-gray-900">
        {t("errorLoadingGames")}
      </div>
    );
  }

  if (!games || games.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700/50 dark:bg-gray-900">
        {t("noGamesToday")}
      </div>
    );
  }

  const today = new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const liveGames = games.filter((g) => g.isLive);
  const pregameGames = games.filter((g) => g.isPregame);
  const finalGames = games.filter((g) => g.isFinal);

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("gamesPageTitle")}</h1>
          <p className="mt-0.5 text-sm capitalize text-gray-500">{today}</p>
        </div>
      </div>

      {liveGames.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {t("live")}
          </p>
          <div className="space-y-4">
            {liveGames.map((game) => (
              <GameCard key={game.gameId} game={game} t={t} />
            ))}
          </div>
        </div>
      )}

      {pregameGames.length > 0 && (
        <div className="mb-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t("upcoming")}
          </p>
          <div className="space-y-4">
            {pregameGames.map((game) => (
              <GameCard key={game.gameId} game={game} t={t} />
            ))}
          </div>
        </div>
      )}

      {finalGames.length > 0 && (
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {t("finished")}
          </p>
          <div className="space-y-4">
            {finalGames.map((game) => (
              <GameCard key={game.gameId} game={game} t={t} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
