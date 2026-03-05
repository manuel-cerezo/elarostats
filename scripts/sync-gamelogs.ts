/**
 * sync-gamelogs.ts
 *
 * Fetches per-game logs for every NBA player and team from the PBPStats API
 * and caches them in Supabase (player_game_logs, team_game_logs).
 *
 * This avoids redundant API calls from the browser — the frontend reads
 * from Supabase first and only falls back when no cached data exists.
 *
 *   npm run sync:gamelogs
 *
 * Entity IDs are pulled from Supabase tables populated by sync-pbpstats.
 * Each entity requires one API call to PBPStats /get-game-logs/nba.
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

const PBPSTATS_BASE = "https://api.pbpstats.com";
const DEFAULT_SEASON = "2025-26";
const DEFAULT_SEASON_TYPE = "Regular+Season";
const BATCH_SIZE = 100;
const CONCURRENCY = 5;
const DELAY_BETWEEN_BATCHES_MS = 2_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PbpGameLogsResponse {
  multi_row_table_data: Array<Record<string, unknown>>;
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
    const res = await fetch(url);
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

// ---------------------------------------------------------------------------
// Fetch entity IDs from Supabase (populated by sync-pbpstats)
// ---------------------------------------------------------------------------

async function fetchEntityIds(table: string): Promise<number[]> {
  const { data, error } = await supabase.from(table).select("entity_id");

  if (error) {
    throw new Error(`Failed to fetch entity IDs from ${table}: ${error.message}`);
  }

  return (data ?? []).map((row: { entity_id: number }) => row.entity_id);
}

// ---------------------------------------------------------------------------
// Fetch game logs from PBPStats (one entity at a time)
// ---------------------------------------------------------------------------

async function fetchGameLogs(
  entityType: "Player" | "Team",
  entityId: number,
  season: string,
  seasonType: string,
): Promise<Array<Record<string, unknown>>> {
  const params = new URLSearchParams({
    Season: season,
    SeasonType: seasonType,
    EntityType: entityType,
    EntityId: String(entityId),
  });

  const url = `${PBPSTATS_BASE}/get-game-logs/nba?${params.toString()}`;
  const label = `${entityType} ${entityId}`;

  const res = await fetchWithRetry(url, label);
  const data: PbpGameLogsResponse = await res.json();

  return data.multi_row_table_data ?? [];
}

// ---------------------------------------------------------------------------
// Mapping functions (PBPStats keys → Supabase columns)
// ---------------------------------------------------------------------------

function mapPlayerLogRow(
  row: Record<string, unknown>,
  entityId: number,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  const fg2m = (row.FG2M as number) ?? 0;
  const fg2a = (row.FG2A as number) ?? 0;
  const fg3m = (row.FG3M as number) ?? 0;
  const fg3a = (row.FG3A as number) ?? 0;
  const ftPoints = (row.FtPoints as number) ?? 0;
  const fta = (row.FTA as number) ?? 0;

  return {
    entity_id: entityId,
    game_id: row.GameId,
    season,
    season_type: seasonType.replace(/\+/g, " "),
    date: row.Date ?? null,
    opponent: row.Opponent ?? null,
    points: row.Points ?? null,
    rebounds: row.Rebounds ?? null,
    assists: row.Assists ?? null,
    steals: row.Steals ?? null,
    blocks: row.Blocks ?? null,
    turnovers: row.Turnovers ?? null,
    minutes: row.Minutes ?? null,
    fg2m,
    fg2a,
    fg3m,
    fg3a,
    ft_points: ftPoints,
    fta,
    efg_pct: row.EfgPct ?? null,
    ts_pct: row.TsPct ?? null,
    plus_minus: row.PlusMinus ?? null,
    wl: null,
    raw_data: row,
    synced_at: new Date().toISOString(),
  };
}

function mapTeamLogRow(
  row: Record<string, unknown>,
  entityId: number,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  const fg2m = (row.FG2M as number) ?? 0;
  const fg2a = (row.FG2A as number) ?? 0;
  const fg3m = (row.FG3M as number) ?? 0;
  const fg3a = (row.FG3A as number) ?? 0;
  const ftPoints = (row.FtPoints as number) ?? 0;
  const fta = (row.FTA as number) ?? 0;

  return {
    entity_id: entityId,
    game_id: row.GameId,
    season,
    season_type: seasonType.replace(/\+/g, " "),
    date: row.Date ?? null,
    opponent: row.Opponent ?? null,
    points: row.Points ?? null,
    rebounds: row.Rebounds ?? null,
    assists: row.Assists ?? null,
    steals: row.Steals ?? null,
    turnovers: row.Turnovers ?? null,
    fg2m,
    fg2a,
    fg3m,
    fg3a,
    ft_points: ftPoints,
    fta,
    efg_pct: row.EfgPct ?? null,
    ts_pct: row.TsPct ?? null,
    wl: null,
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
// Process entities with concurrency control
// ---------------------------------------------------------------------------

async function processEntities(
  entityType: "Player" | "Team",
  entityIds: number[],
  table: string,
  mapFn: (
    row: Record<string, unknown>,
    entityId: number,
    season: string,
    seasonType: string,
  ) => Record<string, unknown>,
  season: string,
  seasonType: string,
): Promise<number> {
  let totalRows = 0;
  let failed = 0;

  // Process in concurrent batches
  for (let i = 0; i < entityIds.length; i += CONCURRENCY) {
    const batch = entityIds.slice(i, i + CONCURRENCY);

    const results = await Promise.allSettled(
      batch.map(async (entityId) => {
        const logs = await fetchGameLogs(entityType, entityId, season, seasonType);
        return { entityId, logs };
      }),
    );

    const allRows: Record<string, unknown>[] = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        const { entityId, logs } = result.value;
        const mapped = logs.map((row) => mapFn(row, entityId, season, seasonType));
        allRows.push(...mapped);
      } else {
        failed++;
        console.warn(`  ⚠ ${entityType} fetch failed: ${result.reason}`);
      }
    }

    if (allRows.length > 0) {
      await upsertBatch(table, allRows, "entity_id,game_id");
      totalRows += allRows.length;
    }

    const processed = Math.min(i + CONCURRENCY, entityIds.length);
    console.log(
      `  Progress: ${processed}/${entityIds.length} ${entityType.toLowerCase()}s processed (${totalRows} rows so far)`,
    );

    // Be kind to PBPStats — pause between batches
    if (i + CONCURRENCY < entityIds.length) {
      await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  if (failed > 0) {
    console.warn(`  ⚠ ${failed} ${entityType.toLowerCase()}(s) failed to fetch`);
  }

  return totalRows;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const season = process.argv[2] || DEFAULT_SEASON;
  const seasonType = process.argv[3] || DEFAULT_SEASON_TYPE;

  console.log(`=== elarostats game logs sync (${season}, ${seasonType.replace(/\+/g, " ")}) ===\n`);

  try {
    // ── Get entity IDs from Supabase ─────────────────────────────────────

    console.log("Fetching entity IDs from Supabase…");
    const [playerIds, teamIds] = await Promise.all([
      fetchEntityIds("pbp_player_totals"),
      fetchEntityIds("pbp_team_totals"),
    ]);
    console.log(`  Found ${playerIds.length} players, ${teamIds.length} teams.\n`);

    if (playerIds.length === 0 && teamIds.length === 0) {
      console.error(
        "No entity IDs found. Make sure sync-pbpstats has run first to populate pbp_player_totals / pbp_team_totals.",
      );
      process.exit(1);
    }

    // ── Team game logs (fewer entities, do first) ────────────────────────

    let teamRows = 0;
    if (teamIds.length > 0) {
      console.log(`Fetching game logs for ${teamIds.length} teams…`);
      teamRows = await processEntities(
        "Team",
        teamIds,
        "team_game_logs",
        mapTeamLogRow,
        season,
        seasonType,
      );
      console.log(`Team game logs sync complete — ${teamRows} rows.\n`);
    }

    // ── Player game logs ─────────────────────────────────────────────────

    let playerRows = 0;
    if (playerIds.length > 0) {
      console.log(`Fetching game logs for ${playerIds.length} players…`);
      playerRows = await processEntities(
        "Player",
        playerIds,
        "player_game_logs",
        mapPlayerLogRow,
        season,
        seasonType,
      );
      console.log(`Player game logs sync complete — ${playerRows} rows.\n`);
    }

    // ── Summary ──────────────────────────────────────────────────────────

    console.log("All done!");
    console.log(`  Players: ${playerRows} game log rows`);
    console.log(`  Teams: ${teamRows} game log rows`);
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
