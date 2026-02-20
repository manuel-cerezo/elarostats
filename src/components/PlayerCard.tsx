import type { Player } from "../api/local";

interface Props {
  player: Player;
  onClose: () => void;
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg bg-gray-800 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <span className="text-lg font-bold text-white">
        {value !== undefined && value !== null ? value : "—"}
      </span>
    </div>
  );
}

export default function PlayerCard({ player, onClose }: Props) {
  const headshotUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.nba_id}.png`;

  const tsPct =
    player.TS_pct !== undefined
      ? `${(player.TS_pct * 100).toFixed(1)}%`
      : "—";
  const dpm =
    player.dpm !== undefined ? player.dpm.toFixed(1) : "—";
  const odpm =
    player.o_dpm !== undefined ? `+${player.o_dpm.toFixed(1)}` : "—";
  const ddpm =
    player.d_dpm !== undefined ? player.d_dpm.toFixed(1) : "—";
  const rapm =
    player.three_year_rapm !== undefined
      ? player.three_year_rapm.toFixed(1)
      : "—";
  const pts75 =
    player.Pts75 !== undefined ? player.Pts75.toFixed(1) : "—";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 transition hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-4">
          <img
            src={headshotUrl}
            alt={player.Name}
            className="h-20 w-20 rounded-full border-2 border-gray-700 object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                "https://cdn.nba.com/headshots/nba/latest/1040x760/fallback.png";
            }}
          />
          <div>
            <h2 className="text-2xl font-extrabold text-white">
              {player.Name}
            </h2>
            <p className="text-sm text-gray-400">
              {player.TeamAbbreviation} · {player.Pos2}
            </p>
            {player["Offensive Archetype"] && (
              <span className="mt-1 inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
                {player["Offensive Archetype"]}
              </span>
            )}
          </div>
        </div>

        {/* General */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Stat label="Games" value={player.GamesPlayed} />
          <Stat label="MPG" value={player.MPG?.toFixed(1)} />
          <Stat label="TS%" value={tsPct} />
        </div>

        {/* Impact */}
        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Impact
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="DPM" value={dpm} />
          <Stat label="O-DPM" value={odpm} />
          <Stat label="D-DPM" value={ddpm} />
          <Stat label="3yr RAPM" value={rapm} />
        </div>

        {/* Scoring */}
        <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Scoring
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Pts/75" value={pts75} />
          <Stat label="3P%" value={player["3P_PERC"] !== undefined ? `${(player["3P_PERC"] as number * 100).toFixed(1)}%` : "—"} />
          <Stat label="FT%" value={player.FT_PERC !== undefined ? `${(player.FT_PERC as number * 100).toFixed(1)}%` : "—"} />
        </div>
      </div>
    </div>
  );
}
