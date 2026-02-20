import { useState } from "react";
import { searchPlayers } from "../api/local";
import type { Player } from "../types/player";
import { MAX_SEARCH_RESULTS } from "../constants/player";

interface UsePlayerSearchReturn {
  query: string;
  results: Player[];
  isOpen: boolean;
  selectedPlayer: Player | null;
  handleQueryChange: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleSelectPlayer: (player: Player) => void;
  handleCloseDropdown: () => void;
  handleClosePlayer: () => void;
}

export function usePlayerSearch(): UsePlayerSearchReturn {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  function search(value: string) {
    const found = searchPlayers(value);
    setResults(found.slice(0, MAX_SEARCH_RESULTS));
    setIsOpen(found.length > 0);
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
    setQuery(player.Name);
    setIsOpen(false);
    setSelectedPlayer(player);
  }

  function handleCloseDropdown() {
    setIsOpen(false);
  }

  function handleClosePlayer() {
    setSelectedPlayer(null);
  }

  return {
    query,
    results,
    isOpen,
    selectedPlayer,
    handleQueryChange,
    handleSubmit,
    handleSelectPlayer,
    handleCloseDropdown,
    handleClosePlayer,
  };
}
