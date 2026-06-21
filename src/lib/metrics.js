/**
 * Team leaderboard metrics — formulas and computation.
 * Weights: ./metrics.constants.ts · docs: docs/METRICS.md
 */
import { isInRange } from "./dates";
import { METRICS } from "./metrics.constants";

export { METRICS } from "./metrics.constants";

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
      "Sum of best Given Scores (0–1) across active members ÷ active roster size × max points — members with no quiz score count as 0.",
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

/** Prefer team match; fall back to email-only (handles team-name drift between exports). */
function findRosterMember(email, team, roster) {
  return roster.find((r) => r.email === email && r.team === team) ?? roster.find((r) => r.email === email);
}

function memberParticipatedThisWeek(email, team, roster, focalActivity, rows, week) {
  const rosterRow = findRosterMember(email, team, roster);
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
    let totalQuiz = 0;
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
      totalQuiz += scores.length ? Math.max(...scores) : 0;
      const mins = pool.reduce(
        (a, r) => a + (Number.isFinite(r.learningMinutes) ? r.learningMinutes : 0),
        0,
      );
      totalMinutes += mins;
    }

    const completionRate = completedCount / activeMembers;
    const completionPoints = completionRate * weights.completion;

    const avgQuiz = totalQuiz / activeMembers;
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

function memberParticipatedFromActivity(email, focalActivity, rows, week) {
  return rows.some(
    (r) =>
      r.member === email &&
      r.activity === focalActivity &&
      normType(r.activityType) === "course" &&
      r.dateStarted &&
      isInRange(r.dateStarted, week),
  );
}

function memberQuizAndMinutes(email, focalActivity, rows, week) {
  const fr = focalRowsForMember(email, focalActivity, rows);
  const inWeekRows = fr.filter(
    (r) =>
      (r.dateStarted && isInRange(r.dateStarted, week)) ||
      (r.dateCompleted && isInRange(r.dateCompleted, week)),
  );
  const pool = inWeekRows.length ? inWeekRows : fr;
  const scores = pool.map((r) => r.givenScore).filter((s) => s != null && Number.isFinite(s));
  const bestQuiz = scores.length ? Math.max(...scores) : null;
  const learningMinutes = pool.reduce(
    (a, r) => a + (Number.isFinite(r.learningMinutes) ? r.learningMinutes : 0),
    0,
  );
  return { bestQuiz, learningMinutes };
}

/** Metrics for one learner (team map email + optional roster row). */
export function computeMemberMetric(email, teamName, roster, rows, week, focalActivity) {
  const rosterRow = findRosterMember(email, teamName, roster);
  const team = rosterRow?.team ?? teamName;
  const status = rosterRow?.status ?? "unmapped";

  let participated = false;
  if (rosterRow?.lastActive && isInRange(rosterRow.lastActive, week)) {
    participated = true;
  } else if (status === "active") {
    participated = memberParticipatedThisWeek(email, team, roster, focalActivity, rows, week);
  } else {
    participated = memberParticipatedFromActivity(email, focalActivity, rows, week);
  }

  const completed = memberCompletedFocal(email, focalActivity, rows);
  const { bestQuiz, learningMinutes } = memberQuizAndMinutes(email, focalActivity, rows, week);

  return {
    email,
    status,
    participated,
    completed,
    bestQuiz,
    learningMinutes,
    lastActive: rosterRow?.lastActive ?? null,
  };
}

/** Per-email metrics for roster members and optional extra team-map emails. */
export function computeMemberMetrics(rows, roster, week, focalActivity, extraEmails = []) {
  /** @type {Record<string, import("../types").MemberMetricBreakdown>} */
  const out = {};
  for (const r of roster) {
    if (!r.team) continue;
    out[r.email] = computeMemberMetric(r.email, r.team, roster, rows, week, focalActivity);
  }
  for (const { email, teamName } of extraEmails) {
    if (!out[email]) {
      out[email] = computeMemberMetric(email, teamName, roster, rows, week, focalActivity);
    }
  }
  return out;
}

const SCORE_EPS = 1e-9;

/** Tie-break fields for team metrics — earlier fields win first; unresolved tie → no award. */
const TEAM_SCORE_TIE_BREAK = [
  "totalScore",
  "completionRate",
  "quizPoints",
  "participationRate",
  "effortPoints",
  "consistencyPoints",
  "avgQuiz",
];

const QUIZ_TIE_BREAK = ["avgQuiz", "totalScore", "completionRate", "quizPoints", "effortPoints"];

const ATTENDANCE_TIE_BREAK = [
  "totalScore",
  "completionRate",
  "quizPoints",
  "effortPoints",
  "consistencyPoints",
];

