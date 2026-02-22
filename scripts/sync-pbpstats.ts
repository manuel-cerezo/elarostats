/**
 * sync-pbpstats.ts
 *
 * Fetches NBA player & team totals from the pbpstats API and upserts them
 * into Supabase tables (pbp_player_totals, pbp_team_totals).
 *
 *   npm run sync:pbpstats
 *
 * The pbpstats /get-totals endpoint returns ~500 players (2.8 MB) and 30
 * teams (200 KB) per season.  Running this once a day via a GitHub Action
 * keeps the data fresh and avoids CORS / 502 issues in the browser.
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
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

const PBPSTATS_BASE = "https://api.pbpstats.com/get-totals/nba";
const DEFAULT_SEASON = "2025-26";
const DEFAULT_SEASON_TYPE = "Regular+Season";

// ---------------------------------------------------------------------------
// Fetch from pbpstats
// ---------------------------------------------------------------------------

interface PbpRow {
  EntityId: string;
  TeamId: string;
  Name: string;
  TeamAbbreviation: string;
  GamesPlayed: number;
  Minutes: number;
  Points: number;
  Assists: number;
  Rebounds: number;
  OffRebounds?: number;
  DefRebounds?: number;
  Steals: number;
  Blocks: number;
  Turnovers: number;
  FG2M: number;
  FG2A: number;
  FG3M: number;
  FG3A: number;
  FtPoints: number;
  FTA?: number;
  PlusMinus: number;
  OffPoss: number;
  DefPoss: number;
  EfgPct?: number;
  TsPct?: number;
  Usage?: number;
  AtRimFGM?: number;
  AtRimFGA?: number;
  ShortMidRangeFGM?: number;
  ShortMidRangeFGA?: number;
  LongMidRangeFGM?: number;
  LongMidRangeFGA?: number;
  OpponentPoints?: number;
  [key: string]: unknown;
}

interface PbpResponse {
  multi_row_table_data: PbpRow[];
}

async function fetchTotals(type: "Player" | "Team", season: string, seasonType: string): Promise<PbpRow[]> {
  const url = `${PBPSTATS_BASE}?Season=${season}&SeasonType=${seasonType}&Type=${type}`;
  console.log(`Fetching ${type} totals from pbpstats…`);
  console.log(`  URL: ${url}`);

  const res = await fetch(url);
  // pbpstats sometimes returns 502 but with valid body
  const data: PbpResponse = await res.json();

  if (!data.multi_row_table_data?.length) {
    throw new Error(`No data returned for ${type} (status ${res.status})`);
  }

  console.log(`  Got ${data.multi_row_table_data.length} rows`);
  return data.multi_row_table_data;
}

// ---------------------------------------------------------------------------
// Upsert into Supabase
// ---------------------------------------------------------------------------

function mapPlayerRow(p: PbpRow, season: string, seasonType: string) {
  return {
    entity_id: parseInt(p.EntityId, 10),
    season,
    season_type: seasonType.replace("+", " "),
    name: p.Name,
    team_id: parseInt(p.TeamId, 10) || null,
    team_abbreviation: p.TeamAbbreviation ?? null,
    games_played: p.GamesPlayed ?? null,
    minutes: p.Minutes ?? null,
    points: p.Points ?? null,
    assists: p.Assists ?? null,
    rebounds: p.Rebounds ?? null,
    steals: p.Steals ?? null,
    blocks: p.Blocks ?? null,
    turnovers: p.Turnovers ?? null,
    fg2m: p.FG2M ?? null,
    fg2a: p.FG2A ?? null,
    fg3m: p.FG3M ?? null,
    fg3a: p.FG3A ?? null,
    ft_points: p.FtPoints ?? null,
    fta: p.FTA ?? null,
    plus_minus: p.PlusMinus ?? null,
    off_poss: p.OffPoss ?? null,
    def_poss: p.DefPoss ?? null,
    efg_pct: p.EfgPct ?? null,
    ts_pct: p.TsPct ?? null,
    usage: p.Usage ?? null,
    raw_data: p,
    synced_at: new Date().toISOString(),
  };
}

function mapTeamRow(t: PbpRow, season: string, seasonType: string) {
  return {
    entity_id: parseInt(t.EntityId, 10),
    season,
    season_type: seasonType.replace("+", " "),
    name: t.Name,
    team_abbreviation: t.TeamAbbreviation ?? null,
    games_played: t.GamesPlayed ?? null,
    minutes: t.Minutes ?? null,
    points: t.Points ?? null,
    plus_minus: t.PlusMinus ?? null,
    off_poss: t.OffPoss ?? null,
    def_poss: t.DefPoss ?? null,
    fg2m: t.FG2M ?? null,
    fg2a: t.FG2A ?? null,
    fg3m: t.FG3M ?? null,
    fg3a: t.FG3A ?? null,
    ft_points: t.FtPoints ?? null,
    fta: t.FTA ?? null,
    at_rim_fgm: t.AtRimFGM ?? null,
    at_rim_fga: t.AtRimFGA ?? null,
    short_mid_range_fgm: t.ShortMidRangeFGM ?? null,
    short_mid_range_fga: t.ShortMidRangeFGA ?? null,
    long_mid_range_fgm: t.LongMidRangeFGM ?? null,
    long_mid_range_fga: t.LongMidRangeFGA ?? null,
    assists: t.Assists ?? null,
    rebounds: t.Rebounds ?? null,
    off_rebounds: t.OffRebounds ?? null,
    def_rebounds: t.DefRebounds ?? null,
    steals: t.Steals ?? null,
    blocks: t.Blocks ?? null,
    turnovers: t.Turnovers ?? null,
    efg_pct: t.EfgPct ?? null,
    ts_pct: t.TsPct ?? null,
    opponent_points: t.OpponentPoints ?? null,
    raw_data: t,
    synced_at: new Date().toISOString(),
  };
}

async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  conflictKeys: string,
): Promise<void> {
  const BATCH_SIZE = 100;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictKeys });

    if (error) {
      throw new Error(`Supabase upsert to ${table} failed: ${error.message}`);
    }

    console.log(
      `  [${table}] Upserted rows ${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)} of ${rows.length}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const season = process.argv[2] || DEFAULT_SEASON;
  const seasonType = process.argv[3] || DEFAULT_SEASON_TYPE;

  console.log(`=== elarostats pbpstats sync (${season}, ${seasonType.replace("+", " ")}) ===\n`);

  try {
    // Players
    const players = await fetchTotals("Player", season, seasonType);
    const playerRows = players.map((p) => mapPlayerRow(p, season, seasonType));
    await upsertBatch("pbp_player_totals", playerRows, "entity_id,season,season_type");
    console.log(`\nPlayers sync complete — ${players.length} rows.\n`);

    // Teams
    const teams = await fetchTotals("Team", season, seasonType);
    const teamRows = teams.map((t) => mapTeamRow(t, season, seasonType));
    await upsertBatch("pbp_team_totals", teamRows, "entity_id,season,season_type");
    console.log(`\nTeams sync complete — ${teams.length} rows.\n`);

    console.log("All done!");
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
