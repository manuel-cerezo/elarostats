import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import GamesView from "./GamesView";

export default function GamesViewWithQuery() {
  return (
    <ReactQueryProvider>
      <GamesView />
    </ReactQueryProvider>
  );
}
