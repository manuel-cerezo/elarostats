/**
 * sync-games.ts
 *
 * Fetches completed NBA game data from PBPStats and caches it in Supabase.
 * Runs daily after games end to avoid redundant PBPStats API calls from the
 * client for games that are already final.
 *
 * Data stored per game:
 *   - team box score (team result type)
 *   - player box score (player result type)
 *   - game flow / score progression (game-flow result type)
 *
 *   npm run sync:games
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

// ---------------------------------------------------------------------------
// PBPStats types (mirrors src/types/games.ts)
// ---------------------------------------------------------------------------

interface GameItem {
  gameid: string;
  time: string;
  home: string;
  away: string;
}

interface TodaysGamesResponse {
  live_games: number;
  game_data: GameItem[];
}

interface LiveGameResponse {
  status: string;
  game_data: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

function parseTeamField(field: string): { abbr: string; score: number } {
  const parts = field.trim().split(" ");
  return { abbr: parts[0] ?? "", score: parseInt(parts[1] ?? "0", 10) };
}

async function fetchTodaysGames(): Promise<TodaysGamesResponse> {
  const res = await fetch(`${PBPSTATS_BASE}/live/games/nba`);
  if (!res.ok) {
    throw new Error(`Failed to fetch today's games: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<TodaysGamesResponse>;
}

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
  // unreachable, but satisfies TypeScript
  throw new Error(`Exhausted retries for ${label}`);
}

async function fetchGameResult(
  gameId: string,
  resultType: "team" | "player" | "game-flow" | "possession-by-possession",
): Promise<LiveGameResponse> {
  const url = `${PBPSTATS_BASE}/live/game/${gameId}/${resultType}`;
  const res = await fetchWithRetry(url, `${resultType} for ${gameId}`);
  return res.json() as Promise<LiveGameResponse>;
}

// ---------------------------------------------------------------------------
// Check which game IDs are already synced
// ---------------------------------------------------------------------------

async function getAlreadySyncedIds(gameIds: string[]): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("game_stats")
    .select("game_id")
    .in("game_id", gameIds);

  if (error) {
    console.warn("  Warning: could not check existing game_stats rows:", error.message);
    return new Set();
  }

  return new Set((data ?? []).map((row: { game_id: string }) => row.game_id));
}

// ---------------------------------------------------------------------------
// Sync a single completed game
// ---------------------------------------------------------------------------

async function syncGame(
  gameId: string,
  homeAbbr: string,
  awayAbbr: string,
  homeScore: number,
  awayScore: number,
  gameDate: string,
): Promise<void> {
  console.log(`  Fetching ${awayAbbr} @ ${homeAbbr} (${gameId})…`);

  const [teamData, playerData, gameFlowData, pbpData] = await Promise.all([
    fetchGameResult(gameId, "team"),
    fetchGameResult(gameId, "player"),
    fetchGameResult(gameId, "game-flow"),
    fetchGameResult(gameId, "possession-by-possession"),
  ]);

  const { error } = await supabase.from("game_stats").upsert(
    {
      game_id: gameId,
      home_team_abbr: homeAbbr,
      away_team_abbr: awayAbbr,
      home_score: homeScore,
      away_score: awayScore,
      team_data: teamData,
      player_data: playerData,
      game_flow_data: gameFlowData,
      pbp_data: pbpData,
      synced_at: new Date().toISOString(),
      game_date: gameDate,
    },
    { onConflict: "game_id" },
  );

  if (error) {
    throw new Error(`Supabase upsert failed for ${gameId}: ${error.message}`);
  }

  console.log(`  ✓ Saved ${awayAbbr} @ ${homeAbbr}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== elarostats game stats sync ===\n");

  // 1. Get today's (or last night's) games from PBPStats
  console.log("Fetching games from PBPStats…");
  const response = await fetchTodaysGames();

  // 2. Filter for completed games only
  const finalGames = response.game_data.filter((g) =>
    g.time.trim().toLowerCase().startsWith("final"),
  );

  if (finalGames.length === 0) {
    console.log("No completed games found. Nothing to sync.");
    return;
  }

  console.log(`Found ${finalGames.length} completed game(s).\n`);

  // 3. Skip games already in Supabase
  const allIds = finalGames.map((g) => g.gameid);
  const alreadySynced = await getAlreadySyncedIds(allIds);

  const toSync = finalGames.filter((g) => !alreadySynced.has(g.gameid));

  if (toSync.length === 0) {
    console.log("All completed games are already cached in Supabase. Nothing to do.");
    return;
  }

  console.log(`Syncing ${toSync.length} new game(s) (${alreadySynced.size} already cached):\n`);

  // Compute game date: the script runs at 5:30 UTC (morning after games).
  // NBA games start in US primetime and run through early UTC the next day.
  // Yesterday in UTC is therefore the actual game date for all final games.
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const gameDate = yesterday.toISOString().split("T")[0]; // YYYY-MM-DD

  // 4. Sync each game (serially to avoid hammering PBPStats)
  let synced = 0;
  let failed = 0;

  for (const game of toSync) {
    const home = parseTeamField(game.home);
    const away = parseTeamField(game.away);

    try {
      await syncGame(game.gameid, home.abbr, away.abbr, home.score, away.score, gameDate);
      synced++;
    } catch (err) {
      console.error(`  ✗ Failed to sync ${game.gameid}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\nDone — ${synced} synced, ${failed} failed.`);

  if (failed > 0 && synced === 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nSync failed:", err);
  process.exit(1);
});
