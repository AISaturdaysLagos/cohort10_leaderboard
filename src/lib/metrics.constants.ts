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
    /** When primary award metric ties, break using these fields in order (see docs/METRICS.md). */
    teamOfWeekTieBreak: "totalScore, completionRate, quiz, participation, effort, consistency, avgQuiz",
  },
} as const;

export type MetricId = keyof typeof METRICS.weights;

/** Student-facing scoring categories — labels and descriptions only (no point weights). */
export const SCORING_CATEGORIES = [
  {
    id: "completion",
    label: "Completion",
    description: "Finishing this week's module on Skills Boost.",
  },
  {
    id: "quiz",
    label: "Quiz",
    description: "How well your team does on the course quizzes.",
  },
  {
    id: "participation",
    label: "Participation",
    description: "Showing up and starting the weekly work.",
  },
  {
    id: "effort",
    label: "Effort",
    description: "Time spent learning (up to about two hours per person counts fully).",
  },
  {
    id: "consistency",
    label: "Together",
    description: "Everyone on the team takes part, not just a few people.",
  },
] as const;
