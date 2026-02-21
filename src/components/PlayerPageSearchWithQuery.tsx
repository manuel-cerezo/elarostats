import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import PlayerPageSearch from "./PlayerPageSearch";

/**
 * Wrapper que combina QueryClientProvider + PlayerPageSearch en un único punto de entrada.
 * Se monta con client:only="react" desde Astro para evitar SSR.
 */
export default function PlayerPageSearchWithQuery() {
  return (
    <ReactQueryProvider>
      <PlayerPageSearch />
    </ReactQueryProvider>
  );
}
