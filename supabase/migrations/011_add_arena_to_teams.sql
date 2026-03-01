-- Migration: Add arena information to teams table
-- Each NBA team has a home arena with a name and seating capacity.

ALTER TABLE teams ADD COLUMN IF NOT EXISTS arena TEXT;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS arena_capacity INTEGER;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS arena_image TEXT;

UPDATE teams SET arena = 'State Farm Arena',           arena_capacity = 16600  WHERE team_id = 1610612737; -- ATL
UPDATE teams SET arena = 'TD Garden',                  arena_capacity = 19156  WHERE team_id = 1610612738; -- BOS
UPDATE teams SET arena = 'Barclays Center',            arena_capacity = 17732  WHERE team_id = 1610612751; -- BKN
UPDATE teams SET arena = 'Spectrum Center',            arena_capacity = 19077  WHERE team_id = 1610612766; -- CHA
UPDATE teams SET arena = 'United Center',              arena_capacity = 20917  WHERE team_id = 1610612741; -- CHI
UPDATE teams SET arena = 'Rocket Mortgage FieldHouse', arena_capacity = 19432  WHERE team_id = 1610612739; -- CLE
UPDATE teams SET arena = 'American Airlines Center',   arena_capacity = 19200  WHERE team_id = 1610612742; -- DAL
UPDATE teams SET arena = 'Ball Arena',                 arena_capacity = 19520  WHERE team_id = 1610612743; -- DEN
UPDATE teams SET arena = 'Little Caesars Arena',       arena_capacity = 20332  WHERE team_id = 1610612765; -- DET
UPDATE teams SET arena = 'Chase Center',               arena_capacity = 18064  WHERE team_id = 1610612744; -- GSW
UPDATE teams SET arena = 'Toyota Center',              arena_capacity = 18055  WHERE team_id = 1610612745; -- HOU
UPDATE teams SET arena = 'Gainbridge Fieldhouse',      arena_capacity = 17923  WHERE team_id = 1610612754; -- IND
UPDATE teams SET arena = 'Intuit Dome',                arena_capacity = 18000  WHERE team_id = 1610612746; -- LAC
UPDATE teams SET arena = 'Crypto.com Arena',           arena_capacity = 18997  WHERE team_id = 1610612747; -- LAL
UPDATE teams SET arena = 'FedExForum',                 arena_capacity = 17794  WHERE team_id = 1610612763; -- MEM
UPDATE teams SET arena = 'Kaseya Center',              arena_capacity = 19600  WHERE team_id = 1610612748; -- MIA
UPDATE teams SET arena = 'Fiserv Forum',               arena_capacity = 17341  WHERE team_id = 1610612749; -- MIL
UPDATE teams SET arena = 'Target Center',              arena_capacity = 18798  WHERE team_id = 1610612750; -- MIN
UPDATE teams SET arena = 'Smoothie King Center',       arena_capacity = 16867  WHERE team_id = 1610612740; -- NOP
UPDATE teams SET arena = 'Madison Square Garden',      arena_capacity = 19812  WHERE team_id = 1610612752; -- NYK
UPDATE teams SET arena = 'Paycom Center',              arena_capacity = 18203  WHERE team_id = 1610612760; -- OKC
UPDATE teams SET arena = 'Kia Center',                 arena_capacity = 18846  WHERE team_id = 1610612753; -- ORL
UPDATE teams SET arena = 'Wells Fargo Center',         arena_capacity = 20478  WHERE team_id = 1610612755; -- PHI
UPDATE teams SET arena = 'Footprint Center',           arena_capacity = 18055  WHERE team_id = 1610612756; -- PHX
UPDATE teams SET arena = 'Moda Center',                arena_capacity = 19441  WHERE team_id = 1610612757; -- POR
UPDATE teams SET arena = 'Golden 1 Center',            arena_capacity = 17608  WHERE team_id = 1610612758; -- SAC
UPDATE teams SET arena = 'Frost Bank Center',          arena_capacity = 18418  WHERE team_id = 1610612759; -- SAS
UPDATE teams SET arena = 'Scotiabank Arena',           arena_capacity = 19800  WHERE team_id = 1610612761; -- TOR
UPDATE teams SET arena = 'Delta Center',               arena_capacity = 18306  WHERE team_id = 1610612762; -- UTA
UPDATE teams SET arena = 'Capital One Arena',          arena_capacity = 20356  WHERE team_id = 1610612764; -- WAS
