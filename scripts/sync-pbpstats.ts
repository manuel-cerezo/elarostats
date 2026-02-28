/**
 * sync-pbpstats.ts
 *
 * Fetches NBA player & team totals from the pbpstats API and upserts them
 * into Supabase tables (pbp_player_totals, pbp_team_totals).
 *
 * Also fetches season games to compute W-L records, home/away splits,
 * last-10 record, and current streak for each team.
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
const PBPSTATS_GAMES = "https://api.pbpstats.com/get-games/nba";
const DEFAULT_SEASON = "2025-26";
const DEFAULT_SEASON_TYPE = "Regular+Season";

// ---------------------------------------------------------------------------
// Types
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
  Pace?: number;
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

interface PbpGame {
  GameId: string;
  Date: string;
  HomeTeamId: number;
  AwayTeamId: number;
  HomePoints: number;
  AwayPoints: number;
  [key: string]: unknown;
}

interface PbpGamesResponse {
  results: PbpGame[];
}

interface TeamRecord {
  wins: number;
  losses: number;
  winPct: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  last10Wins: number;
  last10Losses: number;
  streak: string;
}

// ---------------------------------------------------------------------------
// Fetch from pbpstats
// ---------------------------------------------------------------------------

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

async function fetchGames(season: string, seasonType: string): Promise<PbpGame[]> {
  const url = `${PBPSTATS_GAMES}?Season=${season}&SeasonType=${seasonType}`;
  console.log(`Fetching games from pbpstats…`);
  console.log(`  URL: ${url}`);

  const res = await fetch(url);
  const data: PbpGamesResponse = await res.json();

  if (!data.results?.length) {
    console.warn(`  No games returned (status ${res.status}) — W-L will be 0-0`);
    return [];
  }

  console.log(`  Got ${data.results.length} games`);
  return data.results;
}

// ---------------------------------------------------------------------------
// Compute W-L records from game results
// ---------------------------------------------------------------------------

function computeTeamRecords(games: PbpGame[]): Map<number, TeamRecord> {
  // Sort games by date ascending for streak / last-10 calculation
  const sorted = [...games].sort((a, b) => a.Date.localeCompare(b.Date));

  // Track per-team game results in chronological order
  const teamGames = new Map<number, Array<{ won: boolean; isHome: boolean }>>();

  for (const game of sorted) {
    // Skip games that haven't been played yet (no scores)
    if (game.HomePoints === 0 && game.AwayPoints === 0) continue;

    const homeId = Number(game.HomeTeamId);
    const awayId = Number(game.AwayTeamId);
    const homeWon = game.HomePoints > game.AwayPoints;

    if (!teamGames.has(homeId)) teamGames.set(homeId, []);
    if (!teamGames.has(awayId)) teamGames.set(awayId, []);

    teamGames.get(homeId)!.push({ won: homeWon, isHome: true });
    teamGames.get(awayId)!.push({ won: !homeWon, isHome: false });
  }

  const records = new Map<number, TeamRecord>();

  for (const [teamId, results] of teamGames) {
    const wins = results.filter((r) => r.won).length;
    const losses = results.filter((r) => !r.won).length;
    const homeWins = results.filter((r) => r.isHome && r.won).length;
    const homeLosses = results.filter((r) => r.isHome && !r.won).length;
    const awayWins = results.filter((r) => !r.isHome && r.won).length;
    const awayLosses = results.filter((r) => !r.isHome && !r.won).length;

    // Last 10 games
    const last10 = results.slice(-10);
    const last10Wins = last10.filter((r) => r.won).length;
    const last10Losses = last10.filter((r) => !r.won).length;

    // Current streak
    let streakCount = 0;
    const streakType =
      results.length > 0 ? (results[results.length - 1].won ? "W" : "L") : "W";
    for (let i = results.length - 1; i >= 0; i--) {
      if ((results[i].won && streakType === "W") || (!results[i].won && streakType === "L")) {
        streakCount++;
      } else {
        break;
      }
    }

    records.set(teamId, {
      wins,
      losses,
      winPct: wins + losses > 0 ? wins / (wins + losses) : 0,
      homeWins,
      homeLosses,
      awayWins,
      awayLosses,
      last10Wins,
      last10Losses,
      streak: `${streakType}${streakCount}`,
    });
  }

  return records;
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

function mapTeamRow(t: PbpRow, season: string, seasonType: string, record?: TeamRecord) {
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
    pace: typeof t.Pace === "number" ? t.Pace : null,
    // W-L record fields
    wins: record?.wins ?? 0,
    losses: record?.losses ?? 0,
    win_pct: record?.winPct ?? null,
    home_wins: record?.homeWins ?? 0,
    home_losses: record?.homeLosses ?? 0,
    away_wins: record?.awayWins ?? 0,
    away_losses: record?.awayLosses ?? 0,
    last_10_wins: record?.last10Wins ?? 0,
    last_10_losses: record?.last10Losses ?? 0,
    streak: record?.streak ?? null,
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

    // Games (for W-L computation)
    const games = await fetchGames(season, seasonType);
    const records = computeTeamRecords(games);
    console.log(`\nComputed records for ${records.size} teams.\n`);

    // Teams (merged with W-L records)
    const teams = await fetchTotals("Team", season, seasonType);
    const teamRows = teams.map((t) => {
      const teamId = parseInt(t.EntityId, 10);
      const record = records.get(teamId);
      return mapTeamRow(t, season, seasonType, record);
    });
    await upsertBatch("pbp_team_totals", teamRows, "entity_id,season,season_type");
    console.log(`\nTeams sync complete — ${teams.length} rows.\n`);

    console.log("All done!");
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
