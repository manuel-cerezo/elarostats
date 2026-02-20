import type { Player } from "../types/player";

interface SearchDropdownProps {
  results: Player[];
  activeIndex: number;
  onSelect: (player: Player) => void;
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
      {results.map((player, index) => (
        <li key={player.nba_id} role="option" aria-selected={index === activeIndex}>
          <button
            type="button"
            className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition ${
              index === activeIndex ? "bg-gray-700" : "hover:bg-gray-800"
            }`}
            onClick={() => onSelect(player)}
            onMouseEnter={() => onHover(index)}
          >
            <div className="flex flex-col text-left">
              <span className="font-medium text-white">{player.Name}</span>
              <span className="text-xs text-gray-400">
                {player.TeamAbbreviation} · {player.Pos2}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {player.MPG?.toFixed(1)} MPG
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
