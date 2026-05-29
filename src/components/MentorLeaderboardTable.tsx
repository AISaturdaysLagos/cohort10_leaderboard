import type { TeamMetricBreakdown } from "../types";
import { TeamLeaderboardRow } from "./TeamLeaderboardRow";

type Props = {
  metrics: TeamMetricBreakdown[];
  emptyMessage?: string;
};

export function MentorLeaderboardTable({
  metrics,
  emptyMessage = "No teams in this snapshot.",
}: Props) {
  if (!metrics.length) {
    return (
      <p className="px-6 py-10 text-center font-body text-tri-nav text-tri-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <p className="font-body text-tri-nav text-tri-muted">
        Tap a team to expand category scores. Collapsed view shows rank, name, and total only.
      </p>
      {metrics.map((m, i) => (
        <TeamLeaderboardRow key={m.team} rank={i + 1} m={m} variant="mentor" />
      ))}
    </div>
  );
}
