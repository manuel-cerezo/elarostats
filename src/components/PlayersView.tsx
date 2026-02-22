import { useEffect, useState } from "react";
import teamsData from "../data/teams.json";
import { useTranslation } from "../hooks/useTranslation";
import { supabase } from "../lib/supabase";

// --- Types ---

interface PbpPlayer {
  EntityId: number;
  Name: string;
  TeamId: number;
  TeamAbbreviation: string;
  GamesPlayed: number;
  Minutes: number;
  Points: number;
  Assists: number;
  Rebounds: number;
  Steals: number;
  Blocks: number;
  Turnovers: number;
  FG2M: number;
  FG2A: number;
  FG3M: number;
  FG3A: number;
  FtPoints: number;
  PlusMinus: number;
  EfgPct?: number;
  TsPct?: number;
  [key: string]: unknown;
}

// --- Helpers ---

const localTeamById = new Map(teamsData.map((t) => [t.teamId, t]));

function perGame(total: number, games: number): number {
  if (!games) return 0;
  return total / games;
}

function pct(made: number, attempted: number): string {
  if (!attempted) return "—";
  return ((made / attempted) * 100).toFixed(1) + "%";
}

function signed(val: number): string {
  const v = val.toFixed(0);
  return val >= 0 ? `+${v}` : v;
}

function round1(val: number): string {
  return val.toFixed(1);
}

function computeEfgPct(player: PbpPlayer): number {
  const fga = player.FG2A + player.FG3A;
  if (!fga) return 0;
  return (player.FG2M + 1.5 * player.FG3M) / fga;
}

function computeTsPct(player: PbpPlayer): number {
  if (player.TsPct !== undefined && player.TsPct !== null) return player.TsPct;
  // Fallback: TS% = PTS / (2 * (FGA + 0.44 * FTA))
  // We don't have FTA directly, so use EfgPct-based approximation if available
  if (player.EfgPct !== undefined) return player.EfgPct; // better than nothing
  return 0;
}

// --- Sort ---

type SortKey = "ppg" | "apg" | "rpg" | "spg" | "bpg" | "mpg" | "efgPct" | "tsPct" | "fg3Pct" | "plusMinus";

function getSortValue(player: PbpPlayer, key: SortKey): number {
  const gp = player.GamesPlayed || 1;
  switch (key) {
    case "ppg":
      return perGame(player.Points, gp);
    case "apg":
      return perGame(player.Assists, gp);
    case "rpg":
      return perGame(player.Rebounds, gp);
    case "spg":
      return perGame(player.Steals, gp);
    case "bpg":
      return perGame(player.Blocks, gp);
    case "mpg":
      return perGame(player.Minutes, gp);
    case "efgPct":
      return player.EfgPct ?? computeEfgPct(player);
    case "tsPct":
      return computeTsPct(player);
    case "fg3Pct":
      return player.FG3A ? player.FG3M / player.FG3A : 0;
    case "plusMinus":
      return player.PlusMinus ?? 0;
  }
}

// --- Components ---

