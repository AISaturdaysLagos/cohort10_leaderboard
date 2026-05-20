import type { ActivityRow, RosterRow, TeamMetricBreakdown, WeekBounds, WeeklyAwards } from "../types";

export type MetricId = "completion" | "quiz" | "participation" | "effort" | "consistency";

export type MetricDefinition = {
  id: MetricId;
  label: string;
  maxPoints: number;
  summary: string;
};

export const METRICS: {
  readonly totalMaxPoints: number;
  readonly weights: {
    readonly completion: number;
    readonly quiz: number;
    readonly participation: number;
    readonly effort: number;
    readonly consistency: number;
  };
  readonly effort: { readonly expectedWeeklyMinutesPerMember: number };
  readonly awards: {
    readonly comebackPreviousScoreBelow: number;
    readonly comebackMinPointGain: number;
    readonly teamOfWeekTieBreak: string;
  };
};

export const METRIC_DEFINITIONS: MetricDefinition[];

export function uniqueTeamsFromRoster(roster: RosterRow[]): string[];

export function computeTeamMetrics(
  rows: ActivityRow[],
  roster: RosterRow[],
  week: WeekBounds,
  focalActivity: string,
): TeamMetricBreakdown[];

export function computeWeeklyAwards(
  current: TeamMetricBreakdown[],
  previous: TeamMetricBreakdown[] | null,
): WeeklyAwards;
