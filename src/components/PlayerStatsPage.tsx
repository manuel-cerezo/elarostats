import type { Player } from "../types/player";
import { formatPlayerStats } from "../utils/playerStats";
import { useTranslation } from "../hooks/useTranslation";
import { useTeamRecord } from "../hooks/useTeamRecord";

interface PlayerStatsPageProps {
  player: Player;
}

function ValueColor({ value, format = "decimal" }: { value: number | undefined; format?: "decimal" | "signed" }) {
  if (value === undefined || value === null) return <span>—</span>;
  const formatted = format === "signed"
    ? `${value >= 0 ? "+" : ""}${value.toFixed(1)}`
    : value.toFixed(1);
  const color =
    value > 0
      ? "text-green-500 dark:text-green-400"
      : value < 0
        ? "text-red-400 dark:text-red-400"
        : "text-gray-900 dark:text-white";
  return <span className={color}>{formatted}</span>;
}

export default function PlayerStatsPage({ player }: PlayerStatsPageProps) {
  const stats = formatPlayerStats(player);
  const { t } = useTranslation();
  const { data: teamRecord } = useTeamRecord(player.TeamAbbreviation);

  const gp = player.GamesPlayed;
  const teamGp = teamRecord?.totalGames ?? null;
  const gpPct = teamGp && teamGp > 0 ? (gp / teamGp) * 100 : null;

  return (
    <>
      {/* ── Top overview row ── */}
      <div className="mt-8 grid grid-cols-3 gap-3">
        {/* Games Played */}
        <div className="flex flex-col justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("games")}
          </span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
              {gp}
            </span>
            {teamGp !== null && (
              <span className="text-xs font-medium tabular-nums text-gray-400 dark:text-gray-500">
                / {teamGp}
              </span>
            )}
          </div>
          {gpPct !== null && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-orange-400 transition-all"
                style={{ width: `${Math.min(gpPct, 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* MPG */}
        <div className="flex flex-col justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            MPG
          </span>
          <span className="mt-1 text-xl font-black tabular-nums text-gray-900 dark:text-white">
            {player.MPG?.toFixed(1) ?? "—"}
          </span>
        </div>

        {/* TS% */}
        <div className="flex flex-col justify-between rounded-xl bg-gray-100 px-4 py-3 dark:bg-gray-800">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            TS%
          </span>
          <span className="mt-1 text-xl font-black tabular-nums text-gray-900 dark:text-white">
            {stats.tsPct}
          </span>
        </div>
      </div>

      {/* ── Impact + Scoring: side-by-side on desktop ── */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Impact */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60">
          <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("impact")}
            </span>
          </div>
          <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-medium uppercase text-gray-400">DPM</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                <ValueColor value={player.dpm} format="signed" />
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-medium uppercase text-gray-400">O-DPM</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                <ValueColor value={player.o_dpm} format="signed" />
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 text-center dark:border-gray-700">
              <p className="text-[10px] font-medium uppercase text-gray-400">D-DPM</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                <ValueColor value={player.d_dpm} format="signed" />
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 text-center dark:border-gray-700">
              <p className="text-[10px] font-medium uppercase text-gray-400">3yr RAPM</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums">
                <ValueColor value={player.three_year_rapm} format="signed" />
              </p>
            </div>
          </div>
        </div>

        {/* Scoring */}
        <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60">
          <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-700">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              {t("scoring")}
            </span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-medium uppercase text-gray-400">Pts/75</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                {stats.pts75}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-medium uppercase text-gray-400">3P%</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                {stats.threePct}
              </p>
            </div>
            <div className="px-4 py-3 text-center">
              <p className="text-[10px] font-medium uppercase text-gray-400">FT%</p>
              <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900 dark:text-white">
                {stats.ftPct}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
