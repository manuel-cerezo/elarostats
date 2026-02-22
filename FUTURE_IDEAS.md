# elarostats — Future Feature Ideas & pbpstats API Reference

This document contains prioritized feature ideas for elarostats and a reference for the pbpstats API endpoints. Created for use in future development sessions.

---

## Feature Ideas (Ordered by Priority)

### 1. Play-by-Play Timeline (Live Games)
**Impact: High | Effort: Medium**

Add a real-time play-by-play feed to the live game detail page. Each possession shows what happened (made shot, turnover, foul, etc.) with timestamps.

- **API**: `GET /live/game/{gameId}/possession-by-possession`
- Returns an array of possessions with events, timestamps, and player actions
- Can be polled every 10-30 seconds during live games
- UI: Vertical timeline with color-coded events per team, auto-scrolling to latest

### 2. Game Logs (Player & Team)
**Impact: High | Effort: Medium**

Show game-by-game stats for any player or team throughout the season. Useful for tracking performance trends.

- **API**: `GET /get-game-logs/nba?EntityType=Player&EntityId={playerId}&Season=2025-26&SeasonType=Regular+Season`
- Also works with `EntityType=Team&EntityId={teamId}`
- Returns per-game rows with all the standard stats
- UI: Table with sparkline charts showing trends; integrate into existing player detail page (`/players/[id]`) and team page (`/teams/[id]`)

### 3. Lineup Analysis
**Impact: High | Effort: High**

Show which 5-man lineups are the most effective for each team. This is an advanced analytics feature that sets elarostats apart.

- **API**: `GET /get-totals/nba?Season=2025-26&SeasonType=Regular+Season&Type=Lineup&TeamId={teamId}`
- Returns lineup combinations with offensive/defensive stats, minutes, +/-
- UI: Add a "Lineups" tab on team pages showing top 5-man units with net rating, minutes, and plus/minus bars

### 4. Live Player Stats
**Impact: Medium | Effort: Low**

Show individual player stats during live games (points, rebounds, assists, etc.) on the game detail page.

- **API**: `GET /live/game/{gameId}/player`
- Returns per-player stats for both teams in the current game
- UI: Two columns (home/away) showing player stat tables below the scoreboard in the live game view

### 5. Opponent Analysis
**Impact: Medium | Effort: Medium**

Show how teams perform against specific opponents — defensive matchup data.

- **API**: `GET /get-totals/nba?Season=2025-26&SeasonType=Regular+Season&Type=Opponent&TeamId={teamId}`
- Returns opponent-adjusted stats per team
- UI: Add an "Opponents" section to team pages, or a comparison tool where users pick two teams

### 6. Playoffs & Play-In Data
**Impact: Medium | Effort: Low**

Extend existing pages to support Playoffs and Play-In tournament data with a season type selector.

- **API**: Same endpoints but with `SeasonType=Playoffs` or `SeasonType=PlayIn`
- UI: Add a dropdown/toggle on the Teams and Players leaderboard pages to switch between Regular Season, Playoffs, and Play-In

### 7. Game Flow Chart
**Impact: Medium | Effort: Medium-High**

Show a score differential chart over the course of a game — visualizing momentum swings.

- **API**: `GET /live/game/{gameId}/game-flow`
- Returns score data at various points throughout the game
- UI: Line chart (use recharts or similar) showing score differential over time, with quarter markers

### 8. Head-to-Head Player Comparison
**Impact: Medium | Effort: Medium**

Allow users to compare two players side by side across all stats.

- **API**: Use `/get-totals/nba?Type=Player` data already fetched on the leaderboard page
- UI: A comparison modal or page where users select two players and see their stats in a side-by-side layout with bar charts

### 9. WNBA & G-League Support
**Impact: Low | Effort: Medium**

Extend elarostats to cover WNBA and G-League using the same pbpstats API.

