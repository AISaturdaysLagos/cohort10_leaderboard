/**
 * Team leaderboard metrics — weights, formulas, and computation.
 * Human-readable reference: docs/METRICS.md
 */
import { isInRange } from "./dates";

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
};

/** Display copy derived from METRICS — keep UI in sync with computation. */
export const METRIC_DEFINITIONS = [
  {
    id: "completion",
    label: "Completion",
    maxPoints: METRICS.weights.completion,
    summary:
      "Completion rate × max points — share of active roster members who finished the focal course (Passed or Date completed).",
  },
  {
    id: "quiz",
    label: "Quiz / understanding",
    maxPoints: METRICS.weights.quiz,
    summary:
      "Mean Given Score (0–1) on focal course rows × max points — each member contributes their best score from in-week focal rows, or all focal rows if none in week.",
  },
  {
    id: "participation",
    label: "Participation",
    maxPoints: METRICS.weights.participation,
    summary:
      "Participation rate × max points — member counts if roster Last active is in the week OR they started the focal course in the week.",
  },
  {
    id: "effort",
    label: "Effort",
    maxPoints: METRICS.weights.effort,
    summary: `min(avg learning minutes ÷ ${METRICS.effort.expectedWeeklyMinutesPerMember}, 1) × max points — summed from the same focal-course row pool as quiz, averaged across active members.`,
  },
  {
    id: "consistency",
    label: "Consistency",
    maxPoints: METRICS.weights.consistency,
    summary:
      "(1 − inactive ÷ active) × max points — inactive = active member with no participation signal this week.",
  },
];

function normType(t) {
  return t.trim().toLowerCase();
}

function activeEmailsForTeam(roster, team) {
  return roster.filter((r) => r.team === team && r.status === "active").map((r) => r.email);
}

function memberParticipatedThisWeek(email, team, roster, focalActivity, rows, week) {
  const rosterRow = roster.find((r) => r.email === email && r.team === team);
  if (rosterRow?.lastActive && isInRange(rosterRow.lastActive, week)) return true;
  return rows.some(
    (r) =>
      r.member === email &&
      r.activity === focalActivity &&
      normType(r.activityType) === "course" &&
      r.dateStarted &&
      isInRange(r.dateStarted, week),
  );
}

function memberCompletedFocal(email, focalActivity, rows) {
  return rows.some((r) => {
    if (r.member !== email) return false;
    if (r.activity !== focalActivity) return false;
    if (normType(r.activityType) !== "course") return false;
    if (r.passed) return true;
    if (r.dateCompleted) return true;
    return false;
  });
}

function focalRowsForMember(email, focalActivity, rows) {
  return rows.filter(
    (r) =>
      r.member === email && r.activity === focalActivity && normType(r.activityType) === "course",
  );
}

export function uniqueTeamsFromRoster(roster) {
  const teams = new Set();
  for (const r of roster) {
    if (r.status !== "active") continue;
    teams.add(r.team);
  }
  return [...teams].sort((a, b) => a.localeCompare(b));
}

