import { useState, useEffect, useMemo } from "react";
import { useLiveGame } from "../hooks/useLiveGame";
import { useTodaysGames } from "../hooks/useTodaysGames";
import { useAllPlayers } from "../hooks/useAllPlayers";
import { useTranslation } from "../hooks/useTranslation";
import { NBA_CDN_BASE_URL } from "../constants/player";
import teamsData from "../data/teams.json";
import GameFlowChart from "./GameFlowChart";
import type { ScoreMargin } from "./GameFlowChart";
import type { Player } from "../types/player";

const abbrToTeamId = new Map<string, number>(teamsData.map((t) => [t.abbreviation, t.teamId]));

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
    <div className="flex flex-1 flex-col items-center gap-3 rounded-xl bg-gray-100 p-4 dark:bg-gray-800/60">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      <div className="flex items-center gap-3">
        {logo && <img src={logo} alt={abbr} className="h-10 w-10 object-contain" />}
        <span className="text-4xl font-black text-gray-900 dark:text-white">{score}</span>
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{abbr}</p>
      {fga > 0 && (
        <div className="w-full space-y-1 border-t border-gray-200 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
          <div className="flex justify-between">
            <span>FG</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {fgm}/{fga} ({fga > 0 ? ((fgm / fga) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>3P</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {fg3m}/{fg3a} ({fg3a > 0 ? ((fg3m / fg3a) * 100).toFixed(1) : "0.0"}%)
            </span>
          </div>
          <div className="flex justify-between">
            <span>FTA</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{fta}</span>
          </div>
          <div className="flex justify-between">
            <span>REB</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{reb}</span>
          </div>
          <div className="flex justify-between">
            <span>AST</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{ast}</span>
          </div>
          <div className="flex justify-between">
            <span>STL/BLK</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {stl}/{blk}
            </span>
          </div>
          <div className="flex justify-between">
            <span>TOV</span>
            <span className="font-medium text-gray-700 dark:text-gray-200">{tov}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// --- PBPStats player data types ---

interface PbpStatsHeader {
  field: string;
  label: string;
}

interface PbpStatsStatRow {
  stat: string;
  [playerId: string]: string | number;
}

interface LivePlayer {
  nbaId: string;
  name: string;
  isOnCourt: boolean;
  minutes: string;
  pts: number;
  fg2: string;
  fg3: string;
  ft: string;
  efg: number;
  ts: number;
  usage: number;
  assistPts: number;
  fouls: number;
  shotQuality: number;
}

function getStatFromRows(rows: PbpStatsStatRow[], statName: string, playerId: string): string | number {
  const row = rows.find((r) => r.stat === statName);
  return row ? (row[playerId] ?? 0) : 0;
}

function parseLivePlayers(headers: PbpStatsHeader[], rows: PbpStatsStatRow[]): LivePlayer[] {
  return headers
    .filter((h) => h.field !== "stat")
    .map((h) => {
      const id = h.field;
      const isOnCourt = h.label.endsWith("*");
      const name = isOnCourt ? h.label.slice(0, -1) : h.label;

      const minutesRaw = getStatFromRows(rows, "Minutes", id);
      const minutes = typeof minutesRaw === "string" ? minutesRaw : String(minutesRaw);

      return {
        nbaId: id,
        name,
        isOnCourt,
        minutes,
        pts: Number(getStatFromRows(rows, "Points", id)) || 0,
        fg2: String(getStatFromRows(rows, "2pt FG%", id) || "0 (0/0)"),
        fg3: String(getStatFromRows(rows, "3pt FG%", id) || "0 (0/0)"),
        ft: String(getStatFromRows(rows, "FT%", id) || "0 (0/0)"),
        efg: Number(getStatFromRows(rows, "eFG%", id)) || 0,
        ts: Number(getStatFromRows(rows, "TS%", id)) || 0,
        usage: Number(getStatFromRows(rows, "Usage", id)) || 0,
        assistPts: Number(getStatFromRows(rows, "Assist Points", id)) || 0,
        fouls: Number(getStatFromRows(rows, "Fouls", id)) || 0,
        shotQuality: Number(getStatFromRows(rows, "Shot Quality", id)) || 0,
      };
    });
}

/** Extract just the (makes/attempts) part from PBPStats format like "0.5 (2/4)" */
function fgShort(raw: string): string {
  const match = raw.match(/\(([^)]+)\)/);
  return match ? match[1] : raw;
}

interface PlayerTableProps {
  label: string;
  abbr: string;
  players: LivePlayer[];
  playersByNbaId: Map<string, Player>;
}

function PlayerTable({ label, abbr, players, playersByNbaId }: PlayerTableProps) {
  const logo = teamLogoUrl(abbr);
  const { t } = useTranslation();

  if (players.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        {logo && <img src={logo} alt={abbr} className="h-5 w-5 object-contain" />}
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-200">{label}</span>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="px-4 py-2 text-left font-medium">{t("player")}</th>
            <th className="px-2 py-2 text-right font-medium">MIN</th>
            <th className="px-2 py-2 text-right font-medium">PTS</th>
            <th className="px-2 py-2 text-right font-medium">FG</th>
            <th className="px-2 py-2 text-right font-medium">3P</th>
            <th className="px-2 py-2 text-right font-medium">FT</th>
            <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">eFG%</th>
            <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">TS%</th>
            <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">USG%</th>
            <th className="px-2 py-2 text-right font-medium">AST</th>
            <th className="px-2 py-2 text-right font-medium">PF</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const dbPlayer = playersByNbaId.get(p.nbaId);
            const headshotUrl = `${NBA_CDN_BASE_URL}/${p.nbaId}.png`;
            const playerHref = dbPlayer ? `/players/${p.nbaId}` : undefined;

            const nameContent = (
              <div className="flex items-center gap-2">
                <img
                  src={headshotUrl}
                  alt={p.name}
                  className="h-6 w-6 rounded-full bg-gray-200 object-cover dark:bg-gray-700"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="flex items-center gap-1">
                  <span className={p.isOnCourt ? "font-semibold text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}>
                    {p.name}
                  </span>
                  {p.isOnCourt && (
                    <span className="h-1.5 w-1.5 rounded-full bg-green-400" title="En pista" />
                  )}
                </div>
              </div>
            );

            return (
              <tr
                key={p.nbaId}
                className={`border-t border-gray-100 text-gray-600 hover:bg-gray-50 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700/30 ${
                  !p.isOnCourt ? "opacity-60" : ""
                }`}
              >
                <td className="whitespace-nowrap px-4 py-2">
                  {playerHref ? (
                    <a href={playerHref} className="transition-colors hover:text-orange-400">
                      {nameContent}
                    </a>
                  ) : (
                    nameContent
                  )}
                </td>
                <td className="px-2 py-2 text-right text-gray-500 dark:text-gray-400">{p.minutes}</td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">{p.pts}</td>
                <td className="px-2 py-2 text-right">{fgShort(p.fg2)}</td>
                <td className="px-2 py-2 text-right">{fgShort(p.fg3)}</td>
                <td className="px-2 py-2 text-right">{fgShort(p.ft)}</td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">
                  {p.efg > 0 ? (p.efg * 100).toFixed(1) : "—"}
                </td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">
                  {p.ts > 0 ? (p.ts * 100).toFixed(1) : "—"}
                </td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">
                  {p.usage > 0 ? p.usage.toFixed(1) : "—"}
                </td>
                <td className="px-2 py-2 text-right">{p.assistPts}</td>
                <td className="px-2 py-2 text-right">{p.fouls}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LastUpdated({ dataUpdatedAt }: { dataUpdatedAt: number }) {
  const [secondsAgo, setSecondsAgo] = useState(0);
  const { t } = useTranslation();

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
      {secondsAgo < 5
        ? t("updatedJustNow")
        : t("updatedSecondsAgo").replace("{seconds}", String(secondsAgo))}
    </span>
  );
}

interface LiveGameViewProps {
  gameId: string;
}

export default function LiveGameView({ gameId }: LiveGameViewProps) {
  const { data: games } = useTodaysGames();
  const { data: allPlayers } = useAllPlayers();
  const { t } = useTranslation();
  const gameInfo = games?.find((g) => g.gameid === gameId);

  const homeRaw = gameInfo ? `${gameInfo.homeTeam} ${gameInfo.homeScore}` : "";
  const awayRaw = gameInfo ? `${gameInfo.awayTeam} ${gameInfo.awayScore}` : "";
  const time = gameInfo?.time ?? "";
  const isFinal = gameInfo?.isFinal ?? false;

  const home = parseTeamField(homeRaw);
  const away = parseTeamField(awayRaw);

  const teamQuery = useLiveGame(gameId, "team", isFinal);
  const playerQuery = useLiveGame(gameId, "player", isFinal);
  const flowQuery = useLiveGame(gameId, "game-flow", isFinal);

  const teamData = teamQuery.data;
  const playerData = playerQuery.data;
  const flowData = flowQuery.data;

  const gameNotStarted = teamData?.status === "error" || !teamData?.game_data;

  const teamGameData = teamData?.game_data as
    | {
        Away?: { FullGame?: Record<string, unknown> };
        Home?: { FullGame?: Record<string, unknown> };
      }
    | undefined;

  const awayTeamStats = teamGameData?.Away?.FullGame ?? {};
  const homeTeamStats = teamGameData?.Home?.FullGame ?? {};

  // Use game_info from detail endpoints for more accurate/synced scores
  const detailGameInfo = (playerData?.game_data as { game_info?: { home_score?: number; visitor_score?: number } } | undefined)?.game_info;
  const homeScore = detailGameInfo?.home_score ?? home.score;
  const awayScore = detailGameInfo?.visitor_score ?? away.score;

  // Player data from PBPStats (wide-format: stat rows x player ID columns)
  const playerGameData = playerData?.game_data as
    | {
        home_rows?: PbpStatsStatRow[];
        visitor_rows?: PbpStatsStatRow[];
        home_headers?: PbpStatsHeader[];
        visitor_headers?: PbpStatsHeader[];
      }
    | undefined;

  const homePlayers = useMemo(
    () =>
      playerGameData?.home_headers && playerGameData?.home_rows
        ? parseLivePlayers(playerGameData.home_headers, playerGameData.home_rows)
        : [],
    [playerGameData?.home_headers, playerGameData?.home_rows],
  );

  const awayPlayers = useMemo(
    () =>
      playerGameData?.visitor_headers && playerGameData?.visitor_rows
        ? parseLivePlayers(playerGameData.visitor_headers, playerGameData.visitor_rows)
        : [],
    [playerGameData?.visitor_headers, playerGameData?.visitor_rows],
  );

  // Map nba_id (string) -> Player for cross-referencing with Supabase
  const playersByNbaId = useMemo(() => {
    const map = new Map<string, Player>();
    if (allPlayers) {
      for (const p of allPlayers) {
        map.set(String(p.nba_id), p);
      }
    }
    return map;
  }, [allPlayers]);

  // Game flow chart data
  const flowGameData = flowData?.game_data as
    | { score_margins?: ScoreMargin[]; max_time?: number }
    | undefined;
  const scoreMargins = flowGameData?.score_margins ?? [];
  const maxTime = flowGameData?.max_time ?? 2880;

  const isRefetching = teamQuery.isFetching || playerQuery.isFetching || flowQuery.isFetching;
  const lastUpdated = Math.max(
    teamQuery.dataUpdatedAt ?? 0,
    playerQuery.dataUpdatedAt ?? 0,
    flowQuery.dataUpdatedAt ?? 0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <a href="/" className="text-sm text-gray-500 hover:text-gray-300">
          ← {t("back")}
        </a>
        <div className="flex items-center gap-2">
          {isRefetching && (
            <div className="h-2 w-2 animate-spin rounded-full border border-orange-400 border-t-transparent" />
          )}
          {lastUpdated > 0 && <LastUpdated dataUpdatedAt={lastUpdated} />}
        </div>
      </div>

      {/* Scoreboard */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800/60">
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
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{away.abbr}</span>
            <span className="text-5xl font-black text-gray-900 dark:text-white">{awayScore}</span>
          </div>

          <div className="text-center">
            {gameNotStarted ? (
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{time}</p>
            ) : isFinal ? (
              <span className="rounded-full bg-gray-700/60 px-2 py-1 text-xs font-medium text-gray-400">
                {time}
              </span>
            ) : (
              <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                {t("liveTag")}
              </span>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">{gameId}</p>
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
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{home.abbr}</span>
            <span className="text-5xl font-black text-gray-900 dark:text-white">{homeScore}</span>
          </div>
        </div>
      </div>

      {gameNotStarted ? (
        <p className="text-center text-sm text-gray-500">{t("gameNotStarted")}</p>
      ) : (
        <>
          {/* Game flow chart */}
          {scoreMargins.length > 0 && (
            <GameFlowChart
              margins={scoreMargins}
              maxTime={maxTime}
              homeAbbr={home.abbr}
              awayAbbr={away.abbr}
            />
          )}

          {/* Team stats */}
          {(Object.keys(awayTeamStats).length > 0 || Object.keys(homeTeamStats).length > 0) && (
            <div className="flex gap-4">
              <TeamStatsBox
                label={t("away")}
                abbr={away.abbr}
                score={awayScore}
                stats={awayTeamStats}
              />
              <TeamStatsBox
                label={t("home")}
                abbr={home.abbr}
                score={homeScore}
                stats={homeTeamStats}
              />
            </div>
          )}

          {/* Player boxscore */}
          {awayPlayers.length > 0 && (
            <PlayerTable label={away.abbr} abbr={away.abbr} players={awayPlayers} playersByNbaId={playersByNbaId} />
          )}
          {homePlayers.length > 0 && (
            <PlayerTable label={home.abbr} abbr={home.abbr} players={homePlayers} playersByNbaId={playersByNbaId} />
          )}
        </>
      )}
    </div>
  );
}
