import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import LiveScores from "./LiveScores";

export default function LiveScoresIsland() {
  return (
    <ReactQueryProvider>
      <LiveScores />
    </ReactQueryProvider>
  );
}
