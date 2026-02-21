import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// Config — variables de entorno inyectadas automáticamente por Supabase
// ---------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DATABALLR_BASE =
  "https://api.databallr.com/api/supabase/player_stats_with_metrics";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DataballrPlayer {
  nba_id: number;
  Name: string;
  ShortName?: string;
  TeamId?: number;
  TeamAbbreviation?: string;
  Pos2?: string;
  year?: number;
  GamesPlayed?: number;
  Minutes?: number;
  MPG?: number;
  TS_pct?: number;
  "3P_PERC"?: number;
  FT_PERC?: number;
  dpm?: number;
  o_dpm?: number;
  d_dpm?: number;
  three_year_rapm?: number;
  Pts75?: number;
  "Offensive Archetype"?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchPlayersFromDataballr(
  year: number,
  minMinutes = 50,
  limit = 500,
): Promise<DataballrPlayer[]> {
  const url = new URL(DATABALLR_BASE);
  url.searchParams.set("year", String(year));
  url.searchParams.set("playoffs", "0");
  url.searchParams.set("min_minutes", String(minMinutes));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("order_by", "dpm");
  url.searchParams.set("order_direction", "desc");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`databallr API error ${res.status}: ${res.statusText}`);
  }

  const body = await res.json() as
    | DataballrPlayer[]
    | { data?: DataballrPlayer[] };

  if (Array.isArray(body)) return body;
  if (Array.isArray((body as { data?: DataballrPlayer[] }).data)) {
    return (body as { data: DataballrPlayer[] }).data;
  }
  throw new Error("Unexpected response shape from databallr API");
}

function mapToRow(p: DataballrPlayer, year: number) {
  return {
    nba_id: p.nba_id,
    name: p.Name,
    short_name: p.ShortName ?? null,
    team_id: p.TeamId ?? null,
    team_abbreviation: p.TeamAbbreviation ?? null,
    pos2: p.Pos2 ?? null,
    year: p.year ?? year,
    games_played: p.GamesPlayed ?? null,
    minutes: p.Minutes ?? null,
    mpg: p.MPG ?? null,
    ts_pct: p.TS_pct ?? null,
    three_p_perc: p["3P_PERC"] ?? null,
    ft_perc: p.FT_PERC ?? null,
    dpm: p.dpm ?? null,
    o_dpm: p.o_dpm ?? null,
    d_dpm: p.d_dpm ?? null,
    three_year_rapm: p.three_year_rapm ?? null,
    pts75: p.Pts75 ?? null,
    offensive_archetype: p["Offensive Archetype"] ?? null,
    raw_data: p,
    synced_at: new Date().toISOString(),
  };
}

async function upsertPlayers(
  supabase: ReturnType<typeof createClient>,
  players: DataballrPlayer[],
  year: number,
): Promise<void> {
  const rows = players.map((p) => mapToRow(p, year));
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from("player_stats")
      .upsert(batch, { onConflict: "nba_id" });
    if (error) throw new Error(`Supabase upsert failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (_req: Request) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      return Response.json(
        { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const year = new Date().getFullYear();

    const players = await fetchPlayersFromDataballr(year);
    await upsertPlayers(supabase, players, year);

    return Response.json({ ok: true, year, synced: players.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
});
