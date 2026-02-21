import { useMemo, useRef, useState } from "react";
import { useAllPlayers } from "../hooks/useAllPlayers";
import { useClickOutside } from "../hooks/useClickOutside";
import { useTranslation } from "../hooks/useTranslation";
import type { Player } from "../types/player";
import { MAX_SEARCH_RESULTS } from "../constants/player";

export default function PlayerPageSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { data: allPlayers = [], isLoading } = useAllPlayers();
  const { t } = useTranslation();

  const containerRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false));
  const inputRef = useRef<HTMLInputElement>(null);

  // Filtrado client-side sobre los datos cacheados por TanStack Query
  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    return allPlayers
      .filter(
        (p) =>
          p.Name?.toLowerCase().includes(q) ||
          p.ShortName?.toLowerCase().includes(q) ||
          p.TeamAbbreviation?.toLowerCase().includes(q),
      )
      .slice(0, MAX_SEARCH_RESULTS);
  }, [query, allPlayers]);

  function handleChange(value: string) {
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setActiveIndex(-1);
  }

  function navigateToPlayer(player: Player) {
    window.location.href = `/players/${player.nba_id}`;
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        navigateToPlayer(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? t("loadingPlayers") : t("searchPlaceholder")}
        disabled={isLoading}
        className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500 disabled:opacity-50"
        autoComplete="off"
        aria-label={t("search")}
      />
      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-10 mt-1 w-72 overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg"
        >
          {results.map((player, index) => (
            <li key={player.nba_id} role="option" aria-selected={index === activeIndex}>
              <button
                type="button"
                className={`flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition ${
                  index === activeIndex ? "bg-gray-700" : "hover:bg-gray-800"
                }`}
                onClick={() => navigateToPlayer(player)}
                onMouseEnter={() => setActiveIndex(index)}
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
      )}
    </div>
  );
}
