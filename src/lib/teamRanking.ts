import type { TeamMetricBreakdown } from "../types";

export type RankedTeamMetric = {
  m: TeamMetricBreakdown;
  /** Original rank on the full board (1-based). */
  rank: number;
};

/** Student-facing copy for the team ranking list. */
export const LEADERBOARD_RANKING_NOTE =
  "Teams are ranked by total score. On the first published week, many teams start on equal points, so the board lists them alphabetically by default until scores begin to separate.";

export const LEADERBOARD_SEARCH_NOTE =
  "Search by team name to find your squad quickly — your rank on the full board is still shown.";

/** Filter leaderboard rows by team name; preserves original rank numbers. */
export function filterRankedTeamMetrics(
  metrics: TeamMetricBreakdown[],
  query: string,
): RankedTeamMetric[] {
  const ranked = metrics.map((m, i) => ({ m, rank: i + 1 }));
  const q = query.trim().toLowerCase();
  if (!q) return ranked;
  return ranked.filter(({ m }) => m.team.toLowerCase().includes(q));
}
