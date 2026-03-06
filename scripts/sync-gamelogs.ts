/**
 * sync-gamelogs.ts
 *
 * Incrementally syncs NBA box-score data into Supabase
 * (player_game_logs, team_game_logs).
 *
 * Strategy:
 *   1. Fetch the full NBA season schedule to discover ALL completed games
 *   2. Skip games already in Supabase (player_game_logs)
 *   3. Fetch the box score for each missing game from NBA CDN
 *   4. Extract player + team rows from one response per game
 *
 * Uses the schedule (not just today's scoreboard) so missed days are
 * automatically caught up — no gaps if the cron job skips a day.
 *
 *   npm run sync:gamelogs
 *   npm run sync:gamelogs -- --backfill   # re-sync all games (ignore cache)
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
const NBA_SCHEDULE_URL =
  "https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json";
const BATCH_SIZE = 100;
const DEFAULT_SEASON = "2025-26";
const DEFAULT_SEASON_TYPE = "Regular Season";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ScheduleGame {
  gameId: string;
  gameStatus: number; // 1=scheduled, 2=in-progress, 3=final
  gameCode: string; // e.g. "20260227/CLEDET"
  homeTeam: { teamTricode: string };
  awayTeam: { teamTricode: string };
}

interface ScheduleDate {
  gameDate: string; // "03/04/2026 00:00:00"
  games: ScheduleGame[];
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

/** Fetch the full season schedule and return all completed (final) regular-season games. */
async function fetchCompletedGamesFromSchedule(): Promise<
  { gameId: string; gameDate: string }[]
> {
  const res = await fetch(NBA_SCHEDULE_URL);
  if (!res.ok) throw new Error(`Schedule fetch failed: ${res.status}`);

  const data = await res.json();
  const gameDates: ScheduleDate[] = data.leagueSchedule?.gameDates ?? [];

  const result: { gameId: string; gameDate: string }[] = [];

  for (const gd of gameDates) {
    for (const game of gd.games) {
      // Only completed regular-season games (gameId starts with "002")
      if (game.gameStatus === 3 && game.gameId.startsWith("002")) {
        result.push({
          gameId: game.gameId,
          gameDate: parseDateFromGameCode(game.gameCode),
        });
      }
    }
  }

  return result;
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

async function getAlreadySyncedGameIds(): Promise<Set<string>> {
  // Fetch ALL distinct game_ids from player_game_logs
  const { data, error } = await supabase
    .from("player_game_logs")
    .select("game_id");

  if (error) {
    console.warn("  Warning: could not check existing game logs:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((r: { game_id: string }) => r.game_id));
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
  const game = boxscore?.game;

  if (!game || !game.homeTeam || !game.awayTeam) {
    throw new Error(`Invalid boxscore response for ${gameId}: missing game/team data`);
  }

  const home = game.homeTeam;
  const away = game.awayTeam;

  // Derive date from gameCode if not provided
  const date = gameDate || parseDateFromGameCode(game.gameCode);

  // --- Player rows ---
  const playerRows: Record<string, unknown>[] = [];

  for (const player of home.players ?? []) {
    if (player.status !== "ACTIVE" || String(player.played) !== "1") continue;
    if (!player.statistics) continue;
    playerRows.push(
      mapPlayerRow(player, gameId, date, away.teamTricode, home.score, away.score, season, seasonType),
    );
  }

  for (const player of away.players ?? []) {
    if (player.status !== "ACTIVE" || String(player.played) !== "1") continue;
    if (!player.statistics) continue;
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
  console.log(`Mode: ${isBackfill ? "backfill (re-sync all)" : "incremental"}\n`);

  try {
    // 1. Get ALL completed regular-season games from the NBA schedule
    console.log("Fetching NBA season schedule…");
    const allCompleted = await fetchCompletedGamesFromSchedule();
    console.log(`Found ${allCompleted.length} completed regular-season games in schedule.`);

    if (allCompleted.length === 0) {
      console.log("No completed games in schedule. Nothing to sync.");
      return;
    }

    // 2. Find which games are missing from player_game_logs
    let gamesToProcess: { gameId: string; gameDate: string }[];

    if (isBackfill) {
      // Backfill: re-sync everything (ignore what's already cached)
      gamesToProcess = allCompleted;
      console.log(`Backfill mode: will process all ${gamesToProcess.length} games.\n`);
    } else {
      console.log("Checking which games are already synced…");
      const alreadySynced = await getAlreadySyncedGameIds();
      gamesToProcess = allCompleted.filter((g) => !alreadySynced.has(g.gameId));

      if (gamesToProcess.length === 0) {
        console.log("All games are already synced. Nothing to do.");
        return;
      }

      console.log(
        `${gamesToProcess.length} new game(s) to sync (${alreadySynced.size} already cached).\n`,
      );
    }

    // 3. Fetch boxscore for each missing game and upsert
    let totalPlayerRows = 0;
    let totalTeamRows = 0;
    let synced = 0;
    let failed = 0;

    for (const game of gamesToProcess) {
      try {
        console.log(`  [${synced + failed + 1}/${gamesToProcess.length}] Fetching boxscore ${game.gameId} (${game.gameDate})…`);
        const result = await processGame(game.gameId, game.gameDate, season, seasonType);
        totalPlayerRows += result.playerRows;
        totalTeamRows += result.teamRows;
        synced++;
        console.log(`    ✓ ${result.playerRows} player rows, ${result.teamRows} team rows`);
      } catch (err) {
        failed++;
        const errMsg = err instanceof Error ? err.message : String(err);
        const errStack = err instanceof Error ? err.stack : "";
        console.error(`    ✗ Failed: ${errMsg}`);
        if (errStack) console.error(`      ${errStack.split("\n").slice(0, 3).join("\n      ")}`);
      }

      // Small delay between games to be respectful to the CDN
      if (synced + failed < gamesToProcess.length) {
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
