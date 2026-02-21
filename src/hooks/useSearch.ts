import { useMemo, useState } from "react";
import { useAllPlayers } from "./useAllPlayers";
import type { Player } from "../types/player";
import { MAX_SEARCH_RESULTS } from "../constants/player";
import teamsData from "../data/teams.json";

export interface TeamResult {
  type: "team";
  teamId: number;
  teamName: string;
  simpleName: string;
  abbreviation: string;
  location: string;
}

export interface PlayerResult {
  type: "player";
  player: Player;
}

export type SearchResult = PlayerResult | TeamResult;

const allTeams: TeamResult[] = teamsData.map((t) => ({
  type: "team" as const,
  teamId: t.teamId,
  teamName: t.teamName,
  simpleName: t.simpleName,
  abbreviation: t.abbreviation,
  location: t.location,
}));

interface UseSearchReturn {
  query: string;
  results: SearchResult[];
  isOpen: boolean;
  isLoading: boolean;
  isError: boolean;
  activeIndex: number;
  handleQueryChange: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleSelect: (result: SearchResult) => void;
  handleCloseDropdown: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setActiveIndex: (index: number) => void;
}

export function useSearch(): UseSearchReturn {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const { data: allPlayers = [], isLoading, isError } = useAllPlayers();

  const results = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();

    const teamResults: TeamResult[] = allTeams
      .filter(
        (t) =>
          t.teamName.toLowerCase().includes(q) ||
          t.simpleName.toLowerCase().includes(q) ||
          t.abbreviation.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q),
      )
      .slice(0, 3);

    const playerResults: PlayerResult[] = allPlayers
      .filter(
        (p) =>
          p.Name?.toLowerCase().includes(q) ||
          p.ShortName?.toLowerCase().includes(q) ||
          p.TeamAbbreviation?.toLowerCase().includes(q),
      )
      .slice(0, MAX_SEARCH_RESULTS - teamResults.length)
      .map((p) => ({ type: "player" as const, player: p }));

    // Teams first if query matches team names, players first otherwise
    const teamExactMatch = allTeams.some(
      (t) =>
        t.teamName.toLowerCase().startsWith(q) ||
        t.simpleName.toLowerCase().startsWith(q) ||
        t.abbreviation.toLowerCase() === q,
    );

    if (teamExactMatch) {
      return [...teamResults, ...playerResults];
    }
    return [...playerResults, ...teamResults];
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

  function handleSelect(result: SearchResult) {
    if (result.type === "player") {
      window.location.href = `/players/${result.player.nba_id}`;
    } else {
      window.location.href = `/teams/${result.teamId}`;
    }
  }

  function handleCloseDropdown() {
    setIsOpen(false);
    setActiveIndex(-1);
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
        handleSelect(results[activeIndex]);
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
    handleQueryChange,
    handleSubmit,
    handleSelect,
    handleCloseDropdown,
    handleKeyDown,
    setActiveIndex,
  };
}
