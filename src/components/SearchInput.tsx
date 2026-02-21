import { useTranslation } from "../hooks/useTranslation";

interface SearchInputProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function SearchInput({
  query,
  onChange,
  onSubmit,
  onKeyDown,
}: SearchInputProps) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={t("searchPlaceholderFull")}
        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-orange-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
        autoComplete="off"
        aria-label={t("search")}
      />
      <button
        type="submit"
        className="rounded-lg bg-orange-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
      >
        {t("search")}
      </button>
    </form>
  );
}
