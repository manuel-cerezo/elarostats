import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import LanguageSelector from "./LanguageSelector";

/**
 * Wrapper standalone para el LanguageSelector.
 * Se usa en headers de páginas .astro donde no hay otro provider.
 * El estado se sincroniza entre islas vía localStorage + StorageEvent.
 */
export default function LanguageSelectorWithQuery() {
  return (
    <ReactQueryProvider>
      <LanguageSelector />
    </ReactQueryProvider>
  );
}
