import { useSearch } from "../hooks/useSearch";
import { useClickOutside } from "../hooks/useClickOutside";
import SearchInput from "./SearchInput";
import SearchDropdown from "./SearchDropdown";

export default function Hero() {
  const {
    query,
    results,
    isOpen,
    activeIndex,
    handleQueryChange,
    handleSubmit,
    handleSelect,
    handleCloseDropdown,
    handleKeyDown,
    setActiveIndex,
  } = useSearch();

  const containerRef = useClickOutside<HTMLDivElement>(handleCloseDropdown);

  return (
    <section className="flex flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
        elaro<span className="text-orange-500">stats</span>
      </h1>
      <p className="max-w-xl text-lg text-gray-400">
        NBA stats, analytics, and insights — all in one place.
      </p>

      <div className="relative mt-4 w-full max-w-md" ref={containerRef}>
        <SearchInput
          query={query}
          onChange={handleQueryChange}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
        />
        {isOpen && (
          <SearchDropdown
            results={results}
            activeIndex={activeIndex}
            onSelect={handleSelect}
            onHover={setActiveIndex}
          />
        )}
      </div>
    </section>
  );
}
