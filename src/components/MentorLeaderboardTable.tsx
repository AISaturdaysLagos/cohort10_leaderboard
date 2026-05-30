import type { TeamMetricBreakdown } from "../types";
import { TeamRankingList } from "./TeamRankingList";

type Props = {
  metrics: TeamMetricBreakdown[];
  emptyMessage?: string;
};

export function MentorLeaderboardTable({
  metrics,
  emptyMessage = "No teams in this snapshot.",
}: Props) {
  return (
    <div className="p-4">
      <TeamRankingList metrics={metrics} variant="mentor" emptyMessage={emptyMessage} />
    </div>
  );
}
