import teamsData from "../data/teams.json";

export interface Team {
  teamId: number;
  abbreviation: string;
  teamName: string;
  simpleName: string;
  location: string;
  conference: string;
  division: string;
}

// Local teams from static JSON bundled with the app
const localTeams: Team[] = teamsData.map((t) => ({
  teamId: t.teamId,
  abbreviation: t.abbreviation,
  teamName: t.teamName,
  simpleName: t.simpleName,
  location: t.location,
  conference: t.conference,
  division: t.division,
}));

const localById = new Map<number, Team>(localTeams.map((t) => [t.teamId, t]));
const localByAbbr = new Map<string, Team>(
  localTeams.map((t) => [t.abbreviation, t]),
);

/** Returns all NBA teams from local JSON data. */
export async function getAllTeams(): Promise<Team[]> {
  return localTeams;
}

/** Looks up a team by its NBA team ID. */
export async function getTeamById(teamId: number): Promise<Team | undefined> {
  return localById.get(teamId);
}

/** Looks up a team by its abbreviation (e.g. "DEN"). */
export async function getTeamByAbbreviation(
  abbreviation: string,
): Promise<Team | undefined> {
  return localByAbbr.get(abbreviation.toUpperCase());
}

/** Resolves the team for a player object using TeamId or TeamAbbreviation. */
export async function getPlayerTeam(player: {
  TeamId?: number;
  TeamAbbreviation?: string;
}): Promise<Team | undefined> {
  if (player.TeamId) return getTeamById(player.TeamId);
  if (player.TeamAbbreviation) return getTeamByAbbreviation(player.TeamAbbreviation);
  return undefined;
}
