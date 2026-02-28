import { useEffect, useState } from "react";
import teamsData from "../data/teams.json";
import { useLiveGamesData } from "../hooks/useLiveGamesData";
import type { ParsedLiveGame } from "../hooks/useLiveGamesData";
import { useTranslation } from "../hooks/useTranslation";

// --- Helpers ---

const teamByAbbr = new Map(teamsData.map((t) => [t.abbreviation, t]));

// --- Components ---

function TeamRow({
  abbr,
  score,
  isWinning,
  showScore,
}: {
  abbr: string;
  score: number;
  isWinning: boolean;
  showScore: boolean;
}) {
  const team = teamByAbbr.get(abbr);
  const teamId = team?.teamId;
  const teamName = team ? `${team.location} ${team.simpleName}` : abbr;

  return (
    <div
      className={`flex items-center justify-between gap-3 transition-opacity ${isWinning ? "opacity-100" : "opacity-40"}`}
    >
      <div className="flex items-center gap-2">
        {teamId && (
          <img
            src={`/teams/${teamId}.svg`}
            alt={abbr}
            className="h-6 w-6 flex-shrink-0 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <span
          className={`text-sm ${isWinning ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-500 dark:text-gray-300"}`}
        >
          {teamName}
        </span>
      </div>
      {showScore && (
        <span
          className={`text-sm tabular-nums ${isWinning ? "font-bold text-gray-900 dark:text-white" : "font-medium text-gray-400 dark:text-gray-500"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function GameCard({ game, t }: { game: ParsedLiveGame; t: ReturnType<typeof useTranslation>["t"] }) {
  const showScore = !game.isPregame;
  const tied = game.homeScore === game.awayScore;
  const homeIsWinning = game.isPregame || tied || game.homeScore > game.awayScore;
  const awayIsWinning = game.isPregame || tied || game.awayScore > game.homeScore;

  return (
    <a
      href={`/games/live?id=${game.gameId}`}
      className={`flex min-w-[215px] flex-col gap-2.5 rounded-xl border p-3 shadow-sm transition-colors hover:border-orange-500/40 ${
        game.isLive
          ? "border-red-500/30 bg-gray-50 dark:bg-[#111827]"
          : "border-gray-200 bg-gray-50 dark:border-[#374151] dark:bg-[#111827]"
      }`}
    >
      {/* Status row */}
      <div className="flex items-center justify-center gap-2">
        {game.isLive && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {game.time}
          </span>
        )}
        {game.isFinal && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-white/5 dark:text-gray-400">
            {t("finalStatus")}
          </span>
        )}
        {game.isPregame && (
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-400">
            {game.time}
          </span>
        )}
      </div>

      <TeamRow
        abbr={game.awayAbbr}
        score={game.awayScore}
        isWinning={awayIsWinning}
        showScore={showScore}
      />
      <TeamRow
        abbr={game.homeAbbr}
        score={game.homeScore}
        isWinning={homeIsWinning}
        showScore={showScore}
      />
    </a>
  );
}

// --- Main ---

export default function LiveScores() {
  // Initialise synchronously so the hook is disabled before the first render
  // on /games pages — avoids a spurious PBPStats fetch on initial mount.
  const [hidden, setHidden] = useState(() => window.location.pathname.startsWith("/games"));

  useEffect(() => {
    function checkPath() {
      setHidden(window.location.pathname.startsWith("/games"));
    }
    document.addEventListener("astro:page-load", checkPath);
    return () => document.removeEventListener("astro:page-load", checkPath);
  }, []);

  // Shared hook: pauses fetching & polling when hidden
  const { data: games, isLoading, isError } = useLiveGamesData(!hidden);
  const { t, locale } = useTranslation();

  if (hidden) return null;

  if (isLoading) {
    return (
      <div className="w-full border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-800/60 dark:bg-gray-950">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[90px] min-w-[215px] animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !games || games.length === 0) return null;

  const today = new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="w-full border-b border-gray-200 bg-gray-100 dark:border-gray-800/60 dark:bg-gray-950">
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          NBA
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-700">·</span>
        <span className="text-xs text-gray-500">{today}</span>
      </div>
      <div className="overflow-x-auto px-4 pb-3 pt-2">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {games.map((game) => (
            <GameCard key={game.gameId} game={game} t={t} />
          ))}
        </div>
      </div>
    </div>
  );
}
