import { useState, useMemo } from "react";
import { useGameLogs } from "../hooks/useGameLogs";
import { useTranslation } from "../hooks/useTranslation";

// --- Types ---

interface ParsedLog {
  date: string;
  gameId: string;
  opponent: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  to: number;
  fgm: number;
  fga: number;
  fg3m: number;
  fg3a: number;
  efg: number;
  ts: number;
  pace: number;
}

type SortCol = "date" | "pts" | "reb" | "ast" | "stl" | "to" | "fg" | "fg3" | "efg" | "ts";
type SortDir = "asc" | "desc";

// --- Helpers ---

function pct(made: number, attempts: number): string {
  if (attempts === 0) return "—";
  return ((made / attempts) * 100).toFixed(1);
}

function formatDate(dateStr: string, locale: string): string {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    return d.toLocaleDateString(locale === "en" ? "en-US" : "es-ES", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return dateStr;
  }
}

// --- Sort indicator ---

function SortIndicator({ col, active, dir }: { col: SortCol; active: SortCol; dir: SortDir }) {
  if (col !== active) return <span className="ml-0.5 opacity-30">{"\u2195\uFE0E"}</span>;
  return (
    <span className="ml-0.5 text-orange-400">
      {dir === "desc" ? "\u2193\uFE0E" : "\u2191\uFE0E"}
    </span>
  );
}

// --- Component ---

interface TeamGameLogsProps {
  teamId: number;
}

