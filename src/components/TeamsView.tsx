import { useEffect, useState } from "react";
import teamsData from "../data/teams.json";

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
    <div className="flex flex-col items-center rounded-lg bg-gray-800/60 px-3 py-2">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-semibold ${highlight ? "text-orange-400" : "text-white"}`}>
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
}: {
  team: PbpTeam;
  rank: number;
  onClick: () => void;
  expanded: boolean;
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
        className="cursor-pointer border-b border-gray-800/40 transition-colors hover:bg-gray-800/30"
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
              <div className="font-semibold text-white">{teamName}</div>
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
        <td className="px-4 py-3 text-center text-sm text-gray-300">{offRtg}</td>
        <td className="px-4 py-3 text-center text-sm text-gray-300">{defRtg}</td>
        <td className="px-4 py-3 text-center text-sm text-gray-400">
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
        <td className="px-4 py-3 text-center text-xs text-gray-600">
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
        <tr className="border-b border-gray-800/40 bg-gray-900/50">
          <td colSpan={9} className="px-4 py-4">
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              <StatBadge label="Asistencias" value={String(team.Assists)} />
              <StatBadge label="Rebotes" value={String(team.Rebounds)} />
              <StatBadge label="Robos" value={String(team.Steals)} />
              <StatBadge label="Tapones" value={String(team.Blocks)} />
              <StatBadge label="Pérdidas" value={String(team.Turnovers)} />
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
  const [teams, setTeams] = useState<PbpTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("netRtg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await fetch(
          "https://api.pbpstats.com/get-totals/nba?Season=2024-25&SeasonType=Regular+Season&Type=Team",
        );
        if (!res.ok) throw new Error("Failed");
        const data: PbpResponse = await res.json();
        setTeams(data.multi_row_table_data);
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
            className="h-14 animate-pulse rounded-lg bg-gray-800/40"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900 p-8 text-center text-gray-500">
        No se pudieron cargar los datos de equipos.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Equipos NBA</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Temporada 2024-25 · Regular Season
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Equipo
                </th>
                <SortHeader label="Net Rtg" sortK="netRtg" title="Net Rating (Off - Def por 100 posesiones)" />
                <SortHeader label="Off Rtg" sortK="offRtg" title="Offensive Rating (puntos por 100 posesiones)" />
                <SortHeader label="Def Rtg" sortK="defRtg" title="Defensive Rating (puntos permitidos por 100 posesiones)" />
                <SortHeader label="Pace" sortK="pace" title="Ritmo de juego (posesiones por 48 min)" />
                <SortHeader label="3P%" sortK="fg3Pct" title="Porcentaje de triples" />
                <SortHeader label="+/-" sortK="plusMinus" title="Diferencial de puntos en la temporada" />
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
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-700">
        Fuente: pbpstats.com · Datos actualizados en tiempo real
      </p>
    </div>
  );
}