/** Prefer teams not yet awarded elsewhere; keep full pool if everyone already won. */
function preferUnawarded(pool, alreadyWon) {
  if (!alreadyWon?.size) return pool;
  const fresh = pool.filter((c) => !alreadyWon.has(c.team));
  return fresh.length > 0 ? fresh : pool;
}

/** One winner after tie-break fields, or [] if still tied. */
function pickSingleTeam(candidates, fields, alreadyWon = new Set()) {
  if (!candidates.length) return [];
  let pool = preferUnawarded(candidates, alreadyWon);
  for (const f of fields) {
    let best = -Infinity;
    for (const c of pool) {
      if (c[f] > best) best = c[f];
    }
    if (!Number.isFinite(best)) return [];
    pool = pool.filter((c) => c[f] >= best - SCORE_EPS);
    if (pool.length === 1) return [pool[0].team];
    pool = preferUnawarded(pool, alreadyWon);
  }
  return pool.length === 1 ? [pool[0].team] : [];
}

function pickSingleDelta(candidates, extraFields = [], alreadyWon = new Set()) {
  if (!candidates.length) return [];
  let pool = preferUnawarded(candidates, alreadyWon);
  let best = -Infinity;
  for (const c of pool) {
    if (c.delta > best) best = c.delta;
  }
  pool = pool.filter((c) => c.delta >= best - SCORE_EPS);
  if (pool.length === 1) return [pool[0].team];
  pool = preferUnawarded(pool, alreadyWon);
  for (const f of extraFields) {
    best = -Infinity;
    for (const c of pool) {
      if (c[f] > best) best = c[f];
    }
    pool = pool.filter((c) => c[f] >= best - SCORE_EPS);
    if (pool.length === 1) return [pool[0].team];
    pool = preferUnawarded(pool, alreadyWon);
  }
  return pool.length === 1 ? [pool[0].team] : [];
}

function teamOfTheWeekWinners(current, alreadyWon) {
  return pickSingleTeam(current, TEAM_SCORE_TIE_BREAK, alreadyWon);
}

function mostImprovedWinners(current, prev, alreadyWon) {
  if (!prev) return [];
  const byTeam = new Map(prev.map((x) => [x.team, x]));
  const deltas = [];
  for (const t of current) {
    const p = byTeam.get(t.team);
    if (!p) continue;
    const d = t.totalScore - p.totalScore;
    if (d > SCORE_EPS) {
      deltas.push({ team: t.team, delta: d, totalScore: t.totalScore, completionRate: t.completionRate });
    }
  }
  return pickSingleDelta(deltas, ["totalScore", "completionRate"], alreadyWon);
}

function comebackWinners(current, prev, awards, alreadyWon) {
  if (!prev) return [];
  const byTeam = new Map(prev.map((x) => [x.team, x]));
  const eligible = [];
  for (const t of current) {
    const p = byTeam.get(t.team);
    if (!p) continue;
    if (p.totalScore >= awards.comebackPreviousScoreBelow - SCORE_EPS) continue;
    const d = t.totalScore - p.totalScore;
    if (d > awards.comebackMinPointGain + SCORE_EPS) {
      eligible.push({ team: t.team, delta: d, totalScore: t.totalScore, completionRate: t.completionRate });
    }
  }
  return pickSingleDelta(eligible, ["totalScore", "completionRate"], alreadyWon);
}

function noteWinner(alreadyWon, winners) {
  if (winners.length === 1) alreadyWon.add(winners[0]);
}

export function computeWeeklyAwards(current, previous) {
  const { awards } = METRICS;
  const prev = previous ?? null;
  const alreadyWon = new Set();

  const teamOfTheWeek = teamOfTheWeekWinners(current, alreadyWon);
  noteWinner(alreadyWon, teamOfTheWeek);

  const mostImproved = mostImprovedWinners(current, prev, alreadyWon);
  noteWinner(alreadyWon, mostImproved);

  const perfectAttendance = pickSingleTeam(
    current.filter((t) => t.participationRate >= 1 - SCORE_EPS),
    ATTENDANCE_TIE_BREAK,
    alreadyWon,
  );
  noteWinner(alreadyWon, perfectAttendance);

  const deepLearners = pickSingleTeam(
    current.filter((t) => t.avgQuiz > SCORE_EPS),
    QUIZ_TIE_BREAK,
    alreadyWon,
  );
  noteWinner(alreadyWon, deepLearners);

  const comebackTeam = comebackWinners(current, prev, awards, alreadyWon);

  return {
    teamOfTheWeek,
    mostImproved,
    perfectAttendance,
    deepLearners,
    comebackTeam,
  };
}
