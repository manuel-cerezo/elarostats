import type { Team } from "../lib/teams";
import { useTeamPlayers } from "../hooks/useTeamPlayers";
import { useTranslation } from "../hooks/useTranslation";
import { formatPlayerStats, getHeadshotUrl } from "../utils/playerStats";
import { PLAYER_HEADSHOT_FALLBACK_URL } from "../constants/player";
import type { Player } from "../types/player";

interface TeamRosterProps {
  team: Team;
}

function PlayerRow({ player }: { player: Player }) {
  const stats = formatPlayerStats(player);

  return (
    <a
      href={`/players/${player.nba_id}`}
      className="flex items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-4 transition hover:border-gray-200 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-gray-600 dark:hover:bg-gray-800"
    >
      <img
        src={getHeadshotUrl(player.nba_id)}
        alt={player.Name}
        className="h-14 w-14 flex-shrink-0 rounded-full border-2 border-gray-200 object-cover dark:border-gray-700"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = PLAYER_HEADSHOT_FALLBACK_URL;
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-gray-900 dark:text-white">{player.Name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{player.Pos2}</p>
        {player["Offensive Archetype"] && player["Offensive Archetype"] !== "nan" && (
          <span className="mt-0.5 inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-500 dark:text-orange-400">
            {player["Offensive Archetype"]}
          </span>
        )}
      </div>
      <div className="hidden grid-cols-4 gap-4 sm:grid">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">DPM</p>
          <p className="font-bold text-gray-900 dark:text-white">{stats.dpm}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Pts/75</p>
          <p className="font-bold text-gray-900 dark:text-white">{stats.pts75}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">TS%</p>
          <p className="font-bold text-gray-900 dark:text-white">{stats.tsPct}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">
            3yr RAPM
          </p>
          <p className="font-bold text-gray-900 dark:text-white">{stats.rapm}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">DPM</p>
          <p className="font-bold text-gray-900 dark:text-white">{stats.dpm}</p>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500">Pts/75</p>
          <p className="font-bold text-gray-900 dark:text-white">{stats.pts75}</p>
        </div>
      </div>
    </a>
  );
}

export default function TeamRoster({ team }: TeamRosterProps) {
  const { data: players, isLoading, isError } = useTeamPlayers(team.teamId);
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="mt-8 flex items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-orange-500 dark:border-gray-700" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6 text-center text-red-500 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
        {t("errorLoadingPlayers")}
      </div>
    );
  }

  if (!players?.length) {
    return (
      <div className="mt-8 rounded-lg border border-gray-200 p-6 text-center text-gray-400 dark:border-gray-800 dark:text-gray-500">
        {t("noPlayers")}
      </div>
    );
  }

  const sorted = [...players].sort((a, b) => (b.dpm ?? 0) - (a.dpm ?? 0));

  return (
    <div className="mt-8">
      <div className="mb-4 hidden grid-cols-[1fr_auto] items-center sm:grid">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("player")}
        </p>
        <div className="grid grid-cols-4 gap-4 pr-0">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            DPM
          </p>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Pts/75
          </p>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            TS%
          </p>
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            3yr RAPM
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {sorted.map((player) => (
          <PlayerRow key={player.nba_id} player={player} />
        ))}
      </div>
    </div>
  );
}
