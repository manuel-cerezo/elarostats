import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import PlayersView from "./PlayersView";

export default function PlayersViewWithQuery() {
  return (
    <ReactQueryProvider>
      <PlayersView />
    </ReactQueryProvider>
  );
}
