import { useMemo } from "react";
import { useSearch } from "../hooks/useSearch";
import { useClickOutside } from "../hooks/useClickOutside";
import { useTranslation } from "../hooks/useTranslation";
import { useAllPlayers } from "../hooks/useAllPlayers";
import SearchInput from "./SearchInput";
import SearchDropdown from "./SearchDropdown";
import type { Player } from "../types/player";

/** Pick the top player for a given numeric key (descending). */
function topPlayerBy(players: Player[], key: keyof Player): Player | undefined {
  let best: Player | undefined;
  let bestVal = -Infinity;
  for (const p of players) {
    const v = p[key];
    if (typeof v === "number" && v > bestVal) {
      bestVal = v;
      best = p;
    }
  }
  return best;
}

interface StatBadgeProps {
  label: string;
  playerName: string;
  value: string;
  playerId: number;
}

function StatBadge({ label, playerName, value, playerId }: StatBadgeProps) {
  return (
    <a
      href={`/players/${playerId}`}
      className="flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-xs transition hover:border-orange-400 dark:border-gray-700 dark:bg-gray-800/80 dark:hover:border-orange-500"
    >
      <span className="font-medium text-gray-400 dark:text-gray-500">{label}</span>
      <span className="font-semibold text-gray-700 dark:text-gray-200">{playerName}</span>
      <span className="font-bold tabular-nums text-orange-500">{value}</span>
    </a>
  );
}

export default function Hero() {
  const {
    query,
    results,
    isOpen,
    activeIndex,
    handleQueryChange,
    handleSubmit,
    handleSelect,
    handleCloseDropdown,
    handleKeyDown,
    setActiveIndex,
  } = useSearch();

  const containerRef = useClickOutside<HTMLDivElement>(handleCloseDropdown);
  const { t } = useTranslation();
  const { data: allPlayers } = useAllPlayers();

  const statLeaders = useMemo(() => {
    if (!allPlayers?.length) return null;
    // Filter to players with meaningful minutes (>= 20 MPG, >= 20 GP)
    const qualified = allPlayers.filter((p) => p.MPG >= 20 && p.GamesPlayed >= 20);
    if (qualified.length === 0) return null;

    const topPpg = topPlayerBy(qualified, "Pts75");
    const topDpm = topPlayerBy(qualified, "dpm");
    const topTs = topPlayerBy(qualified, "TS_pct");

    return { topPpg, topDpm, topTs };
  }, [allPlayers]);

  return (
    <section className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
        elaro<span className="text-orange-500">stats</span>
      </h1>
      <p className="max-w-xl text-lg text-gray-500 dark:text-gray-400">{t("heroSubtitle")}</p>

      {/* Stat leaders spotlight */}
      {statLeaders && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {statLeaders.topPpg && (
            <StatBadge
              label={t("heroLeaderPpg")}
              playerName={statLeaders.topPpg.ShortName || statLeaders.topPpg.Name}
              value={String(statLeaders.topPpg.Pts75)}
              playerId={statLeaders.topPpg.nba_id}
            />
          )}
          {statLeaders.topDpm && (
            <StatBadge
              label="DPM"
              playerName={statLeaders.topDpm.ShortName || statLeaders.topDpm.Name}
              value={String(statLeaders.topDpm.dpm)}
              playerId={statLeaders.topDpm.nba_id}
            />
          )}
          {statLeaders.topTs && (
            <StatBadge
              label="TS%"
              playerName={statLeaders.topTs.ShortName || statLeaders.topTs.Name}
              value={`${(statLeaders.topTs.TS_pct * 100).toFixed(1)}%`}
              playerId={statLeaders.topTs.nba_id}
            />
          )}
        </div>
      )}

      <div className="relative mt-4 w-full max-w-md" ref={containerRef}>
        <SearchInput
          query={query}
          onChange={handleQueryChange}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
        />
        {isOpen && (
          <SearchDropdown
            results={results}
            activeIndex={activeIndex}
            onSelect={handleSelect}
            onHover={setActiveIndex}
          />
        )}
      </div>

      {/* Quick navigation links */}
      <nav className="flex items-center gap-3">
        <a
          href="/games"
          className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:border-orange-400 hover:text-orange-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-orange-500 dark:hover:text-orange-400"
        >
          {t("navGames")}
        </a>
        <a
          href="/teams"
          className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:border-orange-400 hover:text-orange-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-orange-500 dark:hover:text-orange-400"
        >
          {t("navTeams")}
        </a>
        <a
          href="/players"
          className="rounded-full border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 transition hover:border-orange-400 hover:text-orange-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-orange-500 dark:hover:text-orange-400"
        >
          {t("navPlayers")}
        </a>
      </nav>
    </section>
  );
}
