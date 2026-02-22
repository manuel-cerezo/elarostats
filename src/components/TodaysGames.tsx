import { useTodaysGames } from "../hooks/useTodaysGames";
import { useTranslation } from "../hooks/useTranslation";
import teamsData from "../data/teams.json";
import type { ParsedGame } from "../types/games";

const abbrToTeamId = new Map<string, number>(teamsData.map((t) => [t.abbreviation, t.teamId]));

function teamLogoUrl(abbr: string): string | undefined {
  const id = abbrToTeamId.get(abbr.toUpperCase());
  return id ? `/teams/${id}.svg` : undefined;
}

interface GameCardProps {
  game: ParsedGame;
  onClick: (gameId: string) => void;
}

function GameCard({ game, onClick }: GameCardProps) {
  const homeLogo = teamLogoUrl(game.homeTeam);
  const awayLogo = teamLogoUrl(game.awayTeam);
  const hasStarted = game.homeScore > 0 || game.awayScore > 0;
  const { t } = useTranslation();

  return (
    <button
      onClick={() => onClick(game.gameid)}
      aria-label={`${game.awayTeam} at ${game.homeTeam}`}
      className="flex min-w-[250px] flex-col gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-3 text-left transition-colors hover:border-orange-500/50 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60 dark:hover:bg-gray-800"
    >
      {/* Matchup row: away | score | home */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-2">
        {/* Away — right-aligned */}
        <div className="flex items-center justify-end gap-1.5">
          {awayLogo && (
            <img
              src={awayLogo}
              alt={game.awayTeam}
              className="h-6 w-6 flex-shrink-0 object-contain"
            />
          )}
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{game.awayTeam}</span>
        </div>

        {/* Score center */}
        {hasStarted ? (
          <span className="text-center text-base font-bold tabular-nums text-gray-900 dark:text-white">
            {game.awayScore}
            <span className="mx-0.5 text-xs font-normal text-gray-500">–</span>
            {game.homeScore}
          </span>
        ) : (
          <span className="text-center text-xs text-gray-500">vs</span>
        )}

        {/* Home — left-aligned */}
        <div className="flex items-center justify-start gap-1.5">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{game.homeTeam}</span>
          {homeLogo && (
            <img
              src={homeLogo}
              alt={game.homeTeam}
              className="h-6 w-6 flex-shrink-0 object-contain"
            />
          )}
        </div>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-center">
        {game.isLive && (
          <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {t("liveTag")}
          </span>
        )}
        {!game.isLive && <span className="text-xs text-gray-500">{game.time}</span>}
      </div>
    </button>
  );
}

export default function TodaysGames() {
  const { data: games, isLoading, isError } = useTodaysGames();
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-gray-500">{t("errorLoadingGames")}</p>;
  }

  if (!games?.length) {
    return <p className="text-sm text-gray-500">{t("noGamesToday")}</p>;
  }

  const handleGameClick = (gameId: string) => {
    window.location.href = `/games?id=${gameId}`;
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game) => (
        <GameCard key={game.gameid} game={game} onClick={handleGameClick} />
      ))}
    </div>
  );
}
