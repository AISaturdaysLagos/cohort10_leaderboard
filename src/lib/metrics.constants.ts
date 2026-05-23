/** Weights and award thresholds — safe to import from student UI without pulling in scoring logic. */
export const METRICS = {
  totalMaxPoints: 100,
  weights: {
    completion: 40,
    quiz: 20,
    participation: 15,
    effort: 15,
    consistency: 10,
  },
  effort: {
    expectedWeeklyMinutesPerMember: 120,
  },
  awards: {
    comebackPreviousScoreBelow: 50,
    comebackMinPointGain: 5,
    teamOfWeekTieBreak: "higher_completion_rate",
  },
} as const;

export type MetricId = keyof typeof METRICS.weights;
