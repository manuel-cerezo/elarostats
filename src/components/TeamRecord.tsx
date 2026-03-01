import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

interface Props {
  teamId: number;
}

export default function TeamRecord({ teamId }: Props) {
  const [record, setRecord] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      if (!supabase) return;
      const { data } = await supabase
        .from("pbp_team_totals")
        .select("wins, losses")
        .eq("entity_id", teamId)
        .eq("season", "2025-26")
        .eq("season_type", "Regular Season")
        .single();
      if (data) {
        setRecord(`${data.wins}-${data.losses}`);
      }
    }
    fetch();
  }, [teamId]);

  if (!record) return null;

  return (
    <span className="relative top-[-2px] inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
      {record}
    </span>
  );
}
