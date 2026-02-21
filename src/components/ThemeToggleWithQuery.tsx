import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import ThemeToggle from "./ThemeToggle";

/**
 * Wrapper standalone para el ThemeToggle.
 * Se usa en headers de páginas .astro donde no hay otro provider.
 */
export default function ThemeToggleWithQuery() {
  return (
    <ReactQueryProvider>
      <ThemeToggle />
    </ReactQueryProvider>
  );
}
