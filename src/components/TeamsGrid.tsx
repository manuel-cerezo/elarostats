import { useAllTeams } from "../hooks/useAllTeams";
import { useTranslation } from "../hooks/useTranslation";
import { getTeamLogoUrl } from "../utils/playerStats";

export default function TeamsGrid() {
  const { data: teams, isLoading, isError } = useAllTeams();
  const { t } = useTranslation();

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
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
        {t("teams")}
      </p>
      <div className="grid grid-cols-5 gap-3 sm:grid-cols-6 md:grid-cols-10">
        {teams.map((team) => {
          const logoUrl = getTeamLogoUrl(team.teamId);
          return (
            <a
              key={team.teamId}
              href={`/teams/${team.teamId}`}
              title={team.teamName}
              className="flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-gray-800"
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={team.teamName}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <span className="text-xs font-bold text-gray-400">
                  {team.abbreviation}
                </span>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
