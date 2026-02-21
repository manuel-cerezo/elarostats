import type { Player } from "../types/player";
import { getHeadshotUrl, getTeamLogoUrl } from "../utils/playerStats";
import { PLAYER_HEADSHOT_FALLBACK_URL } from "../constants/player";

interface PlayerHeaderProps {
  player: Player;
}

export default function PlayerHeader({ player }: PlayerHeaderProps) {
  const teamLogoUrl = getTeamLogoUrl(player.TeamId as number | undefined);

  return (
    <div className="flex items-center gap-4">
      <img
        src={getHeadshotUrl(player.nba_id)}
        alt={player.Name}
        className="h-20 w-20 rounded-full border-2 border-gray-200 object-cover dark:border-gray-700"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            PLAYER_HEADSHOT_FALLBACK_URL;
        }}
      />
      <div className="flex flex-1 items-center justify-between gap-2">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">{player.Name}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {player.TeamAbbreviation} · {player.Pos2}
          </p>
          {player["Offensive Archetype"] && (
            <span className="mt-1 inline-block rounded-full bg-orange-500/20 px-2 py-0.5 text-xs font-medium text-orange-400">
              {player["Offensive Archetype"]}
            </span>
          )}
        </div>
        {teamLogoUrl && player.TeamId && (
          <a
            href={`/teams/${player.TeamId}`}
            title={player.TeamAbbreviation}
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={teamLogoUrl}
              alt={player.TeamAbbreviation}
              className="h-14 w-14 flex-shrink-0 object-contain opacity-90 transition hover:opacity-100"
            />
          </a>
        )}
      </div>
    </div>
  );
}
