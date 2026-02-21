-- Migration: Create teams table
-- Stores the 30 NBA teams with their official NBA team IDs (used by pbpstats and NBA APIs).
-- team_id matches the TeamId field in player_stats, enabling a proper FK relationship.

CREATE TABLE IF NOT EXISTS teams (
  team_id       INTEGER PRIMARY KEY,
  abbreviation  TEXT    NOT NULL UNIQUE,
  team_name     TEXT    NOT NULL,
  simple_name   TEXT    NOT NULL,
  location      TEXT    NOT NULL
);

-- Seed all 30 NBA teams
INSERT INTO teams (team_id, abbreviation, team_name, simple_name, location) VALUES
  (1610612737, 'ATL', 'Atlanta Hawks',              'Hawks',          'Atlanta'),
  (1610612738, 'BOS', 'Boston Celtics',             'Celtics',        'Boston'),
  (1610612751, 'BKN', 'Brooklyn Nets',              'Nets',           'Brooklyn'),
  (1610612766, 'CHA', 'Charlotte Hornets',          'Hornets',        'Charlotte'),
  (1610612741, 'CHI', 'Chicago Bulls',              'Bulls',          'Chicago'),
  (1610612739, 'CLE', 'Cleveland Cavaliers',        'Cavaliers',      'Cleveland'),
  (1610612742, 'DAL', 'Dallas Mavericks',           'Mavericks',      'Dallas'),
  (1610612743, 'DEN', 'Denver Nuggets',             'Nuggets',        'Denver'),
  (1610612765, 'DET', 'Detroit Pistons',            'Pistons',        'Detroit'),
  (1610612744, 'GSW', 'Golden State Warriors',      'Warriors',       'Golden State'),
  (1610612745, 'HOU', 'Houston Rockets',            'Rockets',        'Houston'),
  (1610612754, 'IND', 'Indiana Pacers',             'Pacers',         'Indiana'),
  (1610612746, 'LAC', 'Los Angeles Clippers',       'Clippers',       'Los Angeles'),
  (1610612747, 'LAL', 'Los Angeles Lakers',         'Lakers',         'Los Angeles'),
  (1610612763, 'MEM', 'Memphis Grizzlies',          'Grizzlies',      'Memphis'),
  (1610612748, 'MIA', 'Miami Heat',                 'Heat',           'Miami'),
  (1610612749, 'MIL', 'Milwaukee Bucks',            'Bucks',          'Milwaukee'),
  (1610612750, 'MIN', 'Minnesota Timberwolves',     'Timberwolves',   'Minnesota'),
  (1610612740, 'NOP', 'New Orleans Pelicans',       'Pelicans',       'New Orleans'),
  (1610612752, 'NYK', 'New York Knicks',            'Knicks',         'New York'),
  (1610612760, 'OKC', 'Oklahoma City Thunder',      'Thunder',        'Oklahoma City'),
  (1610612753, 'ORL', 'Orlando Magic',              'Magic',          'Orlando'),
  (1610612755, 'PHI', 'Philadelphia 76ers',         '76ers',          'Philadelphia'),
  (1610612756, 'PHX', 'Phoenix Suns',               'Suns',           'Phoenix'),
  (1610612757, 'POR', 'Portland Trail Blazers',     'Trail Blazers',  'Portland'),
  (1610612758, 'SAC', 'Sacramento Kings',           'Kings',          'Sacramento'),
  (1610612759, 'SAS', 'San Antonio Spurs',          'Spurs',          'San Antonio'),
  (1610612761, 'TOR', 'Toronto Raptors',            'Raptors',        'Toronto'),
  (1610612762, 'UTA', 'Utah Jazz',                  'Jazz',           'Utah'),
  (1610612764, 'WAS', 'Washington Wizards',         'Wizards',        'Washington')
ON CONFLICT (team_id) DO NOTHING;

-- Foreign key from player_stats to teams
ALTER TABLE player_stats
  ADD CONSTRAINT fk_player_stats_team
  FOREIGN KEY (team_id) REFERENCES teams (team_id)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

-- RLS: public read (team names are public information)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read"
  ON teams
  FOR SELECT
  USING (true);
