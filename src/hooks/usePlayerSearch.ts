import { useMemo, useState } from "react";
import { useAllPlayers } from "./useAllPlayers";
import type { Player } from "../types/player";
import { MAX_SEARCH_RESULTS } from "../constants/player";

interface UsePlayerSearchReturn {
  query: string;
  results: Player[];
  isOpen: boolean;
  isLoading: boolean;
  isError: boolean;
  activeIndex: number;
  selectedPlayer: Player | null;
  handleQueryChange: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleSelectPlayer: (player: Player) => void;
  handleCloseDropdown: () => void;
  handleClosePlayer: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setActiveIndex: (index: number) => void;
}

export function usePlayerSearch(): UsePlayerSearchReturn {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  const { data: allPlayers = [], isLoading, isError } = useAllPlayers();

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

  function handleQueryChange(value: string) {
    setQuery(value);
    setIsOpen(value.trim().length > 0);
    setActiveIndex(-1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsOpen(results.length > 0);
  }

  function handleSelectPlayer(player: Player) {
    window.location.href = `/players/${player.nba_id}`;
  }

  function handleCloseDropdown() {
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleClosePlayer() {
    setSelectedPlayer(null);
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
        handleSelectPlayer(results[activeIndex]);
      }
    } else if (e.key === "Escape") {
      handleCloseDropdown();
    }
  }

  return {
    query,
    results,
    isOpen: isOpen && results.length > 0,
    isLoading,
    isError,
    activeIndex,
    selectedPlayer,
    handleQueryChange,
    handleSubmit,
    handleSelectPlayer,
    handleCloseDropdown,
    handleClosePlayer,
    handleKeyDown,
    setActiveIndex,
  };
}
