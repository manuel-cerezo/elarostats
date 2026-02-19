import { useState } from "react";

export default function Hero() {
  const [query, setQuery] = useState("");

  return (
    <section className="flex flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
        elaro<span className="text-orange-500">stats</span>
      </h1>
      <p className="max-w-xl text-lg text-gray-400">
        NBA stats, analytics, and insights — all in one place.
      </p>

      <div className="mt-4 flex w-full max-w-md gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a player or team..."
          className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-4 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-orange-500"
        />
        <button className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
          Search
        </button>
      </div>
    </section>
  );
}
