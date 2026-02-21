import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TeamRoster from "./TeamRoster";
import type { Team } from "../lib/teams";

interface Props {
  team: Team;
}

/**
 * Wrapper que combina QueryClientProvider + TeamRoster en un único punto de entrada.
 * Se monta con client:only="react" desde Astro para evitar SSR.
 */
export default function TeamRosterWithQuery({ team }: Props) {
  return (
    <ReactQueryProvider>
      <TeamRoster team={team} />
    </ReactQueryProvider>
  );
}
