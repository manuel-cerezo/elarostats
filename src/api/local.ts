import type { Player } from "../types/player";
import { supabase } from "../lib/supabase";

export type { Player };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps a raw Supabase row (snake_case columns + raw_data JSONB) back to
 * the Player shape the rest of the app expects.
 *
 * Priority: typed column > raw_data field > undefined
 */
function rowToPlayer(row: Record<string, unknown>): Player {
  const raw = (row.raw_data ?? {}) as Record<string, unknown>;

  return {
    nba_id: (row.nba_id as number) ?? (raw.nba_id as number),
    Name: (row.name as string) ?? (raw.Name as string),
    ShortName: (row.short_name as string) ?? (raw.ShortName as string) ?? "",
    TeamAbbreviation:
      (row.team_abbreviation as string) ??
      (raw.TeamAbbreviation as string) ??
      "",
    Pos2: (row.pos2 as string) ?? (raw.Pos2 as string) ?? "",
    GamesPlayed:
      (row.games_played as number) ?? (raw.GamesPlayed as number) ?? 0,
    Minutes: (row.minutes as number) ?? (raw.Minutes as number) ?? 0,
    MPG: (row.mpg as number) ?? (raw.MPG as number) ?? 0,
    TS_pct: (row.ts_pct as number) ?? (raw.TS_pct as number) ?? 0,
    dpm: (row.dpm as number) ?? (raw.dpm as number) ?? 0,
    o_dpm: (row.o_dpm as number) ?? (raw.o_dpm as number) ?? 0,
    d_dpm: (row.d_dpm as number) ?? (raw.d_dpm as number) ?? 0,
    three_year_rapm:
      (row.three_year_rapm as number) ?? (raw.three_year_rapm as number) ?? 0,
    Pts75: (row.pts75 as number) ?? (raw.Pts75 as number) ?? 0,
    FT_PERC: (row.ft_perc as number) ?? (raw.FT_PERC as number) ?? 0,
    "Offensive Archetype":
      (row.offensive_archetype as string) ??
      (raw["Offensive Archetype"] as string) ??
      "",
    "3P_PERC": (row.three_p_perc as number) ?? (raw["3P_PERC"] as number) ?? 0,
    // Spread raw_data so that any extra field from the API is also available
    ...raw,
  };
}

// ---------------------------------------------------------------------------
// Data source — Supabase (siempre requerido)
// ---------------------------------------------------------------------------

let _cachedPlayers: Player[] | null = null;

async function loadPlayers(): Promise<Player[]> {
  if (_cachedPlayers) return _cachedPlayers;

  if (!supabase) {
    throw new Error(
      "[elarostats] Supabase no está configurado. " +
        "Define PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON en tu .env",
    );
  }

  const { data, error } = await supabase
    .from("player_stats")
    .select("*")
    .order("dpm", { ascending: false });

  if (error) {
    throw new Error(`[elarostats] Error consultando Supabase: ${error.message}`);
  }

  _cachedPlayers = (data ?? []).map((row) =>
    rowToPlayer(row as Record<string, unknown>),
  );
  return _cachedPlayers;
}

// ---------------------------------------------------------------------------
// Public API — identical signatures to the previous version so no callers
// need to change.  The only difference is that these are now async.
// ---------------------------------------------------------------------------

export async function searchPlayers(query: string): Promise<Player[]> {
  if (!query.trim()) return [];

  const players = await loadPlayers();
  const q = query.toLowerCase().trim();

  return players.filter(
    (p) =>
      p.Name?.toLowerCase().includes(q) ||
      p.ShortName?.toLowerCase().includes(q) ||
      p.TeamAbbreviation?.toLowerCase().includes(q),
  );
}

export async function getPlayerById(id: number): Promise<Player | undefined> {
  const players = await loadPlayers();
  return players.find((p) => p.nba_id === id);
}

export async function getAllPlayers(): Promise<Player[]> {
  return loadPlayers();
}
