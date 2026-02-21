import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import PlayerStatsPage from "./PlayerStatsPage";
import type { Player } from "../types/player";

interface Props {
  player: Player;
}

/**
 * Wrapper con providers para PlayerStatsPage.
 * Se monta con client:only="react" desde la página players/[id].astro.
 */
export default function PlayerStatsPageWithQuery({ player }: Props) {
  return (
    <ReactQueryProvider>
      <PlayerStatsPage player={player} />
    </ReactQueryProvider>
  );
}
