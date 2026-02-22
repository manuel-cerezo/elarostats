import { useEffect, useState } from "react";
import teamsData from "../data/teams.json";
import { useTranslation } from "../hooks/useTranslation";
import { supabase } from "../lib/supabase";

interface PbpTeam {
  EntityId: number;
  TeamId: number;
  Name: string;
  TeamAbbreviation: string;
  GamesPlayed: number;
  PlusMinus: number;
  Points: number;
  OpponentPoints: number;
  Pace: number;
  OffPoss: number;
  DefPoss: number;
  Assists: number;
  Rebounds: number;
  Steals: number;
  Blocks: number;
  Turnovers: number;
  FG3M: number;
  FG3A: number;
  FG2M: number;
  FG2A: number;
  AtRimFGM: number;
  AtRimFGA: number;
  EfgPct?: number;
  TsPct?: number;
  [key: string]: unknown;
}

interface PbpResponse {
  multi_row_table_data: PbpTeam[];
}

const localTeamById = new Map(teamsData.map((t) => [t.teamId, t]));

// Derived stats helpers
function pct(made: number, attempted: number): string {
  if (!attempted) return "—";
  return ((made / attempted) * 100).toFixed(1) + "%";
}

function round(val: number | undefined, decimals = 1): string {
  if (val === undefined || val === null || isNaN(val as number)) return "—";
  return (val as number).toFixed(decimals);
}

function signed(val: number): string {
  const v = val.toFixed(1);
  return val >= 0 ? `+${v}` : v;
}

function ptsPerPoss(pts: number, poss: number): string {
  if (!poss) return "—";
  return ((pts / poss) * 100).toFixed(1);
}

