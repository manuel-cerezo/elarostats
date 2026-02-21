import { useEffect, useState } from "react";
import teamsData from "../data/teams.json";

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

interface GameLeader {
  personId: number;
  name: string;
  jerseyNum: string;
  position: string;
  teamTricode: string;
  playerSlug: string;
  points: number;
  rebounds: number;
  assists: number;
}

interface Game {
  gameId: string;
  gameStatus: number;
  gameStatusText: string;
  period: number;
  gameClock: string;
  gameTimeUTC: string;
  homeTeam: GameTeam;
  awayTeam: GameTeam;
  gameLeaders?: {
    homeLeaders: GameLeader;
    awayLeaders: GameLeader;
  };
}

interface ScoreboardData {
  scoreboard: {
    gameDate: string;
    games: Game[];
  };
}

const teamById = new Map(teamsData.map((t) => [t.teamId, t]));

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

function PeriodScores({ team, periods }: { team: GameTeam; periods: number }) {
  return (
    <>
      {Array.from({ length: periods }, (_, i) => i + 1).map((p) => {
        const period = team.periods.find((pr) => pr.period === p);
        return (
          <td
            key={p}
            className="px-3 py-2 text-center text-sm tabular-nums text-gray-400"
          >
            {period?.score ?? "—"}
          </td>
        );
      })}
    </>
  );
}