/** @see docs/METRICS.md */
export function computeTeamMetrics(rows, roster, week, focalActivity) {
  const { weights, effort: effortCfg } = METRICS;
  const teams = uniqueTeamsFromRoster(roster);
  const out = [];

  for (const team of teams) {
    const actives = activeEmailsForTeam(roster, team);
    const activeMembers = actives.length;
    if (activeMembers === 0) continue;

    let participatedCount = 0;
    let completedCount = 0;
    const quizVals = [];
    let totalMinutes = 0;

    for (const email of actives) {
      if (memberParticipatedThisWeek(email, team, roster, focalActivity, rows, week)) {
        participatedCount++;
      }
      if (memberCompletedFocal(email, focalActivity, rows)) {
        completedCount++;
      }
      const fr = focalRowsForMember(email, focalActivity, rows);
      const inWeekRows = fr.filter(
        (r) =>
          (r.dateStarted && isInRange(r.dateStarted, week)) ||
          (r.dateCompleted && isInRange(r.dateCompleted, week)),
      );
      const pool = inWeekRows.length ? inWeekRows : fr;
      const scores = pool.map((r) => r.givenScore).filter((s) => s != null && Number.isFinite(s));
      if (scores.length) {
        quizVals.push(Math.max(...scores));
      }
      const mins = pool.reduce(
        (a, r) => a + (Number.isFinite(r.learningMinutes) ? r.learningMinutes : 0),
        0,
      );
      totalMinutes += mins;
    }

    const completionRate = completedCount / activeMembers;
    const completionPoints = completionRate * weights.completion;

    const avgQuiz = quizVals.length ? quizVals.reduce((a, b) => a + b, 0) / quizVals.length : 0;
    const quizPoints = avgQuiz * weights.quiz;

    const participationRate = participatedCount / activeMembers;
    const participationPoints = participationRate * weights.participation;

    const avgLearningMinutes = totalMinutes / activeMembers;
    const effortRatio = Math.min(avgLearningMinutes / effortCfg.expectedWeeklyMinutesPerMember, 1);
    const effortPoints = effortRatio * weights.effort;

    const inactiveCount = activeMembers - participatedCount;
    const consistencyRate = 1 - inactiveCount / activeMembers;
    const consistencyPoints = consistencyRate * weights.consistency;

    const totalScore =
      completionPoints + quizPoints + participationPoints + effortPoints + consistencyPoints;

    out.push({
      team,
      activeMembers,
      completedCount,
      completionRate,
      completionPoints,
      avgQuiz,
      quizPoints,
      participatedCount,
      participationRate,
      participationPoints,
      avgLearningMinutes,
      effortRatio,
      effortPoints,
      inactiveCount,
      consistencyRate,
      consistencyPoints,
      totalScore,
    });
  }

  out.sort((a, b) => b.totalScore - a.totalScore);
  return out;
}

export function computeWeeklyAwards(current, previous) {
  const { awards } = METRICS;
  const byTeam = (m) => new Map(m.map((x) => [x.team, x]));
  const cur = byTeam(current);
  const prev = previous ? byTeam(previous) : null;

  let teamOfTheWeek = null;
  let best = -1;
  for (const t of current) {
    if (t.totalScore > best) {
      best = t.totalScore;
      teamOfTheWeek = t.team;
    } else if (t.totalScore === best && teamOfTheWeek) {
      const curBest = cur.get(teamOfTheWeek);
      if (t.completionRate > curBest.completionRate) teamOfTheWeek = t.team;
    }
  }

  let deepLearners = null;
  let bestQuiz = -1;
  for (const t of current) {
    if (t.avgQuiz > bestQuiz) {
      bestQuiz = t.avgQuiz;
      deepLearners = t.team;
    }
  }

  let perfectAttendance = null;
  for (const t of current) {
    if (t.participationRate >= 1 - 1e-9) {
      perfectAttendance = t.team;
      break;
    }
  }

  let mostImproved = null;
  let bestDelta = -Infinity;
  if (prev) {
    for (const t of current) {
      const p = prev.get(t.team);
      if (!p) continue;
      const d = t.totalScore - p.totalScore;
      if (d > bestDelta) {
        bestDelta = d;
        mostImproved = t.team;
      }
    }
    if (bestDelta <= 0) mostImproved = null;
  }

  let comebackTeam = null;
  let bestComeback = -Infinity;
  if (prev) {
    for (const t of current) {
      const p = prev.get(t.team);
      if (!p) continue;
      if (p.totalScore >= awards.comebackPreviousScoreBelow) continue;
      const d = t.totalScore - p.totalScore;
      if (d > awards.comebackMinPointGain && d > bestComeback) {
        bestComeback = d;
        comebackTeam = t.team;
      }
    }
  }

  return {
    teamOfTheWeek,
    mostImproved,
    perfectAttendance,
    deepLearners,
    comebackTeam,
  };
}
