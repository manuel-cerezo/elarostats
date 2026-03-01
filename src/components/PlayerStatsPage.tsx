import type { Player } from "../types/player";
import { formatPlayerStats } from "../utils/playerStats";
import { useTranslation } from "../hooks/useTranslation";
import { useTeamRecord } from "../hooks/useTeamRecord";
import StatCell from "./StatCell";

interface PlayerStatsPageProps {
  player: Player;
}

/**
 * Bloque de estadísticas de la ficha individual del jugador.
 * Extraído a componente React para poder usar useTranslation
 * (las páginas .astro no pueden usar hooks React).
 */
export default function PlayerStatsPage({ player }: PlayerStatsPageProps) {
  const stats = formatPlayerStats(player);
  const { t } = useTranslation();
  const { data: teamRecord } = useTeamRecord(player.TeamAbbreviation);

  const gp = player.GamesPlayed;
  const teamGp = teamRecord?.totalGames ?? null;
  const gpPct = teamGp && teamGp > 0 ? (gp / teamGp) * 100 : null;

  return (
    <>
      {/* Games + Minutes row */}
      <div className="mt-10 grid grid-cols-2 gap-3">
        {/* Games Played — with team total and progress bar */}
        <div className="flex flex-col gap-2 rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("games")}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black tabular-nums text-gray-900 dark:text-white">
              {gp}
            </span>
            {teamGp !== null && (
              <span className="text-sm font-medium tabular-nums text-gray-400 dark:text-gray-500">
                / {teamGp}
              </span>
            )}
          </div>
          {gpPct !== null && (
            <div className="h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{ width: `${Math.min(gpPct, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* MPG + TS% */}
        <div className="grid grid-cols-2 gap-3">
          <StatCell label="MPG" value={player.MPG?.toFixed(1)} />
          <StatCell label="TS%" value={stats.tsPct} />
        </div>
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t("impact")}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCell label="DPM" value={stats.dpm} />
        <StatCell label="O-DPM" value={stats.oDpm} />
        <StatCell label="D-DPM" value={stats.dDpm} />
        <StatCell label="3yr RAPM" value={stats.rapm} />
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t("scoring")}
      </p>
      <div className="grid grid-cols-3 gap-3">
        <StatCell label="Pts/75" value={stats.pts75} />
        <StatCell label="3P%" value={stats.threePct} />
        <StatCell label="FT%" value={stats.ftPct} />
      </div>
    </>
  );
}
