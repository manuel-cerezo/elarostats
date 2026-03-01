import { useState, useEffect, useMemo } from "react";
import { useLiveGame } from "../hooks/useLiveGame";
import { useCompletedGame } from "../hooks/useCompletedGame";
import { useTodaysGames } from "../hooks/useTodaysGames";
import { useAllPlayers } from "../hooks/useAllPlayers";
import { useTranslation } from "../hooks/useTranslation";
import { NBA_CDN_BASE_URL } from "../constants/player";
import teamsData from "../data/teams.json";
import GameFlowChart from "./GameFlowChart";
import PlayByPlay from "./PlayByPlay";
import type { ScoreMargin } from "./GameFlowChart";
import type { Player } from "../types/player";
import type { Possession } from "../types/games";

const abbrToTeamId = new Map<string, number>(teamsData.map((t) => [t.abbreviation, t.teamId]));

function teamLogoUrl(abbr: string): string | undefined {
  const id = abbrToTeamId.get(abbr.toUpperCase());
  return id ? `/teams/${id}.svg` : undefined;
}

function teamPageUrl(abbr: string): string | undefined {
  const id = abbrToTeamId.get(abbr.toUpperCase());
  return id ? `/teams/${id}` : undefined;
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

// --- Team Stats Comparison ---

interface TeamStatsComparisonProps {
  awayAbbr: string;
  homeAbbr: string;
  awayStats: Record<string, unknown>;
  homeStats: Record<string, unknown>;
}

function TeamStatsComparison({ awayAbbr, homeAbbr, awayStats, homeStats }: TeamStatsComparisonProps) {
  const awayLogo = teamLogoUrl(awayAbbr);
  const homeLogo = teamLogoUrl(homeAbbr);
  const awayUrl = teamPageUrl(awayAbbr);
  const homeUrl = teamPageUrl(homeAbbr);
  const { t } = useTranslation();

  const fgmA = num(awayStats, "FGM"), fgaA = num(awayStats, "FGA");
  const fgmH = num(homeStats, "FGM"), fgaH = num(homeStats, "FGA");
  const fg3mA = num(awayStats, "FG3M"), fg3aA = num(awayStats, "FG3A");
  const fg3mH = num(homeStats, "FG3M"), fg3aH = num(homeStats, "FG3A");

  const fgPctA = fgaA > 0 ? (fgmA / fgaA) * 100 : 0;
  const fgPctH = fgaH > 0 ? (fgmH / fgaH) * 100 : 0;
  const fg3PctA = fg3aA > 0 ? (fg3mA / fg3aA) * 100 : 0;
  const fg3PctH = fg3aH > 0 ? (fg3mH / fg3aH) * 100 : 0;

  if (fgaA === 0 && fgaH === 0) return null;

  const rows: { label: string; awayVal: string; homeVal: string; awayPct?: number; homePct?: number }[] = [
    { label: "FG%", awayVal: `${fgPctA.toFixed(1)}%`, homeVal: `${fgPctH.toFixed(1)}%`, awayPct: fgPctA, homePct: fgPctH },
    { label: "3P%", awayVal: `${fg3PctA.toFixed(1)}%`, homeVal: `${fg3PctH.toFixed(1)}%`, awayPct: fg3PctA, homePct: fg3PctH },
    { label: "FTA", awayVal: String(num(awayStats, "FTA")), homeVal: String(num(homeStats, "FTA")) },
    { label: "REB", awayVal: String(num(awayStats, "Rebounds")), homeVal: String(num(homeStats, "Rebounds")) },
    { label: "AST", awayVal: String(num(awayStats, "Assists")), homeVal: String(num(homeStats, "Assists")) },
    { label: "STL/BLK", awayVal: `${num(awayStats, "Steals")}/${num(awayStats, "Blocks")}`, homeVal: `${num(homeStats, "Steals")}/${num(homeStats, "Blocks")}` },
    { label: "TOV", awayVal: String(num(awayStats, "Turnovers")), homeVal: String(num(homeStats, "Turnovers")) },
  ];

  const TeamLink = ({ abbr, logo, side }: { abbr: string; logo?: string; side: "away" | "home" }) => {
    const url = side === "away" ? awayUrl : homeUrl;
    const content = (
      <div className={`flex items-center gap-2 ${side === "home" ? "flex-row-reverse" : ""}`}>
        {logo && <img src={logo} alt={abbr} className="h-6 w-6 object-contain" />}
        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{abbr}</span>
      </div>
    );
    return url ? (
      <a href={url} className="transition-opacity hover:opacity-75">{content}</a>
    ) : content;
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
      <div className="mb-3 flex items-center justify-between">
        <TeamLink abbr={awayAbbr} logo={awayLogo} side="away" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
          {t("teamStats")}
        </span>
        <TeamLink abbr={homeAbbr} logo={homeLogo} side="home" />
      </div>

      <div className="space-y-2">
        {rows.map(({ label, awayVal, homeVal, awayPct, homePct }) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-14 text-right font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {awayVal}
            </span>
            <div className="flex flex-1 items-center gap-1">
              {awayPct !== undefined && homePct !== undefined ? (
                <>
                  <div className="flex h-1.5 flex-1 justify-end">
                    <div
                      className="rounded-full bg-blue-400/60"
                      style={{ width: `${Math.max(awayPct, 2)}%` }}
                    />
                  </div>
                  <span className="w-12 text-center text-[10px] font-medium text-gray-400">
                    {label}
                  </span>
                  <div className="flex h-1.5 flex-1">
                    <div
                      className="rounded-full bg-orange-400/60"
                      style={{ width: `${Math.max(homePct, 2)}%` }}
                    />
                  </div>
                </>
              ) : (
                <span className="flex-1 text-center text-[10px] font-medium text-gray-400">
                  {label}
                </span>
              )}
            </div>
            <span className="w-14 text-left font-semibold tabular-nums text-gray-700 dark:text-gray-200">
              {homeVal}
            </span>
          </div>
        ))}
      </div>
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
  minutesNum: number; // numeric value for sorting
  pts: number;
  fg2: string;
  fg3: string;
  ft: string;
  efg: number;
  ts: number;
  usage: number;
  assistPts: number;
  fouls: number;
}

function getStatFromRows(rows: PbpStatsStatRow[], statName: string, playerId: string): string | number {
  const row = rows.find((r) => r.stat === statName);
  return row ? (row[playerId] ?? 0) : 0;
}

function parseMinutes(minutes: string): number {
  const [m, s] = minutes.split(":");
  return parseInt(m ?? "0", 10) + parseInt(s ?? "0", 10) / 60;
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
        minutesNum: parseMinutes(minutes),
        pts: Number(getStatFromRows(rows, "Points", id)) || 0,
        fg2: String(getStatFromRows(rows, "2pt FG%", id) || "0 (0/0)"),
        fg3: String(getStatFromRows(rows, "3pt FG%", id) || "0 (0/0)"),
        ft: String(getStatFromRows(rows, "FT%", id) || "0 (0/0)"),
        efg: Number(getStatFromRows(rows, "eFG%", id)) || 0,
        ts: Number(getStatFromRows(rows, "TS%", id)) || 0,
        usage: Number(getStatFromRows(rows, "Usage", id)) || 0,
        assistPts: Number(getStatFromRows(rows, "Assist Points", id)) || 0,
        fouls: Number(getStatFromRows(rows, "Fouls", id)) || 0,
      };
    });
}

