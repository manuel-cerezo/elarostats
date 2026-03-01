import { ReactQueryProvider } from "../lib/ReactQueryProvider";
import TeamRecord from "./TeamRecord";

interface Props {
  teamId: number;
}

export default function TeamRecordWithQuery({ teamId }: Props) {
  return (
    <ReactQueryProvider>
      <TeamRecord teamId={teamId} />
    </ReactQueryProvider>
  );
}
