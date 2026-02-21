import { useState, useEffect } from "react";
import { useLiveGame } from "../hooks/useLiveGame";
import { useTodaysGames } from "../hooks/useTodaysGames";
import teamsData from "../data/teams.json";

const abbrToTeamId = new Map<string, number>(
  teamsData.map((t) => [t.abbreviation, t.teamId]),
);

function teamLogoUrl(abbr: string): string | undefined {
  const id = abbrToTeamId.get(abbr.toUpperCase());
  return id ? `/teams/${id}.svg` : undefined;
}

function parseTeamField(field: string): { abbr: string; score: number } {
  const parts = field.trim().split(" ");
  return { abbr: parts[0] ?? "", score: parseInt(parts[1] ?? "0", 10) };
}

// Helper to safely read a number field from unknown data
function num(data: unknown, key: string): number {
  if (!data || typeof data !== "object") return 0;
  const val = (data as Record<string, unknown>)[key];
  return typeof val === "number" ? val : 0;
}

function str(data: unknown, key: string): string {
  if (!data || typeof data !== "object") return "";
  const val = (data as Record<string, unknown>)[key];
  return typeof val === "string" ? val : "";
}

interface TeamStatsBoxProps {
  label: string;
  abbr: string;
  score: number;
  stats: Record<string, unknown>;
}

