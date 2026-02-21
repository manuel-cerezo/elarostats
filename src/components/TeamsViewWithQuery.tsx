import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TeamsView from "./TeamsView";

export default function TeamsViewWithQuery() {
  return (
    <ReactQueryProvider>
      <TeamsView />
    </ReactQueryProvider>
  );
}