function GameCard({
  game,
  timezone,
}: {
  game: Game;
  timezone: string;
}) {
  const isLive = game.gameStatus === 2;
  const isFinal = game.gameStatus === 3;
  const isPregame = game.gameStatus === 1;

  const homeScore = game.homeTeam.score;
  const awayScore = game.awayTeam.score;
  const homeWins = !isPregame && homeScore > awayScore;
  const awayWins = !isPregame && awayScore > homeScore;

  const localTime = isPregame ? getLocalTime(game.gameTimeUTC, timezone) : null;
  const clock = isLive ? formatClock(game.gameClock) : null;

  // Max period for column headers
  const maxPeriod = Math.max(
    game.homeTeam.periods.length,
    game.awayTeam.periods.length,
    isPregame ? 4 : 4,
  );

  const homeTeamData = teamById.get(game.homeTeam.teamId);
  const awayTeamData = teamById.get(game.awayTeam.teamId);

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-sm ${
        isLive
          ? "border-red-500/20 bg-gray-900"
          : "border-gray-700/50 bg-gray-900"
      }`}
    >
      {/* Game header */}
      <div className="flex items-center justify-between border-b border-gray-800/60 px-4 py-2.5">
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-0.5 text-xs font-semibold text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              {game.period > 4 ? `OT${game.period - 4}` : `Q${game.period}`}
              {clock ? ` · ${clock}` : ""}
            </span>
          )}
          {isFinal && (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-gray-400">
              Final
            </span>
          )}
          {isPregame && (
            <span className="text-sm font-semibold text-orange-400">
              {localTime}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-600">
          {game.awayTeam.wins}–{game.awayTeam.losses} vs{" "}
          {game.homeTeam.wins}–{game.homeTeam.losses}
        </span>
      </div>

      {/* Scoreboard table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-800/40">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">
                Equipo
              </th>
              {!isPregame &&
                Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => (
                  <th
                    key={p}
                    className="px-3 py-2 text-center text-xs font-medium text-gray-600"
                  >
                    {p > 4 ? `OT${p - 4}` : `Q${p}`}
                  </th>
                ))}
              {!isPregame && (
                <th className="px-3 py-2 text-center text-xs font-bold text-gray-500">
                  T
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Away team row */}
            <tr className={`border-b border-gray-800/30 ${awayWins ? "" : isFinal || isLive ? "opacity-50" : ""}`}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={`/teams/${game.awayTeam.teamId}.svg`}
                    alt={game.awayTeam.teamTricode}
                    className="h-8 w-8 flex-shrink-0 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div>
                    <div className={`font-semibold ${awayWins ? "text-white" : "text-gray-300"}`}>
                      {awayTeamData?.teamName ?? `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`}
                    </div>
                    <div className="text-xs text-gray-500">Visitante</div>
                  </div>
                </div>
              </td>
              {!isPregame && (
                <PeriodScores team={game.awayTeam} periods={maxPeriod} />
              )}
              {!isPregame && (
                <td className="px-3 py-3 text-center">
                  <span className={`text-lg font-bold tabular-nums ${awayWins ? "text-white" : "text-gray-500"}`}>
                    {game.awayTeam.score}
                  </span>
                </td>
              )}
            </tr>

            {/* Home team row */}
            <tr className={homeWins ? "" : isFinal || isLive ? "opacity-50" : ""}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={`/teams/${game.homeTeam.teamId}.svg`}
                    alt={game.homeTeam.teamTricode}
                    className="h-8 w-8 flex-shrink-0 object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                  />
                  <div>
                    <div className={`font-semibold ${homeWins ? "text-white" : "text-gray-300"}`}>
                      {homeTeamData?.teamName ?? `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`}
                    </div>
                    <div className="text-xs text-gray-500">Local</div>
                  </div>
                </div>
              </td>
              {!isPregame && (
                <PeriodScores team={game.homeTeam} periods={maxPeriod} />
              )}
              {!isPregame && (
                <td className="px-3 py-3 text-center">
                  <span className={`text-lg font-bold tabular-nums ${homeWins ? "text-white" : "text-gray-500"}`}>
                    {game.homeTeam.score}
                  </span>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Game leaders (if game started) */}
      {!isPregame && game.gameLeaders && (
        <div className="border-t border-gray-800/40 px-4 py-2.5">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-600">
            Líderes
          </p>
          <div className="flex items-start justify-between gap-4">
            <div className="text-xs text-gray-400">
              <span className="font-medium text-gray-300">
                {game.gameLeaders.awayLeaders.name}
              </span>{" "}
              · {game.gameLeaders.awayLeaders.points}pts /{" "}
              {game.gameLeaders.awayLeaders.rebounds}reb /{" "}
              {game.gameLeaders.awayLeaders.assists}ast
            </div>
            <div className="text-right text-xs text-gray-400">
              <span className="font-medium text-gray-300">
                {game.gameLeaders.homeLeaders.name}
              </span>{" "}
              · {game.gameLeaders.homeLeaders.points}pts /{" "}
              {game.gameLeaders.homeLeaders.rebounds}reb /{" "}
              {game.gameLeaders.homeLeaders.assists}ast
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GamesView() {
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
    async function fetchGames() {
      try {
        const res = await fetch(
          "https://cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json",
        );
        if (!res.ok) throw new Error("Failed");
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

    fetchGames();
    const interval = setInterval(fetchGames, 30_000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-40 animate-pulse rounded-2xl bg-gray-800/40"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900 p-8 text-center text-gray-500">
        No se pudieron cargar los partidos.
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900 p-8 text-center text-gray-500">
        No hay partidos programados hoy.
      </div>
    );
  }

  const formattedDate = gameDate
    ? new Date(gameDate + "T12:00:00").toLocaleDateString("es-ES", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  // Group by status: live > final > pregame
  const liveGames = games.filter((g) => g.gameStatus === 2);
  const finalGames = games.filter((g) => g.gameStatus === 3);
  const pregameGames = games.filter((g) => g.gameStatus === 1);
  const sortedGames = [...liveGames, ...pregameGames, ...finalGames];

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Partidos</h1>
          {formattedDate && (
            <p className="mt-0.5 text-sm capitalize text-gray-500">{formattedDate}</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />
          {timezone}
        </div>
      </div>

      {liveGames.length > 0 && (
        <div className="mb-2">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
            En directo
          </p>
          <div className="space-y-4">
            {liveGames.map((game) => (
              <GameCard key={game.gameId} game={game} timezone={timezone} />
            ))}
          </div>
        </div>
      )}

      {pregameGames.length > 0 && (
        <div className="mb-6 mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Próximos
          </p>
          <div className="space-y-4">
            {pregameGames.map((game) => (
              <GameCard key={game.gameId} game={game} timezone={timezone} />
            ))}
          </div>
        </div>
      )}

      {finalGames.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            Finalizados
          </p>
          <div className="space-y-4">
            {finalGames.map((game) => (
              <GameCard key={game.gameId} game={game} timezone={timezone} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
