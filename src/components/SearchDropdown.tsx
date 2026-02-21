import type { SearchResult } from "../hooks/useSearch";

interface SearchDropdownProps {
  results: SearchResult[];
  activeIndex: number;
  onSelect: (result: SearchResult) => void;
  onHover: (index: number) => void;
}

export default function SearchDropdown({
  results,
  activeIndex,
  onSelect,
  onHover,
}: SearchDropdownProps) {
  if (results.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Search results"
      className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg"
    >
      {results.map((result, index) => {
        const isActive = index === activeIndex;
        const baseClass = `flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition ${
          isActive ? "bg-gray-700" : "hover:bg-gray-800"
        }`;

        if (result.type === "player") {
          const { player } = result;
          return (
            <li
              key={`player-${player.nba_id}`}
              role="option"
              aria-selected={isActive}
            >
              <button
                type="button"
                className={baseClass}
                onClick={() => onSelect(result)}
                onMouseEnter={() => onHover(index)}
              >
                <div className="flex items-center gap-2.5 text-left">
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gray-700 text-xs text-gray-400">
                    {player.Name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-white">{player.Name}</span>
                    <span className="text-xs text-gray-400">
                      {player.TeamAbbreviation} · {player.Pos2}
                    </span>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {player.MPG?.toFixed(1)} MPG
                </span>
              </button>
            </li>
          );
        }

        // Team result
        return (
          <li
            key={`team-${result.teamId}`}
            role="option"
            aria-selected={isActive}
          >
            <button
              type="button"
              className={baseClass}
              onClick={() => onSelect(result)}
              onMouseEnter={() => onHover(index)}
            >
              <div className="flex items-center gap-2.5 text-left">
                <img
                  src={`/teams/${result.teamId}.svg`}
                  alt={result.abbreviation}
                  className="h-7 w-7 flex-shrink-0 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <div className="flex flex-col">
                  <span className="font-medium text-white">{result.teamName}</span>
                  <span className="text-xs text-gray-400">{result.location}</span>
                </div>
              </div>
              <span className="rounded-full bg-gray-700/60 px-2 py-0.5 text-xs text-gray-400">
                {result.abbreviation}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
