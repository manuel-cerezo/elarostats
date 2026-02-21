import { useRef } from "react";
import { useClickOutside } from "../hooks/useClickOutside";
import { useSearch } from "../hooks/useSearch";
import { useTranslation } from "../hooks/useTranslation";
import type { SearchResult } from "../hooks/useSearch";

export default function PlayerPageSearch() {
  const {
    query,
    results,
    isOpen,
    isLoading,
    activeIndex,
    handleQueryChange,
    handleSelect,
    handleCloseDropdown,
    setActiveIndex,
  } = useSearch();

  const { t } = useTranslation();
  const containerRef = useClickOutside<HTMLDivElement>(handleCloseDropdown);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(Math.min(activeIndex + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(Math.max(activeIndex - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      handleCloseDropdown();
      inputRef.current?.blur();
    }
  }

  function renderResult(result: SearchResult, index: number) {
    const isActive = index === activeIndex;
    const baseClass = `flex w-full cursor-pointer items-center justify-between px-4 py-3 text-sm transition ${
      isActive
        ? "bg-gray-100 dark:bg-gray-700"
        : "hover:bg-gray-50 dark:hover:bg-gray-800"
    }`;

    if (result.type === "player") {
      const { player } = result;
      return (
        <li key={`player-${player.nba_id}`} role="option" aria-selected={isActive}>
          <button
            type="button"
            className={baseClass}
            onClick={() => handleSelect(result)}
            onMouseEnter={() => setActiveIndex(index)}
          >
            <div className="flex flex-col text-left">
              <span className="font-medium text-gray-900 dark:text-white">{player.Name}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {player.TeamAbbreviation} · {player.Pos2}
              </span>
            </div>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {player.MPG?.toFixed(1)} MPG
            </span>
          </button>
        </li>
      );
    }

    return (
      <li key={`team-${result.teamId}`} role="option" aria-selected={isActive}>
        <button
          type="button"
          className={baseClass}
          onClick={() => handleSelect(result)}
          onMouseEnter={() => setActiveIndex(index)}
        >
          <div className="flex items-center gap-2 text-left">
            <img
              src={`/teams/${result.teamId}.svg`}
              alt={result.abbreviation}
              className="h-5 w-5 flex-shrink-0 object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
            <div className="flex flex-col">
              <span className="font-medium text-gray-900 dark:text-white">{result.teamName}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{result.location}</span>
            </div>
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500">{result.abbreviation}</span>
        </button>
      </li>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? t("loadingPlayers") : t("searchPlaceholder")}
        disabled={isLoading}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        autoComplete="off"
        aria-label={t("search")}
      />
      {isOpen && results.length > 0 && (
        <ul
          role="listbox"
          className="absolute right-0 top-full z-10 mt-1 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {results.map((result, index) => renderResult(result, index))}
        </ul>
      )}
    </div>
  );
}
