import type { Player } from "../types/player";
import { formatPlayerStats } from "../utils/playerStats";
import { useTranslation } from "../hooks/useTranslation";
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

  return (
    <>
      <div className="mt-10 grid grid-cols-3 gap-3">
        <StatCell label={t("games")} value={player.GamesPlayed} />
        <StatCell label="MPG" value={player.MPG?.toFixed(1)} />
        <StatCell label="TS%" value={stats.tsPct} />
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-gray-500">
        {t("impact")}
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCell label="DPM" value={stats.dpm} />
        <StatCell label="O-DPM" value={stats.oDpm} />
        <StatCell label="D-DPM" value={stats.dDpm} />
        <StatCell label="3yr RAPM" value={stats.rapm} />
      </div>

      <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-widest text-gray-500">
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
