import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "../hooks/useTranslation";
import type { Possession } from "../types/games";

// --- Types ---

interface QuarterGroup {
  quarter: number;
  label: string;
  possessions: Possession[];
}

interface PlayByPlayProps {
  possessions: Possession[];
  homeAbbr: string;
  awayAbbr: string;
}

// --- Helpers ---

function groupByQuarter(possessions: Possession[], t: (key: string) => string): QuarterGroup[] {
  const groups: QuarterGroup[] = [];
  let quarter = 0;

  for (const p of possessions) {
    if (p.start_period) {
      quarter++;
      const label =
        quarter <= 4
          ? t("pbpQuarter").replace("{n}", String(quarter))
          : t("pbpOvertime").replace("{n}", String(quarter - 4));
      groups.push({ quarter, label, possessions: [] });
    }
    if (groups.length > 0) {
      groups[groups.length - 1].possessions.push(p);
    }
  }

  return groups;
}

/** Parse time from event string like "11:56.00 Jump Ball..." */
function parseEventTime(event: string): string {
  const match = event.match(/^(\d{1,2}:\d{2})/);
  return match ? match[1] : "";
}

/** Remove the timestamp prefix from an event string */
function parseEventText(event: string): string {
  return event.replace(/^\d{1,2}:\d{2}\.\d{0,2}\s*/, "");
}

// --- Component ---

export default function PlayByPlay({ possessions, homeAbbr, awayAbbr }: PlayByPlayProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const quarters = useMemo(() => groupByQuarter(possessions, t), [possessions, t]);

  // Start with the last quarter expanded
  const [expanded, setExpanded] = useState<Set<number>>(() => {
    if (quarters.length === 0) return new Set<number>();
    return new Set([quarters[quarters.length - 1].quarter]);
  });

  // Scroll to bottom when component mounts (show latest plays)
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  if (quarters.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800/60">
        <p className="text-center text-sm text-gray-500">{t("pbpNoData")}</p>
      </div>
    );
  }

  const allExpanded = expanded.size === quarters.length;

  function toggleQuarter(q: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(q)) next.delete(q);
      else next.add(q);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setExpanded(new Set());
    } else {
      setExpanded(new Set(quarters.map((g) => g.quarter)));
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/60">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {t("playByPlay")}
        </p>
        <button
          onClick={toggleAll}
          className="text-xs text-gray-400 transition-colors hover:text-orange-400"
        >
          {allExpanded ? t("pbpCollapseAll") : t("pbpExpandAll")}
        </button>
      </div>

      {/* Quarters */}
      <div ref={scrollRef} className="max-h-[600px] overflow-y-auto">
        {quarters.map((group) => {
          const isOpen = expanded.has(group.quarter);
          return (
            <div key={group.quarter}>
              {/* Quarter header */}
              <button
                onClick={() => toggleQuarter(group.quarter)}
                className="flex w-full items-center justify-between border-b border-gray-100 bg-gray-50 px-4 py-2 text-left transition-colors hover:bg-gray-100 dark:border-gray-700/50 dark:bg-gray-800/40 dark:hover:bg-gray-700/40"
              >
                <span className="text-xs font-bold text-gray-700 dark:text-gray-200">
                  {group.label}
                </span>
                <span className="text-xs text-gray-400">
                  {isOpen ? "▾" : "▸"} {group.possessions.length}
                </span>
              </button>

              {/* Possessions */}
              {isOpen && (
                <div className="divide-y divide-gray-50 dark:divide-gray-700/30">
                  {group.possessions.map((p) => {
                    const isHome = p.home_team_on_offense;
                    const teamAbbr = isHome ? homeAbbr : awayAbbr;
                    const dotColor = isHome ? "bg-orange-400" : "bg-blue-400";
                    const resultIcon =
                      p.possession_result === "scored"
                        ? "bg-green-400"
                        : p.possession_result === "turnover"
                          ? "bg-red-400"
                          : null;

                    return (
                      <div
                        key={p.number}
                        className="flex gap-3 px-4 py-2 hover:bg-gray-50/50 dark:hover:bg-gray-700/20"
                      >
                        {/* Team indicator */}
                        <div className="flex flex-col items-center gap-1 pt-0.5">
                          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                          {resultIcon && (
                            <span className={`h-1.5 w-1.5 rounded-full ${resultIcon}`} />
                          )}
                        </div>

                        {/* Events */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[10px] font-bold ${
                                isHome ? "text-orange-400" : "text-blue-400"
                              }`}
                            >
                              {teamAbbr}
                            </span>
                            {p.events.length > 0 && (
                              <span className="text-[10px] text-gray-400">
                                {parseEventTime(p.events[0])}
                              </span>
                            )}
                          </div>
                          {p.events.map((event, i) => (
                            <p
                              key={i}
                              className="text-xs leading-relaxed text-gray-600 dark:text-gray-400"
                            >
                              {parseEventText(event)}
                            </p>
                          ))}
                        </div>

                        {/* Score */}
                        <div className="flex-shrink-0 self-center">
                          <span className="font-mono text-[10px] text-gray-400">{p.score}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
