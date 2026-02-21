import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TeamsGrid from "./TeamsGrid";

/**
 * Wrapper que combina QueryClientProvider + TeamsGrid en un único punto de entrada.
 * Se monta con client:only="react" desde Astro para evitar SSR.
 */
export default function TeamsGridWithQuery() {
  return (
    <ReactQueryProvider>
      <TeamsGrid />
    </ReactQueryProvider>
  );
}
