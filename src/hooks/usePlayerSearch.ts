import { useState } from "react";
import { searchPlayers } from "../api/local";
import type { Player } from "../types/player";
import { MAX_SEARCH_RESULTS } from "../constants/player";

interface UsePlayerSearchReturn {
  query: string;
  results: Player[];
  isOpen: boolean;
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
  const [results, setResults] = useState<Player[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  function search(value: string) {
    const found = searchPlayers(value);
    const sliced = found.slice(0, MAX_SEARCH_RESULTS);
    setResults(sliced);
    setIsOpen(sliced.length > 0);
    setActiveIndex(-1);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    search(value);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    search(query);
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
    isOpen,
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
