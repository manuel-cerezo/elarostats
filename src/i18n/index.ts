import { es } from "./es";
import { en } from "./en";

export type Locale = "es" | "en";
export type TranslationKeys = keyof typeof es;
export type TranslationRecord = Record<TranslationKeys, string>;

export const LOCALES: Locale[] = ["es", "en"];
export const DEFAULT_LOCALE: Locale = "es";
export const STORAGE_KEY = "elarostats-lang";

export const translations: Record<Locale, TranslationRecord> = { es, en };

export function getTranslation(locale: Locale): TranslationRecord {
  return translations[locale] ?? translations[DEFAULT_LOCALE];
}
