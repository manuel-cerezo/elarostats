/**
 * sync-gamelogs.ts
 *
 * Incrementally syncs NBA box-score data into Supabase
 * (player_game_logs, team_game_logs).
 *
 * Strategy:
 *   1. Get completed game IDs from the NBA CDN scoreboard
 *   2. Skip games already in Supabase
 *   3. Fetch the full box score for each new game from NBA CDN
 *   4. Extract player + team rows from one response per game
 *
 * This replaces the old per-entity PBPStats approach (~500+ API calls)
 * with ~10-15 calls per day (one per new game).
 *
 *   npm run sync:gamelogs
 *   npm run sync:gamelogs -- --backfill   # re-sync all games in game_stats
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

const NBA_CDN_BASE = "https://cdn.nba.com/static/json/liveData";
const BATCH_SIZE = 100;
const DEFAULT_SEASON = "2025-26";
const DEFAULT_SEASON_TYPE = "Regular Season";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScoreboardGame {
  gameId: string;
  gameStatus: number; // 3 = Final
  gameStatusText: string;
  gameCode: string; // e.g. "20260227/CLEDET"
  homeTeam: { teamId: number; teamTricode: string; score: number };
  awayTeam: { teamId: number; teamTricode: string; score: number };
}

interface BoxscorePlayer {
  personId: number;
  name: string;
  status: string;
  played: string;
  statistics: {
    points: number;
    reboundsTotal: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    minutes: string; // "PT35M33.00S"
    twoPointersMade: number;
    twoPointersAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
    plusMinusPoints: number;
  };
}

interface BoxscoreTeam {
  teamId: number;
  teamTricode: string;
  score: number;
  players: BoxscorePlayer[];
  statistics: {
    points: number;
    reboundsTotal: number;
    assists: number;
    steals: number;
    turnovers: number;
    twoPointersMade: number;
    twoPointersAttempted: number;
    threePointersMade: number;
    threePointersAttempted: number;
    freeThrowsMade: number;
    freeThrowsAttempted: number;
    fieldGoalsMade: number;
    fieldGoalsAttempted: number;
  };
}

interface BoxscoreResponse {
  game: {
    gameId: string;
    gameCode: string;
    gameStatus: number;
    homeTeam: BoxscoreTeam;
    awayTeam: BoxscoreTeam;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse ISO 8601 duration "PT35M33.00S" → decimal minutes as string. */
function parseMinutes(iso: string): string {
  const match = iso.match(/PT(\d+)M([\d.]+)S/);
  if (!match) return "0";
  const mins = parseInt(match[1], 10);
  const secs = parseFloat(match[2]);
  return (mins + secs / 60).toFixed(1);
}

/** Compute eFG% = (FGM + 0.5 * 3PM) / FGA */
function computeEfgPct(fgm: number, fg3m: number, fga: number): number | null {
  if (fga === 0) return null;
  return (fgm + 0.5 * fg3m) / fga;
}

/** Compute TS% = PTS / (2 * TSA), where TSA = FGA + 0.44 * FTA */
function computeTsPct(pts: number, fga: number, fta: number): number | null {
  const tsa = fga + 0.44 * fta;
  if (tsa === 0) return null;
  return pts / (2 * tsa);
}

/** Determine W/L for a team given scores. */
function winLoss(teamScore: number, opponentScore: number): string {
  return teamScore > opponentScore ? "W" : "L";
}

/** Extract date from gameCode "20260227/CLEDET" → "2026-02-27" */
function parseDateFromGameCode(gameCode: string): string {
  const dateStr = gameCode.split("/")[0];
  return `${dateStr.slice(0, 4)}-${dateStr.slice(4, 6)}-${dateStr.slice(6, 8)}`;
}

// ---------------------------------------------------------------------------
// NBA CDN fetchers
// ---------------------------------------------------------------------------

async function fetchScoreboard(): Promise<ScoreboardGame[]> {
  const url = `${NBA_CDN_BASE}/scoreboard/todaysScoreboard_00.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scoreboard fetch failed: ${res.status}`);
  const data = await res.json();
  return data.scoreboard?.games ?? [];
}

async function fetchBoxscore(gameId: string): Promise<BoxscoreResponse> {
  const url = `${NBA_CDN_BASE}/boxscore/boxscore_${gameId}.json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Boxscore ${gameId} fetch failed: ${res.status}`);
  return res.json() as Promise<BoxscoreResponse>;
}

