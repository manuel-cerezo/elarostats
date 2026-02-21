import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import Hero from "./Hero";

/**
 * Wrapper que combina QueryClientProvider + Hero en un único punto de entrada.
 * Se monta con client:only="react" desde Astro para evitar SSR.
 */
export default function HeroWithQuery() {
  return (
    <ReactQueryProvider>
      <Hero />
    </ReactQueryProvider>
  );
}
