import { useMemo } from "react";
import { useAllTeams } from "../hooks/useAllTeams";
import { useTranslation } from "../hooks/useTranslation";
import { getTeamLogoUrl } from "../utils/playerStats";

export default function TeamsGrid() {
  const { data: teams, isLoading, isError } = useAllTeams();
  const { t } = useTranslation();

  const { east, west } = useMemo(() => {
    if (!teams) return { east: [], west: [] };
    return {
      east: teams.filter((team) => team.conference === "East"),
      west: teams.filter((team) => team.conference === "West"),
    };
  }, [teams]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-orange-500" />
      </div>
    );
  }

  if (isError || !teams?.length) return null;

  return (
    <div className="w-full max-w-3xl">
      <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t("teams")}
      </p>

      <div className="flex flex-col gap-6">
        {/* Eastern Conference */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-orange-500/80">
            {t("conferenceEast")}
          </p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {east.map((team) => {
              const logoUrl = getTeamLogoUrl(team.teamId);
              return (
                <a
                  key={team.teamId}
                  href={`/teams/${team.teamId}`}
                  title={team.teamName}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={team.teamName}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{team.abbreviation}</span>
                  )}
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    {team.abbreviation}
                  </span>
                </a>
              );
            })}
          </div>
        </div>

        {/* Western Conference */}
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-orange-500/80">
            {t("conferenceWest")}
          </p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 md:grid-cols-8">
            {west.map((team) => {
              const logoUrl = getTeamLogoUrl(team.teamId);
              return (
                <a
                  key={team.teamId}
                  href={`/teams/${team.teamId}`}
                  title={team.teamName}
                  className="flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={team.teamName}
                      className="h-10 w-10 object-contain"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">{team.abbreviation}</span>
                  )}
                  <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    {team.abbreviation}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
