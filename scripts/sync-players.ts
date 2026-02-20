/**
 * sync-players.ts
 *
 * Fetches NBA player stats from the databallr API and upserts them into
 * Supabase.  Run this script whenever you want to refresh the data:
 *
 *   npm run sync
 *
 * Rate-limit strategy
 * -------------------
 * The databallr endpoint returns the full season snapshot in a single
 * request, so one call per season is all we need.  We fetch the current
 * season (and optionally previous ones) and upsert the results.  Running
 * the script on a schedule (e.g. once a day via a cron job or a CI
 * workflow) is enough to stay current without ever hitting rate limits.
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config — read from environment variables
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    "Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ---------------------------------------------------------------------------
// Databallr API
// ---------------------------------------------------------------------------

const DATABALLR_BASE =
  "https://api.databallr.com/api/supabase/player_stats_with_metrics";

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

interface DataballrResponse {
  data?: DataballrPlayer[];
  [key: string]: unknown;
}

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

  console.log(`Fetching from databallr (year=${year})…`);

  const res = await fetch(url.toString());

  if (!res.ok) {
    throw new Error(
      `databallr API error ${res.status}: ${res.statusText} [${url}]`,
    );
  }

  // The API returns the array directly or wrapped in a "data" key —
  // handle both shapes.
  const body = (await res.json()) as DataballrPlayer[] | DataballrResponse;

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray((body as DataballrResponse).data)) {
    return (body as DataballrResponse).data!;
  }

  throw new Error("Unexpected response shape from databallr API");
}

// ---------------------------------------------------------------------------
// Supabase upsert
// ---------------------------------------------------------------------------

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

    if (error) {
      throw new Error(`Supabase upsert failed: ${error.message}`);
    }

    console.log(
      `  Upserted rows ${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)} of ${rows.length}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Default: sync the current season.  Pass a year as a CLI arg to override.
  //   npm run sync -- 2025
  const args = process.argv.slice(2);
  const year = args[0] ? parseInt(args[0], 10) : new Date().getFullYear();

  console.log(`=== elarostats player sync  (year: ${year}) ===\n`);

  try {
    const players = await fetchPlayersFromDataballr(year);
    console.log(`Fetched ${players.length} players from databallr\n`);

    await upsertPlayers(players, year);
    console.log(`\nSync complete — ${players.length} players upserted.`);
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
