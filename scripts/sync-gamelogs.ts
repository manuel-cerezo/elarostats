/**
 * sync-gamelogs.ts
 *
 * Fetches per-game logs for every NBA player and team from the NBA Stats API
 * and caches them in Supabase (player_game_logs, team_game_logs).
 *
 * This avoids redundant API calls from the browser — the frontend reads
 * from Supabase first and only falls back when no cached data exists.
 *
 *   npm run sync:gamelogs
 *
 * Volume: 2 API calls total (one bulk endpoint per entity type).
 * Each returns all game logs for all players/teams in the season.
 */

import { createClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing required env vars: SUPABASE_URL and SUPABASE_SERVICE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const NBA_STATS_BASE = "https://stats.nba.com/stats";
const DEFAULT_SEASON = "2025-26";
const DEFAULT_SEASON_TYPE = "Regular Season";
const BATCH_SIZE = 100;

// Headers required by stats.nba.com (returns 403 without them)
const NBA_STATS_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Referer: "https://www.nba.com/",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Origin: "https://www.nba.com",
  Connection: "keep-alive",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NbaStatsResponse {
  resultSets: Array<{
    name: string;
    headers: string[];
    rowSet: Array<Array<unknown>>;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a fetch up to maxRetries times on transient server errors (5xx / network). */
async function fetchWithRetry(
  url: string,
  label: string,
  maxRetries = 3,
  delaysMs = [10_000, 30_000, 60_000],
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url, { headers: NBA_STATS_HEADERS });
    if (res.ok) return res;

    const isTransient = res.status >= 500 || res.status === 429;
    const isLastAttempt = attempt === maxRetries;

    if (isTransient && !isLastAttempt) {
      const delay = delaysMs[attempt] ?? 60_000;
      console.warn(
        `  ⚠ ${label}: ${res.status} ${res.statusText} — retrying in ${delay / 1000}s (attempt ${attempt + 1}/${maxRetries})…`,
      );
      await sleep(delay);
      continue;
    }

    throw new Error(`Failed to fetch ${label}: ${res.status} ${res.statusText}`);
  }
  throw new Error(`Exhausted retries for ${label}`);
}

/** Convert a rowSet row to a keyed object using the headers array. */
function rowToObject(headers: string[], row: unknown[]): Record<string, unknown> {
  return Object.fromEntries(headers.map((h, i) => [h, row[i]]));
}

// ---------------------------------------------------------------------------
// Fetch game logs from NBA Stats API (bulk — all entities in one call)
// ---------------------------------------------------------------------------

async function fetchNbaGameLogs(
  endpoint: "playergamelogs" | "teamgamelogs",
  season: string,
  seasonType: string,
): Promise<Array<Record<string, unknown>>> {
  const url = new URL(`${NBA_STATS_BASE}/${endpoint}`);
  url.searchParams.set("Season", season);
  url.searchParams.set("SeasonType", seasonType);
  url.searchParams.set("LeagueID", "00");

  console.log(`  GET ${url.toString()}`);
  const res = await fetchWithRetry(url.toString(), endpoint);
  const data: NbaStatsResponse = await res.json();

  const resultSet = data.resultSets?.[0];
  if (!resultSet?.rowSet?.length) {
    return [];
  }

  return resultSet.rowSet.map((row) => rowToObject(resultSet.headers, row));
}

// ---------------------------------------------------------------------------
// Mapping functions
// ---------------------------------------------------------------------------

function mapPlayerLogRow(
  row: Record<string, unknown>,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  const fgm = (row.FGM as number) ?? 0;
  const fga = (row.FGA as number) ?? 0;
  const fg3m = (row.FG3M as number) ?? 0;
  const fg3a = (row.FG3A as number) ?? 0;
  const ftm = (row.FTM as number) ?? 0;
  const fta = (row.FTA as number) ?? 0;
  const pts = (row.PTS as number) ?? 0;

  const efgPct = fga > 0 ? Math.round(((fgm + 0.5 * fg3m) / fga) * 1000) / 1000 : null;
  const tsDenom = 2 * (fga + 0.44 * fta);
  const tsPct = tsDenom > 0 ? Math.round((pts / tsDenom) * 1000) / 1000 : null;

  return {
    entity_id: row.PLAYER_ID,
    game_id: row.GAME_ID,
    season,
    season_type: seasonType,
    date: row.GAME_DATE ?? null,
    opponent: row.MATCHUP ?? null,
    points: pts,
    rebounds: row.REB ?? null,
    assists: row.AST ?? null,
    steals: row.STL ?? null,
    blocks: row.BLK ?? null,
    turnovers: row.TOV ?? null,
    minutes: row.MIN ?? null,
    fg2m: fgm - fg3m,
    fg2a: fga - fg3a,
    fg3m,
    fg3a,
    ft_points: ftm,
    fta,
    efg_pct: efgPct,
    ts_pct: tsPct,
    plus_minus: row.PLUS_MINUS ?? null,
    raw_data: row,
    synced_at: new Date().toISOString(),
  };
}

function mapTeamLogRow(
  row: Record<string, unknown>,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  const fgm = (row.FGM as number) ?? 0;
  const fga = (row.FGA as number) ?? 0;
  const fg3m = (row.FG3M as number) ?? 0;
  const fg3a = (row.FG3A as number) ?? 0;
  const ftm = (row.FTM as number) ?? 0;
  const fta = (row.FTA as number) ?? 0;
  const pts = (row.PTS as number) ?? 0;

  const efgPct = fga > 0 ? Math.round(((fgm + 0.5 * fg3m) / fga) * 1000) / 1000 : null;
  const tsDenom = 2 * (fga + 0.44 * fta);
  const tsPct = tsDenom > 0 ? Math.round((pts / tsDenom) * 1000) / 1000 : null;

  return {
    entity_id: row.TEAM_ID,
    game_id: row.GAME_ID,
    season,
    season_type: seasonType,
    date: row.GAME_DATE ?? null,
    opponent: row.MATCHUP ?? null,
    points: pts,
    rebounds: row.REB ?? null,
    assists: row.AST ?? null,
    steals: row.STL ?? null,
    turnovers: row.TOV ?? null,
    fg2m: fgm - fg3m,
    fg2a: fga - fg3a,
    fg3m,
    fg3a,
    ft_points: ftm,
    fta,
    efg_pct: efgPct,
    ts_pct: tsPct,
    raw_data: row,
    synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Batch upsert
// ---------------------------------------------------------------------------

async function upsertBatch(
  table: string,
  rows: Record<string, unknown>[],
  conflictKeys: string,
): Promise<void> {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflictKeys });

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

  console.log(`=== elarostats game logs sync (${season}, ${seasonType}) ===\n`);

  try {
    // ── Player game logs ──────────────────────────────────────────────────

    console.log("Fetching all player game logs from NBA Stats API…");
    const playerRows = await fetchNbaGameLogs("playergamelogs", season, seasonType);
    console.log(`  Received ${playerRows.length} player game log rows.\n`);

    const allPlayerRows = playerRows.map((row) => mapPlayerLogRow(row, season, seasonType));

    if (allPlayerRows.length > 0) {
      console.log("Upserting player game logs…");
      await upsertBatch("player_game_logs", allPlayerRows, "entity_id,game_id");
      console.log(`Player game logs sync complete — ${allPlayerRows.length} rows.\n`);
    }

    // ── Team game logs ────────────────────────────────────────────────────

    console.log("Fetching all team game logs from NBA Stats API…");
    const teamRows = await fetchNbaGameLogs("teamgamelogs", season, seasonType);
    console.log(`  Received ${teamRows.length} team game log rows.\n`);

    const allTeamRows = teamRows.map((row) => mapTeamLogRow(row, season, seasonType));

    if (allTeamRows.length > 0) {
      console.log("Upserting team game logs…");
      await upsertBatch("team_game_logs", allTeamRows, "entity_id,game_id");
      console.log(`Team game logs sync complete — ${allTeamRows.length} rows.\n`);
    }

    // ── Summary ───────────────────────────────────────────────────────────

    console.log("All done!");
    console.log(`  Players: ${allPlayerRows.length} game log rows`);
    console.log(`  Teams: ${allTeamRows.length} game log rows`);
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
