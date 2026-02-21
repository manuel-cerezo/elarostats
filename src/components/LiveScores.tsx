import { useEffect, useState } from "react";

interface GameTeam {
  teamId: number;
  teamName: string;
  teamCity: string;
  teamTricode: string;
  wins: number;
  losses: number;
  score: number;
  periods: { period: number; score: number }[];
}

interface Game {
  gameId: string;
  gameStatus: number; // 1=pregame, 2=live, 3=final
  gameStatusText: string;
  period: number;
  gameClock: string;
  gameTimeUTC: string;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
}

interface ScoreboardData {
  scoreboard: {
    gameDate: string;
    games: Game[];
  };
}

function getLocalTime(utcTimeStr: string, timezone: string): string {
  try {
    return new Date(utcTimeStr).toLocaleTimeString("es-ES", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return new Date(utcTimeStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
}

function formatClock(clock: string): string {
  if (!clock) return "";
  const match = clock.match(/PT(\d+)M([\d.]+)S/);
  if (!match) return clock;
  const mins = match[1];
  const secs = Math.floor(parseFloat(match[2])).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

function TeamRow({
  team,
  isWinning,
  showScore,
}: {
  team: GameTeam;
  isWinning: boolean;
  showScore: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 transition-opacity ${isWinning ? "opacity-100" : "opacity-40"}`}
    >
      <div className="flex items-center gap-2">
        <img
          src={`/teams/${team.teamId}.svg`}
          alt={team.teamTricode}
          className="h-6 w-6 flex-shrink-0 object-contain"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
        <span
          className={`text-sm ${isWinning ? "font-bold text-white" : "font-medium text-gray-300"}`}
        >
          {team.teamCity} {team.teamName}
        </span>
      </div>
      {showScore && (
        <span
          className={`text-sm tabular-nums ${isWinning ? "font-bold text-white" : "font-medium text-gray-500"}`}
        >
          {team.score}
        </span>
      )}
    </div>
  );
}

function GameCard({ game, timezone }: { game: Game; timezone: string }) {
  const isLive = game.gameStatus === 2;
  const isFinal = game.gameStatus === 3;
  const isPregame = game.gameStatus === 1;
  const showScore = !isPregame;

  const homeScore = game.homeTeam.score;
  const awayScore = game.awayTeam.score;
  const tied = homeScore === awayScore;

  // In pregame, both show at full opacity
  // In live/final, loser fades
  const homeIsWinning = isPregame || tied || homeScore > awayScore;
  const awayIsWinning = isPregame || tied || awayScore > homeScore;

  const localTime = isPregame ? getLocalTime(game.gameTimeUTC, timezone) : null;
  const clock = isLive ? formatClock(game.gameClock) : null;

  return (
    <div
      className={`flex min-w-[215px] flex-col gap-2.5 rounded-xl border p-3 shadow-sm transition-colors hover:border-orange-500/40 ${
        isLive
          ? "border-red-500/30 bg-[#111827]"
          : "border-[#374151] bg-[#111827]"
      }`}
    >
      {/* Status row */}
      <div className="flex items-center justify-between gap-2">
        {isLive && (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            {game.period > 4 ? `OT${game.period - 4}` : `Q${game.period}`}
            {clock ? ` · ${clock}` : ""}
          </span>
        )}
        {isFinal && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-gray-400">
            Final
          </span>
        )}
        {isPregame && (
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-400">
            {localTime}
          </span>
        )}
        <span className="ml-auto text-xs text-gray-600">
          {game.awayTeam.wins}–{game.awayTeam.losses} /{" "}
          {game.homeTeam.wins}–{game.homeTeam.losses}
        </span>
      </div>

      <TeamRow
        team={game.awayTeam}
        isWinning={awayIsWinning}
        showScore={showScore}
      />
      <TeamRow
        team={game.homeTeam}
        isWinning={homeIsWinning}
        showScore={showScore}
      />
    </div>
  );
}

export default function LiveScores() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timezone, setTimezone] = useState("UTC");
  const [gameDate, setGameDate] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("elarostats_timezone");
    if (stored) {
      setTimezone(stored);
    } else {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      setTimezone(detected);
      localStorage.setItem("elarostats_timezone", detected);
    }
  }, []);

  useEffect(() => {
    async function fetchScores() {
      try {
        const res = await fetch(
          "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json",
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data: ScoreboardData = await res.json();
        setGames(data.scoreboard.games);
        setGameDate(data.scoreboard.gameDate);
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

  const formattedDate = gameDate
    ? new Date(gameDate + "T12:00:00").toLocaleDateString("es-ES", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <div className="w-full border-b border-gray-800/60 bg-gray-950">
      <div className="flex items-center gap-2 px-4 pt-2.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          NBA
        </span>
        <span className="text-xs text-gray-700">·</span>
        <span className="text-xs text-gray-500">{formattedDate}</span>
        <span className="text-xs text-gray-700">·</span>
        <span className="text-xs text-gray-600">{timezone}</span>
      </div>
      <div className="overflow-x-auto px-4 pb-3 pt-2">
        <div className="flex gap-3" style={{ minWidth: "max-content" }}>
          {games.map((game) => (
            <GameCard key={game.gameId} game={game} timezone={timezone} />
          ))}
        </div>
      </div>
    </div>
  );
}