// ---------------------------------------------------------------------------
// Get game IDs already synced in player_game_logs
// ---------------------------------------------------------------------------

async function getAlreadySyncedGameIds(gameIds: string[]): Promise<Set<string>> {
  // Query distinct game_ids from player_game_logs that match input
  const { data, error } = await supabase
    .from("player_game_logs")
    .select("game_id")
    .in("game_id", gameIds);

  if (error) {
    console.warn("  Warning: could not check existing game logs:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r: { game_id: string }) => r.game_id));
}

// ---------------------------------------------------------------------------
// Get all game IDs from game_stats for backfill mode
// ---------------------------------------------------------------------------

async function getAllGameStatsIds(): Promise<{ gameId: string; gameDate: string }[]> {
  const { data, error } = await supabase
    .from("game_stats")
    .select("game_id, game_date")
    .order("game_id", { ascending: true });

  if (error) throw new Error(`Failed to fetch game_stats: ${error.message}`);
  return (data ?? []).map((r: { game_id: string; game_date: string }) => ({
    gameId: r.game_id,
    gameDate: r.game_date,
  }));
}

// ---------------------------------------------------------------------------
// Map boxscore data → Supabase rows
// ---------------------------------------------------------------------------

function mapPlayerRow(
  player: BoxscorePlayer,
  gameId: string,
  gameDate: string,
  opponentAbbr: string,
  teamScore: number,
  opponentScore: number,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  const s = player.statistics;
  const fgm = s.fieldGoalsMade;
  const fga = s.fieldGoalsAttempted;
  const fg3m = s.threePointersMade;
  const fta = s.freeThrowsAttempted;
  const ftm = s.freeThrowsMade;

  return {
    entity_id: player.personId,
    game_id: gameId,
    season,
    season_type: seasonType,
    date: gameDate,
    opponent: opponentAbbr,
    points: s.points,
    rebounds: s.reboundsTotal,
    assists: s.assists,
    steals: s.steals,
    blocks: s.blocks,
    turnovers: s.turnovers,
    minutes: parseMinutes(s.minutes),
    fg2m: s.twoPointersMade,
    fg2a: s.twoPointersAttempted,
    fg3m: s.threePointersMade,
    fg3a: s.threePointersAttempted,
    ft_points: ftm,
    fta,
    efg_pct: computeEfgPct(fgm, fg3m, fga),
    ts_pct: computeTsPct(s.points, fga, fta),
    plus_minus: s.plusMinusPoints,
    wl: winLoss(teamScore, opponentScore),
    raw_data: s,
    synced_at: new Date().toISOString(),
  };
}

function mapTeamRow(
  team: BoxscoreTeam,
  gameId: string,
  gameDate: string,
  opponentAbbr: string,
  opponentScore: number,
  season: string,
  seasonType: string,
): Record<string, unknown> {
  const s = team.statistics;
  const fgm = s.fieldGoalsMade;
  const fga = s.fieldGoalsAttempted;
  const fg3m = s.threePointersMade;
  const fta = s.freeThrowsAttempted;
  const ftm = s.freeThrowsMade;

  return {
    entity_id: team.teamId,
    game_id: gameId,
    season,
    season_type: seasonType,
    date: gameDate,
    opponent: opponentAbbr,
    points: s.points,
    rebounds: s.reboundsTotal,
    assists: s.assists,
    steals: s.steals,
    turnovers: s.turnovers,
    fg2m: s.twoPointersMade,
    fg2a: s.twoPointersAttempted,
    fg3m: s.threePointersMade,
    fg3a: s.threePointersAttempted,
    ft_points: ftm,
    fta,
    efg_pct: computeEfgPct(fgm, fg3m, fga),
    ts_pct: computeTsPct(s.points, fga, fta),
    wl: winLoss(team.score, opponentScore),
    raw_data: s,
    synced_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Batch upsert to Supabase
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
  }
}

// ---------------------------------------------------------------------------
// Process a single game boxscore
// ---------------------------------------------------------------------------

async function processGame(
  gameId: string,
  gameDate: string,
  season: string,
  seasonType: string,
): Promise<{ playerRows: number; teamRows: number }> {
  const boxscore = await fetchBoxscore(gameId);
  const game = boxscore.game;

  const home = game.homeTeam;
  const away = game.awayTeam;

  // Derive date from gameCode if not provided
  const date = gameDate || parseDateFromGameCode(game.gameCode);

  // --- Player rows ---
  const playerRows: Record<string, unknown>[] = [];

  for (const player of home.players) {
    if (player.status !== "ACTIVE" || player.played !== "1") continue;
    playerRows.push(
      mapPlayerRow(player, gameId, date, away.teamTricode, home.score, away.score, season, seasonType),
    );
  }

  for (const player of away.players) {
    if (player.status !== "ACTIVE" || player.played !== "1") continue;
    playerRows.push(
      mapPlayerRow(player, gameId, date, home.teamTricode, away.score, home.score, season, seasonType),
    );
  }

  // --- Team rows ---
  const teamRows: Record<string, unknown>[] = [
    mapTeamRow(home, gameId, date, away.teamTricode, away.score, season, seasonType),
    mapTeamRow(away, gameId, date, home.teamTricode, home.score, season, seasonType),
  ];

  // --- Upsert ---
  if (playerRows.length > 0) {
    await upsertBatch("player_game_logs", playerRows, "entity_id,game_id");
  }
  if (teamRows.length > 0) {
    await upsertBatch("team_game_logs", teamRows, "entity_id,game_id");
  }

  return { playerRows: playerRows.length, teamRows: teamRows.length };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const isBackfill = process.argv.includes("--backfill");
  const season = DEFAULT_SEASON;
  const seasonType = DEFAULT_SEASON_TYPE;

  console.log(`=== elarostats game logs sync (${season}, ${seasonType}) ===`);
  console.log(`Mode: ${isBackfill ? "backfill (all games in game_stats)" : "incremental (today's scoreboard)"}\n`);

  try {
    let gamesToProcess: { gameId: string; gameDate: string }[] = [];

    if (isBackfill) {
      // Backfill: re-sync all games from game_stats
      const allGames = await getAllGameStatsIds();
      console.log(`Found ${allGames.length} games in game_stats.`);
      gamesToProcess = allGames;
    } else {
      // Incremental: only today's completed games from NBA CDN scoreboard
      console.log("Fetching today's scoreboard from NBA CDN…");
      const games = await fetchScoreboard();
      const finalGames = games.filter((g) => g.gameStatus === 3);

      if (finalGames.length === 0) {
        console.log("No completed games found on today's scoreboard. Nothing to sync.");
        return;
      }

      console.log(`Found ${finalGames.length} completed game(s) on scoreboard.`);

      gamesToProcess = finalGames.map((g) => ({
        gameId: g.gameId,
        gameDate: parseDateFromGameCode(g.gameCode),
      }));
    }

    // Skip games already in player_game_logs
    const gameIds = gamesToProcess.map((g) => g.gameId);
    const alreadySynced = await getAlreadySyncedGameIds(gameIds);
    const newGames = gamesToProcess.filter((g) => !alreadySynced.has(g.gameId));

    if (newGames.length === 0) {
      console.log("All games are already synced. Nothing to do.");
      return;
    }

    console.log(
      `Syncing ${newGames.length} new game(s) (${alreadySynced.size} already cached).\n`,
    );

    let totalPlayerRows = 0;
    let totalTeamRows = 0;
    let synced = 0;
    let failed = 0;

    for (const game of newGames) {
      try {
        console.log(`  [${synced + failed + 1}/${newGames.length}] Fetching boxscore ${game.gameId} (${game.gameDate})…`);
        const result = await processGame(game.gameId, game.gameDate, season, seasonType);
        totalPlayerRows += result.playerRows;
        totalTeamRows += result.teamRows;
        synced++;
        console.log(`    ✓ ${result.playerRows} player rows, ${result.teamRows} team rows`);
      } catch (err) {
        failed++;
        console.error(
          `    ✗ Failed: ${err instanceof Error ? err.message : err}`,
        );
      }

      // Small delay between games to be respectful to the CDN
      if (synced + failed < newGames.length) {
        await sleep(500);
      }
    }

    console.log(`\nAll done!`);
    console.log(`  Games: ${synced} synced, ${failed} failed`);
    console.log(`  Player rows: ${totalPlayerRows}`);
    console.log(`  Team rows: ${totalTeamRows}`);

    if (failed > 0 && synced === 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("\nSync failed:", err);
    process.exit(1);
  }
}

main();
