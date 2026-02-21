import type { Player } from "../types/player";
import { formatPlayerStats } from "../utils/playerStats";
import { useTranslation } from "../hooks/useTranslation";
import PlayerHeader from "./PlayerHeader";
import StatCell from "./StatCell";

interface PlayerCardProps {
  player: Player;
  onClose: () => void;
}

export default function PlayerCard({ player, onClose }: PlayerCardProps) {
  const stats = formatPlayerStats(player);
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 transition hover:text-white"
          aria-label={t("closeModal")}
        >
          ✕
        </button>

        <PlayerHeader player={player} />

        <div className="mt-5 grid grid-cols-3 gap-2">
          <StatCell label={t("games")} value={player.GamesPlayed} />
          <StatCell label="MPG" value={player.MPG?.toFixed(1)} />
          <StatCell label="TS%" value={stats.tsPct} />
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
          {t("impact")}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <StatCell label="DPM" value={stats.dpm} />
          <StatCell label="O-DPM" value={stats.oDpm} />
          <StatCell label="D-DPM" value={stats.dDpm} />
          <StatCell label="3yr RAPM" value={stats.rapm} />
        </div>

        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
          {t("scoring")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <StatCell label="Pts/75" value={stats.pts75} />
          <StatCell label="3P%" value={stats.threePct} />
          <StatCell label="FT%" value={stats.ftPct} />
        </div>
      </div>
    </div>
  );
}
