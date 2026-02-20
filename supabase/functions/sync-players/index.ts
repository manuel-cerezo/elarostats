/**
 * Supabase Edge Function — sync-players
 *
 * Fetches the current-season NBA player stats snapshot from the
 * databallr API and upserts every player row into the Supabase
 * `player_stats` table.
 *
 * Triggered daily at 08:00 Europe/Madrid via pg_cron + pg_net
 * (see supabase/migrations/002_setup_cron.sql).
 *
 * Can also be called manually:
 *   curl -X POST https://<project>.supabase.co/functions/v1/sync-players \
 *     -H "Authorization: Bearer <anon-or-service-key>"
 *
 * Optional JSON body:
 *   { "year": 2025 }   — override the season year (defaults to current year)
 */

import { createClient } from "npm:@supabase/supabase-js@2";

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
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  // Only POST is allowed (pg_net calls with POST)
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Parse optional body
  let year = new Date().getFullYear();
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.year && typeof body.year === "number") {
      year = body.year;
    }
  } catch {
    // No body or invalid JSON — use default year
  }

  // Supabase client (service role, bypasses RLS for upsert)
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // 1. Fetch from databallr
    const players = await fetchPlayers(year);

    // 2. Upsert into Supabase in batches of 100
    const total = await upsertPlayers(supabase, players, year);

    return new Response(
      JSON.stringify({ ok: true, year, synced: total }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[sync-players] error:", message);
    return new Response(
      JSON.stringify({ ok: false, error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});

// ---------------------------------------------------------------------------
// databallr fetch
// ---------------------------------------------------------------------------

async function fetchPlayers(year: number): Promise<DataballrPlayer[]> {
  const url = new URL(
    "https://api.databallr.com/api/supabase/player_stats_with_metrics",
  );
  url.searchParams.set("year", String(year));
  url.searchParams.set("playoffs", "0");
  url.searchParams.set("min_minutes", "50");
  url.searchParams.set("limit", "500");
  url.searchParams.set("order_by", "dpm");
  url.searchParams.set("order_direction", "desc");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`databallr ${res.status}: ${res.statusText}`);
  }

  const body = await res.json();
  if (Array.isArray(body)) return body as DataballrPlayer[];
  if (Array.isArray(body?.data)) return body.data as DataballrPlayer[];
  throw new Error("Unexpected databallr response shape");
}

// ---------------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------------

function toRow(p: DataballrPlayer, year: number) {
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
  // deno-lint-ignore no-explicit-any
  supabase: any,
  players: DataballrPlayer[],
  year: number,
): Promise<number> {
  const BATCH = 100;
  let total = 0;

  for (let i = 0; i < players.length; i += BATCH) {
    const rows = players.slice(i, i + BATCH).map((p) => toRow(p, year));
    const { error } = await supabase
      .from("player_stats")
      .upsert(rows, { onConflict: "nba_id" });

    if (error) throw new Error(`Upsert failed: ${error.message}`);
    total += rows.length;
  }

  return total;
}
