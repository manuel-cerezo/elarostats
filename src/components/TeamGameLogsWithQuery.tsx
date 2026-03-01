import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TeamGameLogs from "./TeamGameLogs";

interface Props {
  teamId: number;
}

/**
 * Wrapper con providers para TeamGameLogs.
 * Se monta con client:only="react" desde la página teams/[id].astro.
 */
export default function TeamGameLogsWithQuery({ teamId }: Props) {
  return (
    <ReactQueryProvider>
      <TeamGameLogs teamId={teamId} />
    </ReactQueryProvider>
  );
}
