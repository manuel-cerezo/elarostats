import { useTranslation } from "../hooks/useTranslation";
import type { Locale } from "../i18n";

const LOCALES: Locale[] = ["es", "en"];

export default function LanguageSelector() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
      {LOCALES.map((lang) => (
        <button
          key={lang}
          onClick={() => setLocale(lang)}
          className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
            locale === lang
              ? "bg-orange-500 text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
          aria-pressed={locale === lang}
        >
          {lang}
        </button>
      ))}
    </div>
  );
}
