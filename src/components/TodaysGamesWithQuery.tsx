import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TodaysGames from "./TodaysGames";

export default function TodaysGamesWithQuery() {
  return (
    <ReactQueryProvider>
      <TodaysGames />
    </ReactQueryProvider>
  );
}