/** Extract just the (makes/attempts) part from PBPStats format like "0.5 (2/4)" */
function fgShort(raw: string): string {
  const match = raw.match(/\(([^)]+)\)/);
  return match ? match[1] : raw;
}

// --- Sortable column types ---

type SortCol = "minutes" | "pts" | "efg" | "ts" | "usage" | "assistPts" | "fouls";
type SortDir = "asc" | "desc";

// \uFE0E = Unicode Variation Selector-15: forces text (non-emoji) rendering
function SortIndicator({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active)
    return <span className="ml-0.5 opacity-30">{"\u2195\uFE0E"}</span>;
  return (
    <span className="ml-0.5 text-orange-400">
      {dir === "desc" ? "\u2193\uFE0E" : "\u2191\uFE0E"}
    </span>
  );
}

// --- Player Table (used inside tabbed wrapper) ---

interface PlayerTableContentProps {
  players: LivePlayer[];
  playersByNbaId: Map<string, Player>;
}

function PlayerTableContent({ players, playersByNbaId }: PlayerTableContentProps) {
  const { t } = useTranslation();
  const [sortCol, setSortCol] = useState<SortCol>("pts");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => {
      let aVal: number;
      let bVal: number;
      switch (sortCol) {
        case "minutes":   aVal = a.minutesNum; bVal = b.minutesNum; break;
        case "pts":       aVal = a.pts;        bVal = b.pts;        break;
        case "efg":       aVal = a.efg;        bVal = b.efg;        break;
        case "ts":        aVal = a.ts;         bVal = b.ts;         break;
        case "usage":     aVal = a.usage;      bVal = b.usage;      break;
        case "assistPts": aVal = a.assistPts;  bVal = b.assistPts;  break;
        case "fouls":     aVal = a.fouls;      bVal = b.fouls;      break;
        default:          aVal = a.pts;        bVal = b.pts;
      }
      return sortDir === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [players, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else { setSortCol(col); setSortDir("desc"); }
  }

  const thSort = "cursor-pointer select-none px-2 py-2 text-right font-medium hover:text-orange-400 transition-colors";

  if (players.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="px-4 py-2 text-left font-medium">{t("player")}</th>
            <th className={thSort} onClick={() => handleSort("minutes")}>
              MIN <SortIndicator col="minutes" active={sortCol} dir={sortDir} />
            </th>
            <th className={thSort} onClick={() => handleSort("pts")}>
              PTS <SortIndicator col="pts" active={sortCol} dir={sortDir} />
            </th>
            <th className="px-2 py-2 text-right font-medium">FG</th>
            <th className="px-2 py-2 text-right font-medium">3P</th>
            <th className="px-2 py-2 text-right font-medium">FT</th>
            <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("efg")}>
              eFG% <SortIndicator col="efg" active={sortCol} dir={sortDir} />
            </th>
            <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("ts")}>
              TS% <SortIndicator col="ts" active={sortCol} dir={sortDir} />
            </th>
            <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("usage")}>
              USG% <SortIndicator col="usage" active={sortCol} dir={sortDir} />
            </th>
            <th className={thSort} onClick={() => handleSort("assistPts")}>
              AST <SortIndicator col="assistPts" active={sortCol} dir={sortDir} />
            </th>
            <th className={thSort} onClick={() => handleSort("fouls")}>
              PF <SortIndicator col="fouls" active={sortCol} dir={sortDir} />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((p) => {
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

// --- Tabbed Player Table ---

interface TabbedPlayerTableProps {
  awayAbbr: string;
  homeAbbr: string;
  awayPlayers: LivePlayer[];
  homePlayers: LivePlayer[];
  playersByNbaId: Map<string, Player>;
}

function TabbedPlayerTable({ awayAbbr, homeAbbr, awayPlayers, homePlayers, playersByNbaId }: TabbedPlayerTableProps) {
  const [activeTeam, setActiveTeam] = useState<"away" | "home">("away");
  const awayLogo = teamLogoUrl(awayAbbr);
  const homeLogo = teamLogoUrl(homeAbbr);

  if (awayPlayers.length === 0 && homePlayers.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTeam("away")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTeam === "away"
              ? "border-b-2 border-orange-400 text-orange-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {awayLogo && <img src={awayLogo} alt={awayAbbr} className="h-5 w-5 object-contain" />}
          {awayAbbr}
        </button>
        <button
          onClick={() => setActiveTeam("home")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
            activeTeam === "home"
              ? "border-b-2 border-orange-400 text-orange-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          {homeLogo && <img src={homeLogo} alt={homeAbbr} className="h-5 w-5 object-contain" />}
          {homeAbbr}
        </button>
      </div>
      <PlayerTableContent
        players={activeTeam === "away" ? awayPlayers : homePlayers}
        playersByNbaId={playersByNbaId}
      />
    </div>
  );
}

// --- Last Updated ---

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

/** Format a YYYY-MM-DD date string for display */
function formatGameDate(dateStr: string | null | undefined, locale: string): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

// --- Main Component ---

interface LiveGameViewProps {
  gameId: string;
}

export default function LiveGameView({ gameId }: LiveGameViewProps) {
  const { data: allPlayers } = useAllPlayers();
  const { t, locale } = useTranslation();
  const [mobileTab, setMobileTab] = useState<"boxscore" | "pbp">("boxscore");

  // --- Supabase cache check (completed games) ---
  const completedGame = useCompletedGame(gameId);
  const isFromSupabase = completedGame.isFetched && !!completedGame.data;
  const shouldQueryPBP = completedGame.isFetched && !completedGame.data;

  const { data: games } = useTodaysGames({ enabled: shouldQueryPBP });
  const gameInfo = games?.find((g) => g.gameid === gameId);

  const homeRaw = gameInfo ? `${gameInfo.homeTeam} ${gameInfo.homeScore}` : "";
  const awayRaw = gameInfo ? `${gameInfo.awayTeam} ${gameInfo.awayScore}` : "";
  const time = isFromSupabase ? t("finalStatus") : (gameInfo?.time ?? "");
  const isFinal = isFromSupabase || (gameInfo?.isFinal ?? false);

  const home = isFromSupabase
    ? { abbr: completedGame.data!.home_team_abbr, score: completedGame.data!.home_score ?? 0 }
    : parseTeamField(homeRaw);
  const away = isFromSupabase
    ? { abbr: completedGame.data!.away_team_abbr, score: completedGame.data!.away_score ?? 0 }
    : parseTeamField(awayRaw);

  const teamQuery = useLiveGame(gameId, "team", isFinal, { enabled: shouldQueryPBP });
  const playerQuery = useLiveGame(gameId, "player", isFinal, { enabled: shouldQueryPBP });
  const flowQuery = useLiveGame(gameId, "game-flow", isFinal, { enabled: shouldQueryPBP });
  const hasCachedPbp = isFromSupabase && !!completedGame.data?.pbp_data;
  const pbpQuery = useLiveGame(gameId, "possession-by-possession", isFinal, {
    enabled: Boolean(gameId) && (shouldQueryPBP || (isFromSupabase && !hasCachedPbp)),
  });

  const teamData = isFromSupabase ? completedGame.data!.team_data : teamQuery.data;
  const playerData = isFromSupabase ? completedGame.data!.player_data : playerQuery.data;
  const flowData = isFromSupabase ? completedGame.data!.game_flow_data : flowQuery.data;

  const gameNotStarted = teamData?.status === "error" || !teamData?.game_data;

  const teamGameData = teamData?.game_data as
    | { Away?: { FullGame?: Record<string, unknown> }; Home?: { FullGame?: Record<string, unknown> } }
    | undefined;

  const awayTeamStats = teamGameData?.Away?.FullGame ?? {};
  const homeTeamStats = teamGameData?.Home?.FullGame ?? {};

  const detailGameInfo = (playerData?.game_data as { game_info?: { home_score?: number; visitor_score?: number } } | undefined)?.game_info;
  const homeScore = isFromSupabase ? home.score : (detailGameInfo?.home_score ?? home.score);
  const awayScore = isFromSupabase ? away.score : (detailGameInfo?.visitor_score ?? away.score);

  const playerGameData = playerData?.game_data as
    | { home_rows?: PbpStatsStatRow[]; visitor_rows?: PbpStatsStatRow[]; home_headers?: PbpStatsHeader[]; visitor_headers?: PbpStatsHeader[] }
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

  const playersByNbaId = useMemo(() => {
    const map = new Map<string, Player>();
    if (allPlayers) {
      for (const p of allPlayers) {
        map.set(String(p.nba_id), p);
      }
    }
    return map;
  }, [allPlayers]);

  const flowGameData = flowData?.game_data as
    | { score_margins?: ScoreMargin[]; max_time?: number }
    | undefined;
  const scoreMargins = flowGameData?.score_margins ?? [];
  const maxTime = flowGameData?.max_time ?? 2880;

  const pbpSource = hasCachedPbp ? completedGame.data!.pbp_data : pbpQuery.data;
  const pbpGameData = pbpSource?.game_data as
    | { possessions?: Possession[] }
    | undefined;
  const possessions = pbpGameData?.possessions ?? [];

  const isRefetching =
    !isFromSupabase &&
    (teamQuery.isFetching || playerQuery.isFetching || flowQuery.isFetching || pbpQuery.isFetching);
  const lastUpdated = isFromSupabase
    ? 0
    : Math.max(
        teamQuery.dataUpdatedAt ?? 0,
        playerQuery.dataUpdatedAt ?? 0,
        flowQuery.dataUpdatedAt ?? 0,
        pbpQuery.dataUpdatedAt ?? 0,
      );

  const gameDate = isFromSupabase
    ? formatGameDate(completedGame.data!.game_date, locale)
    : gameInfo
      ? new Date().toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : null;

  const homeTeamUrl = teamPageUrl(home.abbr);
  const awayTeamUrl = teamPageUrl(away.abbr);
  const awayLogo = teamLogoUrl(away.abbr);
  const homeLogo = teamLogoUrl(home.abbr);

  const hasTeamStats = Object.keys(awayTeamStats).length > 0 || Object.keys(homeTeamStats).length > 0;

  // --- Render ---

  return (
    <div>
      {/* ── Sticky Scoreboard Bar ── */}
      <div className="sticky top-14 z-30 border-b border-gray-200/60 bg-white/95 backdrop-blur-sm dark:border-gray-800/60 dark:bg-gray-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
          {/* Back link */}
          <a href="/" className="text-sm text-gray-500 transition-colors hover:text-orange-400">
            ← {t("back")}
          </a>

          {/* Center: Score */}
          <div className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-3">
              {/* Away team */}
              {awayTeamUrl ? (
                <a href={awayTeamUrl} className="flex items-center gap-1.5 transition-opacity hover:opacity-75">
                  {awayLogo && <img src={awayLogo} alt={away.abbr} className="h-6 w-6 object-contain" />}
                  <span className="hidden text-xs font-semibold text-gray-500 dark:text-gray-400 sm:inline">{away.abbr}</span>
                </a>
              ) : (
                <div className="flex items-center gap-1.5">
                  {awayLogo && <img src={awayLogo} alt={away.abbr} className="h-6 w-6 object-contain" />}
                  <span className="hidden text-xs font-semibold text-gray-500 dark:text-gray-400 sm:inline">{away.abbr}</span>
                </div>
              )}

              <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                {awayScore}
              </span>

              {/* Status */}
              <div className="mx-1">
                {gameNotStarted ? (
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{time}</span>
                ) : isFinal ? (
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-700/60 dark:text-gray-400">
                    {time.split("/")[0].trim()}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-semibold text-red-400">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
                    {t("liveTag")}
                  </span>
                )}
              </div>

              <span className="text-xl font-black tabular-nums text-gray-900 dark:text-white">
                {homeScore}
              </span>

              {/* Home team */}
              {homeTeamUrl ? (
                <a href={homeTeamUrl} className="flex items-center gap-1.5 transition-opacity hover:opacity-75">
                  <span className="hidden text-xs font-semibold text-gray-500 dark:text-gray-400 sm:inline">{home.abbr}</span>
                  {homeLogo && <img src={homeLogo} alt={home.abbr} className="h-6 w-6 object-contain" />}
                </a>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="hidden text-xs font-semibold text-gray-500 dark:text-gray-400 sm:inline">{home.abbr}</span>
                  {homeLogo && <img src={homeLogo} alt={home.abbr} className="h-6 w-6 object-contain" />}
                </div>
              )}
            </div>

            {/* Game date */}
            {gameDate && (
              <p className="text-[10px] capitalize text-gray-400 dark:text-gray-500">{gameDate}</p>
            )}
          </div>

          {/* Refresh status */}
          <div className="flex items-center gap-2">
            {isRefetching && (
              <div className="h-2 w-2 animate-spin rounded-full border border-orange-400 border-t-transparent" />
            )}
            {lastUpdated > 0 && <LastUpdated dataUpdatedAt={lastUpdated} />}
          </div>
        </div>

        {/* ── Mobile Tab Bar (Box Score / PBP) ── */}
        {!gameNotStarted && (
          <div className="flex border-t border-gray-200/60 dark:border-gray-800/60 lg:hidden">
            <button
              onClick={() => setMobileTab("boxscore")}
              className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors ${
                mobileTab === "boxscore"
                  ? "border-b-2 border-orange-400 text-orange-400"
                  : "text-gray-500"
              }`}
            >
              {t("boxScore")}
            </button>
            <button
              onClick={() => setMobileTab("pbp")}
              className={`flex-1 py-2 text-center text-xs font-semibold uppercase tracking-wider transition-colors ${
                mobileTab === "pbp"
                  ? "border-b-2 border-orange-400 text-orange-400"
                  : "text-gray-500"
              }`}
            >
              {t("pbpTab")}
            </button>
          </div>
        )}
      </div>

      {/* ── Main Content ── */}
      {gameNotStarted ? (
        <div className="mx-auto max-w-7xl px-4 py-12">
          <p className="text-center text-sm text-gray-500">{t("gameNotStarted")}</p>
        </div>
      ) : (
        <div className="mx-auto max-w-[1440px] px-4 py-6 lg:grid lg:grid-cols-[1fr_400px] lg:gap-6">
          {/* ── Left column: Flow + Stats + Players ── */}
          <div className={`space-y-6 ${mobileTab === "pbp" ? "hidden lg:block" : ""}`}>
            {/* Game Flow Chart */}
            {scoreMargins.length > 0 && (
              <GameFlowChart
                margins={scoreMargins}
                maxTime={maxTime}
                homeAbbr={home.abbr}
                awayAbbr={away.abbr}
              />
            )}

            {/* Team Stats Comparison */}
            {hasTeamStats && (
              <TeamStatsComparison
                awayAbbr={away.abbr}
                homeAbbr={home.abbr}
                awayStats={awayTeamStats}
                homeStats={homeTeamStats}
              />
            )}

            {/* Player Box Score (tabbed) */}
            <TabbedPlayerTable
              awayAbbr={away.abbr}
              homeAbbr={home.abbr}
              awayPlayers={awayPlayers}
              homePlayers={homePlayers}
              playersByNbaId={playersByNbaId}
            />
          </div>

          {/* ── Right column: Play-by-Play (sticky on desktop) ── */}
          <div className={`${mobileTab === "boxscore" ? "hidden lg:block" : ""} lg:self-start lg:sticky lg:top-28`}>
            {possessions.length > 0 && (
              <PlayByPlay
                possessions={possessions}
                homeAbbr={home.abbr}
                awayAbbr={away.abbr}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