function TeamStatsBox({ label, abbr, score, stats }: TeamStatsBoxProps) {
  const logo = teamLogoUrl(abbr);
  const fgm = num(stats, "FGM");
  const fga = num(stats, "FGA");
  const fg3m = num(stats, "FG3M");
  const fg3a = num(stats, "FG3A");
  const fta = num(stats, "FTA");
  const reb = num(stats, "Rebounds");
  const ast = num(stats, "Assists");
  const stl = num(stats, "Steals");
  const blk = num(stats, "Blocks");
  const tov = num(stats, "Turnovers");

  return (
    <div className="flex flex-1 flex-col items-center gap-3 rounded-xl bg-gray-800/60 p-4">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <div className="flex items-center gap-3">
        {logo && (
          <img src={logo} alt={abbr} className="h-10 w-10 object-contain" />
        )}
        <span className="text-4xl font-black text-white">{score}</span>
      </div>
      <p className="text-sm font-semibold text-gray-300">{abbr}</p>
      {fga > 0 && (
        <div className="w-full space-y-1 border-t border-gray-700 pt-3 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>FG</span>
            <span className="font-medium text-gray-200">
              {fgm}/{fga} ({fga > 0 ? ((fgm / fga) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>3P</span>
            <span className="font-medium text-gray-200">
              {fg3m}/{fg3a} ({fg3a > 0 ? ((fg3m / fg3a) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>FTA</span>
            <span className="font-medium text-gray-200">{fta}</span>
          </div>
          <div className="flex justify-between">
            <span>REB</span>
            <span className="font-medium text-gray-200">{reb}</span>
          </div>
          <div className="flex justify-between">
            <span>AST</span>
            <span className="font-medium text-gray-200">{ast}</span>
          </div>
          <div className="flex justify-between">
            <span>STL/BLK</span>
            <span className="font-medium text-gray-200">
              {stl}/{blk}
            </span>
          </div>
          <div className="flex justify-between">
            <span>TOV</span>
            <span className="font-medium text-gray-200">{tov}</span>
          </div>
        </div>
      )}
    </div>
  );
}

interface PlayerRow {
  name: string;
  minutes: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  tov: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  plusMinus: number;
}

function parsePlayerRow(p: unknown): PlayerRow {
  return {
    name: str(p, "ShortName") || str(p, "Name"),
    minutes: str(p, "MinutesMMSS") || str(p, "Minutes"),
    pts: num(p, "Points"),
    reb: num(p, "Rebounds"),
    ast: num(p, "Assists"),
    stl: num(p, "Steals"),
    blk: num(p, "Blocks"),
    tov: num(p, "Turnovers"),
    fgm: num(p, "FGM"),
    fga: num(p, "FGA"),
    fg3m: num(p, "FG3M"),
    fg3a: num(p, "FG3A"),
    plusMinus: num(p, "PlusMinus"),
  };
}

interface PlayerTableProps {
  label: string;
  abbr: string;
  players: unknown[];
}

function PlayerTable({ label, abbr, players }: PlayerTableProps) {
  const logo = teamLogoUrl(abbr);
  const rows = players.map(parsePlayerRow);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800/40">
      <div className="flex items-center gap-2 border-b border-gray-700 px-4 py-3">
        {logo && (
          <img src={logo} alt={abbr} className="h-5 w-5 object-contain" />
        )}
        <span className="text-sm font-semibold text-gray-200">{label}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="px-4 py-2 text-left font-medium">Jugador</th>
            <th className="px-2 py-2 text-right font-medium">MIN</th>
            <th className="px-2 py-2 text-right font-medium">PTS</th>
            <th className="px-2 py-2 text-right font-medium">REB</th>
            <th className="px-2 py-2 text-right font-medium">AST</th>
            <th className="px-2 py-2 text-right font-medium">FG</th>
            <th className="px-2 py-2 text-right font-medium">3P</th>
            <th className="px-2 py-2 text-right font-medium">STL</th>
            <th className="px-2 py-2 text-right font-medium">BLK</th>
            <th className="px-2 py-2 text-right font-medium">TOV</th>
            <th className="px-2 py-2 text-right font-medium">+/-</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className="border-t border-gray-700/50 text-gray-300 hover:bg-gray-700/30"
            >
              <td className="px-4 py-2 font-medium text-white">{row.name}</td>
              <td className="px-2 py-2 text-right text-gray-400">{row.minutes}</td>
              <td className="px-2 py-2 text-right font-semibold text-white">{row.pts}</td>
              <td className="px-2 py-2 text-right">{row.reb}</td>
              <td className="px-2 py-2 text-right">{row.ast}</td>
              <td className="px-2 py-2 text-right">
                {row.fgm}/{row.fga}
              </td>
              <td className="px-2 py-2 text-right">
                {row.fg3m}/{row.fg3a}
              </td>
              <td className="px-2 py-2 text-right">{row.stl}</td>
              <td className="px-2 py-2 text-right">{row.blk}</td>
              <td className="px-2 py-2 text-right">{row.tov}</td>
              <td
                className={`px-2 py-2 text-right font-medium ${
                  row.plusMinus > 0
                    ? "text-green-400"
                    : row.plusMinus < 0
                      ? "text-red-400"
                      : "text-gray-400"
                }`}
              >
                {row.plusMinus > 0 ? `+${row.plusMinus}` : row.plusMinus}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LastUpdated({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    const update = () => {
      setSecondsAgo(Math.floor((Date.now() - dataUpdatedAt) / 1000));
    };
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, [dataUpdatedAt]);

  return (
    <span className="text-xs text-gray-500">
      Actualizado hace {secondsAgo < 5 ? "unos segundos" : `${secondsAgo}s`}
    </span>
  );
}

interface LiveGameViewProps {
  gameId: string;
}

export default function LiveGameView({ gameId }: LiveGameViewProps) {
  const { data: games } = useTodaysGames();
  const gameInfo = games?.find((g) => g.gameid === gameId);

  const homeRaw = gameInfo ? `${gameInfo.homeTeam} ${gameInfo.homeScore}` : "";
  const awayRaw = gameInfo ? `${gameInfo.awayTeam} ${gameInfo.awayScore}` : "";
  const time = gameInfo?.time ?? "";

  const home = parseTeamField(homeRaw);
  const away = parseTeamField(awayRaw);

  const teamQuery = useLiveGame(gameId, "team");
  const playerQuery = useLiveGame(gameId, "player");

  const teamData = teamQuery.data;
  const playerData = playerQuery.data;

  const gameNotStarted =
    teamData?.status === "error" || !teamData?.game_data;

  const teamGameData = teamData?.game_data as
    | {
        Away?: { FullGame?: Record<string, unknown> };
        Home?: { FullGame?: Record<string, unknown> };
      }
    | undefined;

  const playerGameData = playerData?.game_data as
    | {
        Away?: { FullGame?: unknown[] };
        Home?: { FullGame?: unknown[] };
      }
    | undefined;

  const awayTeamStats = teamGameData?.Away?.FullGame ?? {};
  const homeTeamStats = teamGameData?.Home?.FullGame ?? {};
  const awayPlayers = playerGameData?.Away?.FullGame ?? [];
  const homePlayers = playerGameData?.Home?.FullGame ?? [];

  const isRefetching = teamQuery.isFetching || playerQuery.isFetching;
  const lastUpdated = Math.max(
    teamQuery.dataUpdatedAt ?? 0,
    playerQuery.dataUpdatedAt ?? 0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-300">
          ← Volver
        </a>
        <div className="flex items-center gap-2">
          {isRefetching && (
            <div className="h-2 w-2 animate-spin rounded-full border border-orange-400 border-t-transparent" />
          )}
          {lastUpdated > 0 && <LastUpdated dataUpdatedAt={lastUpdated} />}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="rounded-xl border border-gray-700 bg-gray-800/60 p-6">
        <div className="flex items-center justify-center gap-8">
          {/* Away */}
          <div className="flex flex-col items-center gap-2">
            {teamLogoUrl(away.abbr) && (
              <img
                src={teamLogoUrl(away.abbr)!}
                alt={away.abbr}
                className="h-16 w-16 object-contain"
              />
            )}
            <span className="text-sm font-medium text-gray-400">{away.abbr}</span>
            <span className="text-5xl font-black text-white">{away.score}</span>
          </div>

          <div className="text-center">
            {gameNotStarted ? (
              <p className="text-lg font-medium text-gray-400">{time}</p>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                EN VIVO
              </span>
            )}
            <p className="mt-1 text-xs text-gray-600">{gameId}</p>
          </div>

          {/* Home */}
          <div className="flex flex-col items-center gap-2">
            {teamLogoUrl(home.abbr) && (
              <img
                src={teamLogoUrl(home.abbr)!}
                alt={home.abbr}
                className="h-16 w-16 object-contain"
              />
            )}
            <span className="text-sm font-medium text-gray-400">{home.abbr}</span>
            <span className="text-5xl font-black text-white">{home.score}</span>
          </div>
        </div>
      </div>

      {gameNotStarted ? (
        <p className="text-center text-sm text-gray-500">
          El partido aún no ha comenzado. Los datos en vivo aparecerán aquí cuando empiece.
        </p>
      ) : (
        <>
          {/* Team stats */}
          {(Object.keys(awayTeamStats).length > 0 ||
            Object.keys(homeTeamStats).length > 0) && (
            <div className="flex gap-4">
              <TeamStatsBox
                label="Visitante"
                abbr={away.abbr}
                score={away.score}
                stats={awayTeamStats}
              />
              <TeamStatsBox
                label="Local"
                abbr={home.abbr}
                score={home.score}
                stats={homeTeamStats}
              />
            </div>
          )}

          {/* Player boxscore */}
          {awayPlayers.length > 0 && (
            <PlayerTable
              label={away.abbr}
              abbr={away.abbr}
              players={awayPlayers}
            />
          )}
          {homePlayers.length > 0 && (
            <PlayerTable
              label={home.abbr}
              abbr={home.abbr}
              players={homePlayers}
            />
          )}
        </>
      )}
    </div>
  );
}
