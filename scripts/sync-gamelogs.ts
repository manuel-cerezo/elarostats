/**
 * sync-gamelogs.ts
 *
 * Fetches per-game logs for every NBA player and team from the PBPStats API
 * and caches them in Supabase (player_game_logs, team_game_logs).
 *
 * This avoids redundant PBPStats calls from the browser — the frontend reads
 * from Supabase first and only falls back to PBPStats when no cached data exists.
 *
 *   npm run sync:gamelogs
 *
 * Volume: ~500 players + 30 teams → ~530 API calls (~3 min with rate limiting).
 * Each call returns all games for that entity in the season (~60–80 rows).
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
const RATE_LIMIT_MS = 300; // delay between API calls to avoid hammering PBPStats
const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PbpGameLogRow {
  EntityId: string;
  GameId: string;
  Date: string;
  Opponent: string;
  Points: number;
  Rebounds: number;
  Assists: number;
  Steals: number;
  Blocks?: number;
  Turnovers: number;
  Minutes?: string;
  SecondsPlayed?: number;
  FG2M: number;
  FG2A: number;
  FG3M: number;
  FG3A: number;
  FtPoints: number;
  FTA?: number;
  EfgPct?: number;
  TsPct?: number;
  PlusMinus?: number;
  [key: string]: unknown;
}

interface PbpGameLogsResponse {
  multi_row_table_data: PbpGameLogRow[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry a fetch up to maxRetries times on transient server errors (5xx). */
async function fetchWithRetry(
  url: string,
  label: string,
  maxRetries = 3,
  delaysMs = [10_000, 30_000, 60_000],
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url);
    if (res.ok) return res;

    const isTransient = res.status >= 500;
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
// Fetch entity IDs from Supabase
// ---------------------------------------------------------------------------

async function getEntityIds(table: string, season: string): Promise<number[]> {
  const { data, error } = await supabase
    .from(table)
    .select("entity_id")
    .eq("season", season.replace("+", " "));

  if (error) {
    throw new Error(`Failed to fetch entity IDs from ${table}: ${error.message}`);
  }

  // Deduplicate (should already be unique per entity_id+season but just in case)
  const ids = [...new Set((data ?? []).map((row: { entity_id: number }) => row.entity_id))];
  return ids;
}

// ---------------------------------------------------------------------------
// Fetch game logs from PBPStats
// ---------------------------------------------------------------------------

async function fetchGameLogs(
  entityType: "Player" | "Team",
  entityId: number,
  season: string,
  seasonType: string,
): Promise<PbpGameLogRow[]> {
  const url = `${PBPSTATS_BASE}/get-game-logs/nba?Season=${season}&SeasonType=${seasonType}&EntityType=${entityType}&EntityId=${entityId}`;
  const res = await fetchWithRetry(url, `${entityType} ${entityId} game logs`);
  const data: PbpGameLogsResponse = await res.json();

  if (!data.multi_row_table_data) {
    return [];
  }

  return data.multi_row_table_data;
}

// ---------------------------------------------------------------------------
// Mapping functions
// ---------------------------------------------------------------------------

function mapPlayerLogRow(
  row: PbpGameLogRow,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  return {
    entity_id: parseInt(row.EntityId, 10),
    game_id: row.GameId,
    season,
    season_type: seasonType.replace("+", " "),
    date: row.Date ?? null,
    opponent: row.Opponent ?? null,
    points: row.Points ?? null,
    rebounds: row.Rebounds ?? null,
    assists: row.Assists ?? null,
    steals: row.Steals ?? null,
    blocks: row.Blocks ?? null,
    turnovers: row.Turnovers ?? null,
    minutes: row.Minutes ?? null,
    fg2m: row.FG2M ?? null,
    fg2a: row.FG2A ?? null,
    fg3m: row.FG3M ?? null,
    fg3a: row.FG3A ?? null,
    ft_points: row.FtPoints ?? null,
    fta: row.FTA ?? null,
    efg_pct: row.EfgPct ?? null,
    ts_pct: row.TsPct ?? null,
    plus_minus: row.PlusMinus ?? null,
    raw_data: row,
    synced_at: new Date().toISOString(),
  };
}

