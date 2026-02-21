/**
 * Hook de conveniencia para acceder a las traducciones y el locale actual.
 *
 * Uso:
 *   const { t, locale, setLocale } = useTranslation();
 *   <p>{t("heroSubtitle")}</p>
 */
export { useLanguage as useTranslation } from "../context/LanguageContext";
