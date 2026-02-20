import { useState, useRef, useEffect } from "react";
import { searchPlayers, type Player } from "../api/local";

export default function Hero() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    const found = searchPlayers(value);
    setResults(found.slice(0, 8));
    setOpen(found.length > 0);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = searchPlayers(query);
    setResults(found.slice(0, 8));
    setOpen(found.length > 0);
  }

  return (
    <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
        elaro<span className="text-orange-500">stats</span>
      </h1>
      <p className="max-w-xl text-lg text-gray-400">
        NBA stats, analytics, and insights — all in one place.
      </p>

      <div className="relative mt-4 w-full max-w-md" ref={containerRef}>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search a player or team..."
            className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
            autoComplete="off"
          />
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Search
          </button>
        </form>

        {open && results.length > 0 && (
          <ul className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-gray-700 bg-gray-900 shadow-lg">
            {results.map((player) => (
              <li
                key={player.nba_id}
                className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm transition hover:bg-gray-800"
                onClick={() => {
                  setQuery(player.Name);
                  setOpen(false);
                }}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
