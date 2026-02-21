import { useTranslation } from "../hooks/useTranslation";
import type { TranslationKeys } from "../i18n";

interface Props {
  k: TranslationKeys;
  className?: string;
}

/**
 * Renderiza un string traducido inline.
 * Útil para textos puntuales en páginas .astro que no pueden usar hooks React.
 *
 * Uso en .astro:
 *   <TranslatedText client:only="react" k="back" />
 */
export default function TranslatedText({ k, className }: Props) {
  const { t } = useTranslation();
  return <span className={className}>{t(k)}</span>;
}
