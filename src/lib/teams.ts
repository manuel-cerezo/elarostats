import { supabase } from "./supabase";
import teamsData from "../data/teams.json";

export interface Team {
  teamId: number;
  abbreviation: string;
  teamName: string;
  simpleName: string;
  location: string;
}

// Local fallback (static JSON bundled with the app)
const localTeams: Team[] = teamsData.map((t) => ({
  teamId: t.teamId,
  abbreviation: t.abbreviation,
  teamName: t.teamName,
  simpleName: t.simpleName,
  location: t.location,
}));

const localById = new Map<number, Team>(localTeams.map((t) => [t.teamId, t]));
const localByAbbr = new Map<string, Team>(
  localTeams.map((t) => [t.abbreviation, t]),
);

/** Fetches all teams from Supabase, falls back to local JSON. */
export async function getAllTeams(): Promise<Team[]> {
  if (!supabase) return localTeams;

  const { data, error } = await supabase
    .from("teams")
    .select("team_id, abbreviation, team_name, simple_name, location")
    .order("team_name");

  if (error || !data?.length) return localTeams;

  return data.map((row) => ({
    teamId: row.team_id,
    abbreviation: row.abbreviation,
    teamName: row.team_name,
    simpleName: row.simple_name,
    location: row.location,
  }));
}

/** Looks up a team by its NBA team ID. Falls back to local JSON. */
export async function getTeamById(teamId: number): Promise<Team | undefined> {
  if (!supabase) return localById.get(teamId);

  const { data, error } = await supabase
    .from("teams")
    .select("team_id, abbreviation, team_name, simple_name, location")
    .eq("team_id", teamId)
    .single();

  if (error || !data) return localById.get(teamId);

  return {
    teamId: data.team_id,
    abbreviation: data.abbreviation,
    teamName: data.team_name,
    simpleName: data.simple_name,
    location: data.location,
  };
}

/** Looks up a team by its abbreviation (e.g. "DEN"). Falls back to local JSON. */
export async function getTeamByAbbreviation(
  abbreviation: string,
): Promise<Team | undefined> {
  const upper = abbreviation.toUpperCase();
  if (!supabase) return localByAbbr.get(upper);

  const { data, error } = await supabase
    .from("teams")
    .select("team_id, abbreviation, team_name, simple_name, location")
    .eq("abbreviation", upper)
    .single();

  if (error || !data) return localByAbbr.get(upper);

  return {
    teamId: data.team_id,
    abbreviation: data.abbreviation,
    teamName: data.team_name,
    simpleName: data.simple_name,
    location: data.location,
  };
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
