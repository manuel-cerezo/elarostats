import { es } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";
export type TranslationKeys = keyof typeof es;

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";
export const STORAGE_KEY = "elarostats-lang";

export const translations: Record<Locale, typeof es> = { es, en };

export function getTranslation(locale: Locale): typeof es {
  return translations[locale] ?? translations[DEFAULT_LOCALE];
}