- **API**: All endpoints support `wnba` and `gleague` leagues: `/get-totals/wnba`, `/live/games/gleague`, etc.
- UI: Add a league selector in the nav or as a global toggle. Most components can be reused with different API paths.

---

## pbpstats API Reference

**Base URL**: `https://api.pbpstats.com`
**CORS**: Enabled (`Access-Control-Allow-Origin: *`)
**Note**: Some endpoints may return HTTP 502 but with valid JSON body — always parse the body before treating as error.

### Season Totals

```
GET /get-totals/{league}
```

| Param | Values | Required |
|-------|--------|----------|
| `Season` | `2025-26`, `2024-25`, etc. | Yes |
| `SeasonType` | `Regular+Season`, `Playoffs`, `PlayIn` | Yes |
| `Type` | `Player`, `Team`, `Lineup`, `Opponent` | Yes |
| `TeamId` | e.g. `1610612737` (ATL) | No (filters by team) |

**Response**: `{ multi_row_table_data: Array<{ EntityId, Name, TeamId, TeamAbbreviation, GamesPlayed, Minutes, Points, Assists, Rebounds, Steals, Blocks, Turnovers, FG2M, FG2A, FG3M, FG3A, FtPoints, PlusMinus, OffPoss, DefPoss, Pace, AtRimFGM, AtRimFGA, ShortMidRangeFGM/A, LongMidRangeFGM/A, EfgPct?, TsPct?, SecondChancePoints, PenaltyPoints, ... }> }`

### Game Logs

```
GET /get-game-logs/{league}
```

| Param | Values | Required |
|-------|--------|----------|
| `Season` | `2025-26` | Yes |
| `SeasonType` | `Regular+Season` | Yes |
| `EntityType` | `Player`, `Team`, `Lineup`, `Opponent`, `LineupOpponent` | Yes |
| `EntityId` | Player ID or Team ID | Yes |

### Live Games

```
GET /live/games/{league}
```

**Response**: `{ live_games: number, game_data: Array<{ gameid, time, home, away }> }`

- `home`/`away` format: `"PHX 41"` (abbreviation + score)
- `time`: `"Q2 5:30"`, `"Final"`, `"7:00 PM ET"`, etc.

### Live Game Detail

```
GET /live/game/{gameId}/team      → Team-level stats
GET /live/game/{gameId}/player    → Player-level stats
GET /live/game/{gameId}/possession-by-possession → Play-by-play
GET /live/game/{gameId}/game-flow → Score flow data
```

### All Players (for a league)

```
GET /get-all-players-for-league/{league}
```

Returns list of all players with basic info (name, team, position).

### Team Players for Season

```
GET /get-team-players-for-season
```

| Param | Values |
|-------|--------|
| `Season` | `2025-26` |
| `SeasonType` | `Regular+Season` |
| `TeamId` | e.g. `1610612737` |

### Supported Leagues

| League | Path |
|--------|------|
| NBA | `nba` |
| WNBA | `wnba` |
| G-League | `gleague` |

---

## Architecture Notes for Future Development

- **WithQuery pattern**: Every new React component that uses `useTranslation()`, `useTheme()`, or React Query hooks must be wrapped in a `*WithQuery.tsx` component that provides `ReactQueryProvider`.
- **Astro pages**: Use `client:only="react"` directive for React islands. Pages are statically generated at build time.
- **Navigation**: Add nav links in `src/layouts/Layout.astro`. The active-nav script handles prefix matching automatically.
- **i18n**: All user-facing strings go in `src/i18n/en.ts` and `src/i18n/es.ts`. Access via `useTranslation()` hook → `t("keyName")`.
- **Team data**: `src/data/teams.json` maps `teamId` (NBA entity ID) → abbreviation, name, etc. Team logos at `/teams/{teamId}.svg`.
- **Player detail pages**: Pre-rendered at build time from Supabase data at `/players/[id]`. The `[id]` is the NBA player ID (`nba_id` / `EntityId`).