function mapTeamLogRow(
  row: PbpGameLogRow,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  return {
    entity_id: parseInt(row.EntityId, 10),
    game_id: row.GameId,
    season,
    season_type: seasonType.replace("+", " "),
    date: row.Date ?? null,
    opponent: row.Opponent ?? null,
    points: row.Points ?? null,
    rebounds: row.Rebounds ?? null,
    assists: row.Assists ?? null,
    steals: row.Steals ?? null,
    turnovers: row.Turnovers ?? null,
    fg2m: row.FG2M ?? null,
    fg2a: row.FG2A ?? null,
    fg3m: row.FG3M ?? null,
    fg3a: row.FG3A ?? null,
    ft_points: row.FtPoints ?? null,
    fta: row.FTA ?? null,
    efg_pct: row.EfgPct ?? null,
    ts_pct: row.TsPct ?? null,
    raw_data: row,
    synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Batch upsert (pattern from sync-pbpstats.ts)
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

  console.log(`=== elarostats game logs sync (${season}, ${seasonType.replace("+", " ")}) ===\n`);

  try {
    // ── Player game logs ──────────────────────────────────────────────────

    console.log("Fetching player entity IDs from pbp_player_totals…");
    const playerIds = await getEntityIds("pbp_player_totals", season);
    console.log(`  Found ${playerIds.length} players.\n`);

    const allPlayerRows: Record<string, unknown>[] = [];
    let playersFetched = 0;
    let playersFailed = 0;

    for (const playerId of playerIds) {
      try {
        const logs = await fetchGameLogs("Player", playerId, season, seasonType);
        const mapped = logs.map((row) => mapPlayerLogRow(row, season, seasonType));
        allPlayerRows.push(...mapped);
        playersFetched++;

        if (playersFetched % 50 === 0) {
          console.log(
            `  [Players] Fetched ${playersFetched}/${playerIds.length} (${allPlayerRows.length} game rows so far)`,
          );
        }
      } catch (err) {
        console.error(
          `  ✗ Failed to fetch game logs for player ${playerId}:`,
          err instanceof Error ? err.message : err,
        );
        playersFailed++;
      }

      await sleep(RATE_LIMIT_MS);
    }

    console.log(
      `\nPlayer fetch complete — ${playersFetched} succeeded, ${playersFailed} failed, ${allPlayerRows.length} total game rows.`,
    );

    if (allPlayerRows.length > 0) {
      console.log("Upserting player game logs…");
      await upsertBatch("player_game_logs", allPlayerRows, "entity_id,game_id");
      console.log(`Player game logs sync complete — ${allPlayerRows.length} rows.\n`);
    }

    // ── Team game logs ────────────────────────────────────────────────────

    console.log("Fetching team entity IDs from pbp_team_totals…");
    const teamIds = await getEntityIds("pbp_team_totals", season);
    console.log(`  Found ${teamIds.length} teams.\n`);

    const allTeamRows: Record<string, unknown>[] = [];
    let teamsFetched = 0;
    let teamsFailed = 0;

    for (const teamId of teamIds) {
      try {
        const logs = await fetchGameLogs("Team", teamId, season, seasonType);
        const mapped = logs.map((row) => mapTeamLogRow(row, season, seasonType));
        allTeamRows.push(...mapped);
        teamsFetched++;

        console.log(
          `  [Teams] Fetched ${teamsFetched}/${teamIds.length} — ${teamId} (${logs.length} games)`,
        );
      } catch (err) {
        console.error(
          `  ✗ Failed to fetch game logs for team ${teamId}:`,
          err instanceof Error ? err.message : err,
        );
        teamsFailed++;
      }

      await sleep(RATE_LIMIT_MS);
    }

    console.log(
      `\nTeam fetch complete — ${teamsFetched} succeeded, ${teamsFailed} failed, ${allTeamRows.length} total game rows.`,
    );

    if (allTeamRows.length > 0) {
      console.log("Upserting team game logs…");
      await upsertBatch("team_game_logs", allTeamRows, "entity_id,game_id");
      console.log(`Team game logs sync complete — ${allTeamRows.length} rows.\n`);
    }

    // ── Summary ───────────────────────────────────────────────────────────

    console.log("All done!");
    console.log(
      `  Players: ${allPlayerRows.length} game log rows (${playersFailed} entities failed)`,
    );
    console.log(`  Teams: ${allTeamRows.length} game log rows (${teamsFailed} entities failed)`);

    if (playersFailed > 0 || teamsFailed > 0) {
      console.warn("\n⚠ Some entities failed — consider re-running to fill gaps.");
    }
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