function PlayerRow({
  player,
  rank,
}: {
  player: PbpPlayer;
  rank: number;
}) {
  const gp = player.GamesPlayed || 1;
  const ppg = round1(perGame(player.Points, gp));
  const rpg = round1(perGame(player.Rebounds, gp));
  const apg = round1(perGame(player.Assists, gp));
  const spg = round1(perGame(player.Steals, gp));
  const bpg = round1(perGame(player.Blocks, gp));
  const mpg = round1(perGame(player.Minutes, gp));

  const efg =
    player.EfgPct != null
      ? (player.EfgPct * 100).toFixed(1) + "%"
      : pct(player.FG2M + 1.5 * player.FG3M, player.FG2A + player.FG3A);
  const ts =
    player.TsPct != null ? (player.TsPct * 100).toFixed(1) + "%" : "—";
  const fg3 = pct(player.FG3M, player.FG3A);
  const pm = signed(player.PlusMinus);

  const localTeam = localTeamById.get(player.TeamId);
  const teamLogoUrl = `/teams/${player.TeamId}.svg`;

  return (
    <tr
      className="cursor-pointer border-b border-gray-800/40 transition-colors hover:bg-gray-800/30"
      onClick={() => {
        window.location.href = `/players/${player.EntityId}`;
      }}
    >
      <td className="px-3 py-2.5 text-sm font-medium text-gray-600">{rank}</td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <div className="flex items-center gap-2">
          <img
            src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.EntityId}.png`}
            alt={player.Name}
            className="h-8 w-8 flex-shrink-0 rounded-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="font-semibold text-white">{player.Name}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2.5">
        <a
          href={`/teams/${player.TeamId}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors hover:bg-gray-800/60"
        >
          <img
            src={teamLogoUrl}
            alt={player.TeamAbbreviation}
            className="h-5 w-5 flex-shrink-0 object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
          <span className="text-xs text-gray-400 hover:text-orange-400">
            {localTeam?.abbreviation ?? player.TeamAbbreviation}
          </span>
        </a>
      </td>
      <td className="px-3 py-2.5 text-center text-sm font-semibold text-orange-400">{ppg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-300">{rpg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-300">{apg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-400">{spg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-400">{bpg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-500">{mpg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-400">{efg}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-400">{ts}</td>
      <td className="px-3 py-2.5 text-center text-sm text-gray-400">{fg3}</td>
      <td className="px-3 py-2.5 text-center">
        <span
          className={`text-sm font-medium ${
            player.PlusMinus > 0
              ? "text-green-400"
              : player.PlusMinus < 0
                ? "text-red-400"
                : "text-gray-400"
          }`}
        >
          {pm}
        </span>
      </td>
    </tr>
  );
}

// --- Main component ---

export default function PlayersView() {
  const { t } = useTranslation();
  const [players, setPlayers] = useState<PbpPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("ppg");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function fetchPlayers() {
      try {
        if (!supabase) throw new Error("Supabase not configured");
        const { data, error: sbError } = await supabase
          .from("pbp_player_totals")
          .select(
            "entity_id, name, team_id, team_abbreviation, games_played, minutes, points, assists, rebounds, steals, blocks, turnovers, fg2m, fg2a, fg3m, fg3a, ft_points, plus_minus, efg_pct, ts_pct",
          )
          .eq("season", "2025-26")
          .eq("season_type", "Regular Season");
        if (sbError || !data?.length) throw new Error("No data");
        setPlayers(
          data.map((r) => ({
            EntityId: r.entity_id,
            Name: r.name,
            TeamId: r.team_id,
            TeamAbbreviation: r.team_abbreviation ?? "",
            GamesPlayed: r.games_played ?? 0,
            Minutes: Number(r.minutes) || 0,
            Points: r.points ?? 0,
            Assists: r.assists ?? 0,
            Rebounds: r.rebounds ?? 0,
            Steals: r.steals ?? 0,
            Blocks: r.blocks ?? 0,
            Turnovers: r.turnovers ?? 0,
            FG2M: r.fg2m ?? 0,
            FG2A: r.fg2a ?? 0,
            FG3M: r.fg3m ?? 0,
            FG3A: r.fg3a ?? 0,
            FtPoints: r.ft_points ?? 0,
            PlusMinus: r.plus_minus ?? 0,
            EfgPct: r.efg_pct != null ? Number(r.efg_pct) : undefined,
            TsPct: r.ts_pct != null ? Number(r.ts_pct) : undefined,
          })),
        );
        setError(false);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const filteredPlayers = players.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.Name.toLowerCase().includes(q) ||
      p.TeamAbbreviation.toLowerCase().includes(q)
    );
  });

  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    const aVal = getSortValue(a, sortKey);
    const bVal = getSortValue(b, sortKey);
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
        className="cursor-pointer whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors hover:text-orange-400"
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
        {Array.from({ length: 15 }, (_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-gray-800/40"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-gray-700/50 bg-gray-900 p-8 text-center text-gray-500">
        {t("errorLoadingPlayersLeaderboard")}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{t("playersPageTitle")}</h1>
        <p className="mt-0.5 text-sm text-gray-500">{t("playersSeason")}</p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <svg
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlayerPlaceholder")}
            className="w-full rounded-lg border border-gray-700 bg-gray-800/60 px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-900">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800/60">
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  #
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t("player")}
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  {t("teamLabel")}
                </th>
                <SortHeader label="PPG" sortK="ppg" title={t("ppgTitle")} />
                <SortHeader label="RPG" sortK="rpg" title={t("rpgTitle")} />
                <SortHeader label="APG" sortK="apg" title={t("apgTitle")} />
                <SortHeader label="SPG" sortK="spg" title={t("spgTitle")} />
                <SortHeader label="BPG" sortK="bpg" title={t("bpgTitle")} />
                <SortHeader label="MPG" sortK="mpg" title={t("mpgTitle")} />
                <SortHeader label="eFG%" sortK="efgPct" title={t("efgPctTitle")} />
                <SortHeader label="TS%" sortK="tsPct" title={t("tsPctTitle")} />
                <SortHeader label="3P%" sortK="fg3Pct" title={t("fg3PctTitle")} />
                <SortHeader label="+/-" sortK="plusMinus" title={t("plusMinusTitle")} />
              </tr>
            </thead>
            <tbody>
              {sortedPlayers.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    {t("noPlayersFound")}
                  </td>
                </tr>
              ) : (
                sortedPlayers.map((player, index) => (
                  <PlayerRow
                    key={player.EntityId}
                    player={player}
                    rank={index + 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-gray-700">
        {t("dataSource")}
      </p>
    </div>
  );
}
