import { useEffect, useState } from "react";
import teamsData from "../data/teams.json";

// --- Types ---

interface PbpGame {
  gameid: string;
  time: string;
  home: string; // e.g. "PHX 41"
  away: string; // e.g. "ORL 51"
}

interface PbpGamesResponse {
  live_games: number;
  game_data: PbpGame[];
}

interface ParsedGame {
  gameId: string;
  time: string;
  homeAbbr: string;
  homeScore: number;
  awayAbbr: string;
  awayScore: number;
  isLive: boolean;
  isFinal: boolean;
  isPregame: boolean;
}

// --- Helpers ---

const teamByAbbr = new Map(teamsData.map((t) => [t.abbreviation, t]));

function parseTeamField(field: string): { abbr: string; score: number } {
  const parts = field.trim().split(" ");
  return { abbr: parts[0] ?? "", score: parseInt(parts[1] ?? "0", 10) };
}

function parseGame(g: PbpGame, hasLiveGames: boolean): ParsedGame {
  const home = parseTeamField(g.home);
  const away = parseTeamField(g.away);
  const hasStarted = home.score > 0 || away.score > 0;
  const isFinal =
    g.time.toLowerCase() === "final" || g.time.toLowerCase().startsWith("final");
  const isLive = hasStarted && !isFinal && hasLiveGames;
  const isPregame = !hasStarted && !isFinal;

  return {
    gameId: g.gameid,
    time: g.time,
    homeAbbr: home.abbr,
    homeScore: home.score,
    awayAbbr: away.abbr,
    awayScore: away.score,
    isLive,
    isFinal,
    isPregame,
  };
}

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
          className={`text-sm ${isWinning ? "font-bold text-white" : "font-medium text-gray-300"}`}
        >
          {teamName}
        </span>
      </div>
      {showScore && (
        <span
          className={`text-sm tabular-nums ${isWinning ? "font-bold text-white" : "font-medium text-gray-500"}`}
        >
          {score}
        </span>
      )}
    </div>
  );
}

function GameCard({ game }: { game: ParsedGame }) {
  const showScore = !game.isPregame;
  const tied = game.homeScore === game.awayScore;
  const homeIsWinning = game.isPregame || tied || game.homeScore > game.awayScore;
  const awayIsWinning = game.isPregame || tied || game.awayScore > game.homeScore;

  return (
    <a
      href="/games"
      className={`flex min-w-[215px] flex-col gap-2.5 rounded-xl border p-3 shadow-sm transition-colors hover:border-orange-500/40 ${
        game.isLive
          ? "border-red-500/30 bg-[#111827]"
          : "border-[#374151] bg-[#111827]"
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
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
            Final
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
  const [games, setGames] = useState<ParsedGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hidden, setHidden] = useState(false);

  // Hide on /games page to avoid redundancy with the full games view
  useEffect(() => {
    function checkPath() {
      setHidden(window.location.pathname.startsWith("/games"));
    }
    checkPath();
    document.addEventListener("astro:page-load", checkPath);
    return () => document.removeEventListener("astro:page-load", checkPath);
  }, []);

  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch("https://api.pbpstats.com/live/games/nba");
        const data: PbpGamesResponse = await res.json();
        if (!data.game_data?.length) {
          setGames([]);
          setError(false);
          setLoading(false);
          return;
        }
        const parsed = data.game_data.map((g) => parseGame(g, data.live_games > 0));
        setGames(parsed);
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
    const interval = setInterval(fetchScores, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (hidden) return null;

  if (loading) {
    return (
      <div className="w-full border-b border-gray-800/60 bg-gray-950 px-4 py-3">
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-[90px] min-w-[215px] animate-pulse rounded-xl bg-gray-800/40"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || games.length === 0) return null;

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="w-full border-b border-gray-800/60 bg-gray-950">
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          NBA
        </span>
        <span className="text-xs text-gray-700">·</span>
        <span className="text-xs text-gray-500">{today}</span>
      </div>
      <div className="overflow-x-auto px-4 pb-3 pt-2">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {games.map((game) => (
            <GameCard key={game.gameId} game={game} />
          ))}
        </div>
      </div>
    </div>
  );
}
