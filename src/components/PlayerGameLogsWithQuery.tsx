import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import PlayerGameLogs from "./PlayerGameLogs";

interface Props {
  nbaId: number;
}

/**
 * Wrapper con providers para PlayerGameLogs.
 * Se monta con client:only="react" desde la página players/[id].astro.
 */
export default function PlayerGameLogsWithQuery({ nbaId }: Props) {
  return (
    <ReactQueryProvider>
      <PlayerGameLogs nbaId={nbaId} />
    </ReactQueryProvider>
  );
}