export default function TeamGameLogs({ teamId }: TeamGameLogsProps) {
  const { data, isLoading, isError } = useGameLogs("Team", teamId);
  const { t, locale } = useTranslation();
  const [sortCol, setSortCol] = useState<SortCol>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const logs = useMemo<ParsedLog[]>(() => {
    if (!data?.multi_row_table_data) return [];
    return data.multi_row_table_data.map((row) => {
      const fg2m = Number(row.FG2M ?? 0);
      const fg2a = Number(row.FG2A ?? 0);
      const fg3m = Number(row.FG3M ?? 0);
      const fg3a = Number(row.FG3A ?? 0);
      return {
        date: String(row.Date ?? ""),
        gameId: String(row.GameId ?? ""),
        opponent: String(row.Opponent ?? ""),
        pts: Number(row.Points ?? 0),
        reb: Number(row.Rebounds ?? 0),
        ast: Number(row.Assists ?? 0),
        stl: Number(row.Steals ?? 0),
        blk: Number(row.Blocks ?? 0),
        to: Number(row.Turnovers ?? 0),
        fgm: fg2m + fg3m,
        fga: fg2a + fg3a,
        fg3m,
        fg3a,
        efg: Number(row.EfgPct ?? 0),
        ts: Number(row.TsPct ?? 0),
        pace: Number(row.Pace ?? 0),
      };
    });
  }, [data]);

  const sorted = useMemo(() => {
    return [...logs].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;
      switch (sortCol) {
        case "date":
          aVal = a.date;
          bVal = b.date;
          return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        case "pts":
          aVal = a.pts;
          bVal = b.pts;
          break;
        case "reb":
          aVal = a.reb;
          bVal = b.reb;
          break;
        case "ast":
          aVal = a.ast;
          bVal = b.ast;
          break;
        case "stl":
          aVal = a.stl;
          bVal = b.stl;
          break;
        case "to":
          aVal = a.to;
          bVal = b.to;
          break;
        case "fg":
          aVal = a.fga > 0 ? a.fgm / a.fga : 0;
          bVal = b.fga > 0 ? b.fgm / b.fga : 0;
          break;
        case "fg3":
          aVal = a.fg3a > 0 ? a.fg3m / a.fg3a : 0;
          bVal = b.fg3a > 0 ? b.fg3m / b.fg3a : 0;
          break;
        case "efg":
          aVal = a.efg;
          bVal = b.efg;
          break;
        case "ts":
          aVal = a.ts;
          bVal = b.ts;
          break;
        default:
          aVal = a.pts;
          bVal = b.pts;
      }
      return sortDir === "desc"
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
    });
  }, [logs, sortCol, sortDir]);

  function handleSort(col: SortCol) {
    if (sortCol === col) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortCol(col);
      setSortDir("desc");
    }
  }

  const thSort =
    "cursor-pointer select-none px-2 py-2 text-right font-medium hover:text-orange-400 transition-colors";

  if (isLoading) {
    return (
      <div className="mt-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("gameLogs")}
        </p>
        <p className="text-center text-sm text-gray-500">{t("gameLogsLoading")}</p>
      </div>
    );
  }

  if (isError || logs.length === 0) {
    return (
      <div className="mt-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t("gameLogs")}
        </p>
        <p className="text-center text-sm text-gray-500">{t("gameLogsNoData")}</p>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t("gameLogs")}
      </p>
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/40">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500">
              <th className={thSort} onClick={() => handleSort("date")}>
                {t("gameLogsDate")} <SortIndicator col="date" active={sortCol} dir={sortDir} />
              </th>
              <th className="px-2 py-2 text-left font-medium">{t("gameLogsOpponent")}</th>
              <th className={thSort} onClick={() => handleSort("pts")}>
                {t("gameLogsPts")} <SortIndicator col="pts" active={sortCol} dir={sortDir} />
              </th>
              <th className={thSort} onClick={() => handleSort("reb")}>
                {t("gameLogsReb")} <SortIndicator col="reb" active={sortCol} dir={sortDir} />
              </th>
              <th className={thSort} onClick={() => handleSort("ast")}>
                {t("gameLogsAst")} <SortIndicator col="ast" active={sortCol} dir={sortDir} />
              </th>
              <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("stl")}>
                {t("gameLogsStl")} <SortIndicator col="stl" active={sortCol} dir={sortDir} />
              </th>
              <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("to")}>
                {t("gameLogsTo")} <SortIndicator col="to" active={sortCol} dir={sortDir} />
              </th>
              <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("fg")}>
                {t("gameLogsFgPct")} <SortIndicator col="fg" active={sortCol} dir={sortDir} />
              </th>
              <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("fg3")}>
                {t("gameLogsFg3Pct")} <SortIndicator col="fg3" active={sortCol} dir={sortDir} />
              </th>
              <th className={thSort} onClick={() => handleSort("efg")}>
                eFG% <SortIndicator col="efg" active={sortCol} dir={sortDir} />
              </th>
              <th className={`hidden sm:table-cell ${thSort}`} onClick={() => handleSort("ts")}>
                TS% <SortIndicator col="ts" active={sortCol} dir={sortDir} />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((log) => (
              <tr
                key={`${log.gameId}-${log.date}`}
                className="border-t border-gray-100 text-gray-600 hover:bg-gray-50 dark:border-gray-700/50 dark:text-gray-300 dark:hover:bg-gray-700/30"
              >
                <td className="whitespace-nowrap px-2 py-2 text-right">
                  <a
                    href={`/games/live?id=${log.gameId}`}
                    className="text-gray-500 transition-colors hover:text-orange-400 dark:text-gray-400"
                  >
                    {formatDate(log.date, locale)}
                  </a>
                </td>
                <td className="whitespace-nowrap px-2 py-2 text-left font-medium text-gray-700 dark:text-gray-200">
                  {log.opponent}
                </td>
                <td className="px-2 py-2 text-right font-semibold text-gray-900 dark:text-white">
                  {log.pts}
                </td>
                <td className="px-2 py-2 text-right">{log.reb}</td>
                <td className="px-2 py-2 text-right">{log.ast}</td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">{log.stl}</td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">{log.to}</td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">
                  {pct(log.fgm, log.fga)}
                </td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">
                  {pct(log.fg3m, log.fg3a)}
                </td>
                <td className="px-2 py-2 text-right">
                  {log.efg > 0 ? (log.efg * 100).toFixed(1) : "—"}
                </td>
                <td className="hidden px-2 py-2 text-right sm:table-cell">
                  {log.ts > 0 ? (log.ts * 100).toFixed(1) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