function StatBadge({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800/60">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-orange-400" : "text-gray-900 dark:text-white"}`}>
        {value}
      </span>
    </div>
  );
}

function TeamRow({
  team,
  rank,
  onClick,
  expanded,
  t,
}: {
  team: PbpTeam;
  rank: number;
  onClick: () => void;
  expanded: boolean;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const localTeam = localTeamById.get(team.TeamId);
  const teamName = localTeam?.teamName ?? team.Name;
  const teamLogoUrl = `/teams/${team.TeamId}.svg`;

  const offRtg = ptsPerPoss(team.Points, team.OffPoss);
  const defRtg = ptsPerPoss(team.OpponentPoints, team.DefPoss);
  const netRtg =
    team.OffPoss && team.DefPoss
      ? signed(
          (team.Points / team.OffPoss) * 100 -
            (team.OpponentPoints / team.DefPoss) * 100,
        )
      : "—";

  const fg3Pct = pct(team.FG3M, team.FG3A);
  const atRimPct = pct(team.AtRimFGM, team.AtRimFGA);

  return (
    <>
      <tr
        className="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-50 dark:border-gray-800/40 dark:hover:bg-gray-800/30"
        onClick={onClick}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-600">{rank}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src={teamLogoUrl}
              alt={team.TeamAbbreviation}
              className="h-8 w-8 flex-shrink-0 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div>
              <div className="font-semibold text-gray-900 dark:text-white">{teamName}</div>
              <div className="text-xs text-gray-500">{team.TeamAbbreviation}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`text-sm font-semibold ${Number(netRtg) > 0 ? "text-green-400" : Number(netRtg) < 0 ? "text-red-400" : "text-gray-400"}`}
          >
            {netRtg}
          </span>
        </td>
        <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{offRtg}</td>
        <td className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">{defRtg}</td>
        <td className="px-4 py-3 text-center text-sm text-gray-600 dark:text-gray-400">
          {round(team.Pace)}
        </td>
        <td className="px-4 py-3 text-center text-sm text-gray-400">{fg3Pct}</td>
        <td className="px-4 py-3 text-center">
          <span
            className={`text-sm font-medium ${team.PlusMinus > 0 ? "text-green-400" : team.PlusMinus < 0 ? "text-red-400" : "text-gray-400"}`}
          >
            {signed(team.PlusMinus)}
          </span>
        </td>
        <td className="px-4 py-3 text-center text-xs text-gray-400 dark:text-gray-600">
          <svg
            className={`mx-auto h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50 dark:border-gray-800/40 dark:bg-gray-900/50">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <StatBadge label={t("assists")} value={String(team.Assists)} />
              <StatBadge label={t("rebounds")} value={String(team.Rebounds)} />
              <StatBadge label={t("steals")} value={String(team.Steals)} />
              <StatBadge label={t("blocks")} value={String(team.Blocks)} />
              <StatBadge label={t("turnovers")} value={String(team.Turnovers)} />
              <StatBadge label="At Rim %" value={atRimPct} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

type SortKey = "netRtg" | "offRtg" | "defRtg" | "pace" | "fg3Pct" | "plusMinus";

function getNetRtg(team: PbpTeam): number {
  if (!team.OffPoss || !team.DefPoss) return 0;
  return (
    (team.Points / team.OffPoss) * 100 -
    (team.OpponentPoints / team.DefPoss) * 100
  );
}

export default function TeamsView() {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<PbpTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("netRtg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchTeams() {
      try {
        if (!supabase) throw new Error("Supabase not configured");
        const { data, error: sbError } = await supabase
          .from("pbp_team_totals")
          .select(
            "entity_id, name, team_abbreviation, games_played, points, plus_minus, off_poss, def_poss, fg2m, fg2a, fg3m, fg3a, at_rim_fgm, at_rim_fga, assists, rebounds, steals, blocks, turnovers, efg_pct, ts_pct, opponent_points, raw_data",
          )
          .eq("season", "2025-26")
          .eq("season_type", "Regular Season");
        if (sbError || !data?.length) throw new Error("No data");
        setTeams(
          data.map((r) => {
            const raw = (r.raw_data ?? {}) as Record<string, unknown>;
            return {
              EntityId: r.entity_id,
              TeamId: r.entity_id,
              Name: r.name,
              TeamAbbreviation: r.team_abbreviation ?? "",
              GamesPlayed: r.games_played ?? 0,
              PlusMinus: r.plus_minus ?? 0,
              Points: r.points ?? 0,
              OpponentPoints: r.opponent_points ?? 0,
              Pace: Number(raw.Pace) || 0,
              OffPoss: r.off_poss ?? 0,
              DefPoss: r.def_poss ?? 0,
              Assists: r.assists ?? 0,
              Rebounds: r.rebounds ?? 0,
              Steals: r.steals ?? 0,
              Blocks: r.blocks ?? 0,
              Turnovers: r.turnovers ?? 0,
              FG3M: r.fg3m ?? 0,
              FG3A: r.fg3a ?? 0,
              FG2M: r.fg2m ?? 0,
              FG2A: r.fg2a ?? 0,
              AtRimFGM: r.at_rim_fgm ?? 0,
              AtRimFGA: r.at_rim_fga ?? 0,
              EfgPct: r.efg_pct != null ? Number(r.efg_pct) : undefined,
              TsPct: r.ts_pct != null ? Number(r.ts_pct) : undefined,
            };
          }),
        );
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortedTeams = [...teams].sort((a, b) => {
    let aVal = 0;
    let bVal = 0;

    switch (sortKey) {
      case "netRtg":
        aVal = getNetRtg(a);
        bVal = getNetRtg(b);
        break;
      case "offRtg":
        aVal = a.OffPoss ? (a.Points / a.OffPoss) * 100 : 0;
        bVal = b.OffPoss ? (b.Points / b.OffPoss) * 100 : 0;
        break;
      case "defRtg":
        aVal = a.DefPoss ? (a.OpponentPoints / a.DefPoss) * 100 : 0;
        bVal = b.DefPoss ? (b.OpponentPoints / b.DefPoss) * 100 : 0;
        // For defense, lower is better, invert for desc sort
        if (sortDir === "desc") return aVal - bVal;
        return bVal - aVal;
      case "pace":
        aVal = a.Pace ?? 0;
        bVal = b.Pace ?? 0;
        break;
      case "fg3Pct":
        aVal = a.FG3A ? a.FG3M / a.FG3A : 0;
        bVal = b.FG3A ? b.FG3M / b.FG3A : 0;
        break;
      case "plusMinus":
        aVal = a.PlusMinus ?? 0;
        bVal = b.PlusMinus ?? 0;
        break;
    }

    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  function SortHeader({
    label,
    sortK,
    title,
  }: {
    label: string;
    sortK: SortKey;
    title?: string;
  }) {
    const active = sortKey === sortK;
    return (
      <th
        className="cursor-pointer px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors hover:text-orange-400"
        onClick={() => toggleSort(sortK)}
        title={title}
      >
        <span className={active ? "text-orange-400" : "text-gray-500"}>
          {label}
          {active && (
            <span className="ml-1">{sortDir === "desc" ? "↓" : "↑"}</span>
          )}
        </span>
      </th>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800/40"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 dark:border-gray-700/50 dark:bg-gray-900">
        {t("errorLoadingTeams")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("teamsPageTitle")}</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          {t("teamsSeason")}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700/50 dark:bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t("teamLabel")}
                </th>
                <SortHeader label="Net Rtg" sortK="netRtg" title={t("netRtgTitle")} />
                <SortHeader label="Off Rtg" sortK="offRtg" title={t("offRtgTitle")} />
                <SortHeader label="Def Rtg" sortK="defRtg" title={t("defRtgTitle")} />
                <SortHeader label="Pace" sortK="pace" title={t("paceTitle")} />
                <SortHeader label="3P%" sortK="fg3Pct" title={t("fg3PctTitle")} />
                <SortHeader label="+/-" sortK="plusMinus" title={t("plusMinusTitle")} />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedTeams.map((team, index) => (
                <TeamRow
                  key={team.TeamId}
                  team={team}
                  rank={index + 1}
                  onClick={() =>
                    setExpandedId(expandedId === team.TeamId ? null : team.TeamId)
                  }
                  expanded={expandedId === team.TeamId}
                  t={t}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-700">
        Fuente: pbpstats.com · Datos actualizados diariamente
      </p>
    </div>
  );
}
