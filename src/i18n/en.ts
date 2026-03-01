export const en = {
  // Navigation
  back: "Back",
  navHome: "Home",
  navGames: "Games",
  navTeams: "Teams",

  // Search
  search: "Search",
  searchPlaceholder: "Search a player...",
  searchPlaceholderFull: "Search a player or team...",
  loadingPlayers: "Loading players...",

  // Home
  heroSubtitle: "NBA stats, analytics, and insights — all in one place.",
  todaysGames: "Today's Games",
  teams: "Teams",

  // Team page
  roster: "Roster",
  player: "Player",
  errorLoadingPlayers: "Error loading players. Please try again.",
  noPlayers: "No players available for this team.",

  // Stats sections
  games: "Games",
  impact: "Impact",
  scoring: "Scoring",

  // Accessibility
  closeModal: "Close",

  // Theme
  toggleTheme: "Toggle theme",
  lightMode: "Light",
  darkMode: "Dark",

  // Games page
  gamesPageTitle: "Games",
  live: "Live",
  upcoming: "Upcoming",
  finished: "Final",
  finalStatus: "Final",
  teamLabel: "Team",
  away: "Away",
  home: "Home",
  leaders: "Leaders",
  teamStats: "Team Stats",
  errorLoadingGames: "Could not load games.",
  noGamesToday: "No games scheduled today.",

  // Navigation accessibility
  openMenu: "Open menu",

  // Teams page
  teamsPageTitle: "NBA Teams",
  teamsSeason: "2025-26 Season · Regular Season",
  errorLoadingTeams: "Could not load team data.",
  assists: "Assists",
  rebounds: "Rebounds",
  steals: "Steals",
  blocks: "Blocks",
  turnovers: "Turnovers",
  atRimPct: "At Rim %",

  // Team records
  record: "Record",
  homeRecord: "Home",
  awayRecord: "Away",
  last10: "Last 10",
  streak: "Streak",
  conference: "Conference",
  division: "Division",
  recordTitle: "Win-loss record",

  // Team stats tooltips
  netRtgTitle: "Net Rating (Off - Def per 100 possessions)",
  offRtgTitle: "Offensive Rating (points per 100 possessions)",
  defRtgTitle: "Defensive Rating (points allowed per 100 possessions)",
  paceTitle: "Pace (possessions per 48 min)",
  fg3PctTitle: "Three-point percentage",
  plusMinusTitle: "Point differential for the season",

  // Players leaderboard page
  navPlayers: "Players",
  playersPageTitle: "NBA Players",
  playersSeason: "2025-26 Season · Regular Season",
  errorLoadingPlayersLeaderboard: "Could not load player data.",
  searchPlayerPlaceholder: "Search a player...",
  noPlayersFound: "No players found.",
  ppgTitle: "Points per game",
  rpgTitle: "Rebounds per game",
  apgTitle: "Assists per game",
  spgTitle: "Steals per game",
  bpgTitle: "Blocks per game",
  mpgTitle: "Minutes per game",
  efgPctTitle: "Effective field goal percentage",
  tsPctTitle: "True shooting percentage",

  // Game flow chart
  gameFlow: "Game Flow",
  gameFlowHomeLeads: "{team} leads",
  gameFlowAwayLeads: "{team} leads",
  gameFlowTied: "Tied",
  gameFlowMargin: "Margin",

  // Game logs
  gameLogs: "Game Log",
  gameLogsDate: "Date",
  gameLogsOpponent: "Opp",
  gameLogsPts: "PTS",
  gameLogsReb: "REB",
  gameLogsAst: "AST",
  gameLogsStl: "STL",
  gameLogsBlk: "BLK",
  gameLogsTo: "TO",
  gameLogsMin: "MIN",
  gameLogsFgPct: "FG%",
  gameLogsFg3Pct: "3P%",
  gameLogsFtPct: "FT%",
  gameLogsPlusMinus: "+/-",
  gameLogsPtsAllowed: "PTS agn.",
  gameLogsNoData: "No game log data available.",
  gameLogsLoading: "Loading game log...",

  // Play-by-play
  playByPlay: "Play-by-Play",
  pbpQuarter: "Q{n}",
  pbpOvertime: "OT{n}",
  pbpScored: "Scored",
  pbpTurnover: "Turnover",
  pbpNoData: "No play-by-play data available.",
  pbpExpandAll: "Expand all",
  pbpCollapseAll: "Collapse all",

  // Live game
  updatedSecondsAgo: "Updated {seconds}s ago",
  updatedJustNow: "Updated just now",
  liveTag: "LIVE",
  gameNotStarted: "The game hasn't started yet. Live data will appear here when it begins.",
  gameNotFound: "Game not found.",
  backToHome: "Back to home",
  dataSource: "Source: pbpstats.com · Data updated in real-time",
} as const;
