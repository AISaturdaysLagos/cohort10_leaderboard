# TRI AI Saturdays League — metrics reference

This document describes how weekly team scores are calculated. The **source of truth in code** is [`src/lib/metrics.js`](../src/lib/metrics.js) (weights, formulas, and `computeTeamMetrics`).

## Overview

Each **active team** earns up to **100 points** per published week. Scores are **team-level** and **normalized by active roster size**, so a team of 4 and a team of 10 are compared fairly.

| Metric        | Max points | Weight in total |
|---------------|------------|-----------------|
| Completion    | 40         | 40%             |
| Quiz          | 20         | 20%             |
| Participation | 15         | 15%             |
| Effort        | 15         | 15%             |
| Consistency   | 10         | 10%             |
| **Total**     | **100**    |                 |

**Inputs**

- **Activity CSV** — Skills Boost group activity export (`Member`, `Activity`, `Activity Type`, `Given Score`, dates, `Learning time (minutes)`, etc.).
- **Roster / program members CSV** — `Email`, `Status`, `Last active` (no team column in program exports).
- **Team map CSV** — `Email`, `Team` (optional; required for multi-team cohorts).
- **Week bounds (UTC)** — start/end dates set by mentor on the admin page.
- **Focal course** — one course activity name for the week (auto-inferred or overridden).

Only roster members with **`Status = Active`** count toward denominators. **Pending** and other statuses are ignored for scoring.

---

## 1. Completion (40 points)

**Question:** What share of active team members finished the focal course?

```
completionRate = completedCount / activeMembers
completionPoints = completionRate × 40
```

A member **completed** the focal course if they have at least one **Course** row where:

- `Activity` equals the focal course name, and
- `Passed` is true **or** `Date completed` is set.

Completion is **not** limited to the selected week — any historical completion of that course counts.

---

## 2. Quiz / understanding (20 points)

**Question:** How well did the team do on quizzes for the focal course?

For each active member:

1. Collect **Course** rows matching the focal `Activity`.
2. Prefer rows whose **Date started** or **Date completed** falls inside the week.
3. If none fall in the week, use **all** focal rows for that member.
4. Take the member’s **maximum** `Given Score` (0–1 scale) from that pool.
5. Average those per-member max scores **only among members who have at least one score** (members with no Given Score on the pool are excluded, not counted as zero).

```
avgQuiz = mean(perMemberMaxGivenScore)   // over members with scores
quizPoints = avgQuiz × 20
```

---

## 3. Participation (15 points)

**Question:** Did active members show up this week?

A member **participated** if **either**:

- Their roster **Last active** timestamp falls within the week, **or**
- They have a **Course** row for the focal activity with **Date started** in the week.

```
participationRate = participatedCount / activeMembers
participationPoints = participationRate × 15
```

---

## 4. Effort (15 points)

**Question:** How much learning time did the team put in on the focal course?

Uses the **same row pool as quiz** (in-week focal rows, or all focal rows if none in week).

For each active member, sum `Learning time (minutes)` on that pool. Then:

```
avgLearningMinutes = totalMinutes / activeMembers
effortRatio = min(avgLearningMinutes / 120, 1)
effortPoints = effortRatio × 15
```

**120 minutes** per member per week is the target for full effort points. Path-level learning time does **not** count — only **Course** rows for the focal activity.

---

## 5. Consistency (10 points)

**Question:** Did everyone on the team participate?

```
inactiveCount = activeMembers − participatedCount
consistencyRate = 1 − (inactiveCount / activeMembers)
consistencyPoints = consistencyRate × 10
```

Equivalent to participation rate when “inactive” means the same as “did not participate” above. It rewards teams where **no one** is left behind.

---

## Total score

```
totalScore = completionPoints + quizPoints + participationPoints + effortPoints + consistencyPoints
```

Teams are ranked by `totalScore` descending.

---

## Weekly awards (not part of the 100-point total)

Each category has **at most one winner**. When teams tie on the primary metric, tie-breakers run in order until a single team remains. **Whenever teams are still tied, teams that have not yet won another award this week are preferred.** If teams are still tied after all tie-breakers, **no award is given** (shown as —).

Awards are resolved in this order (earlier winners count toward the preference rule for later categories): Team of the week → Most improved → Perfect attendance → Deep learners → Comeback team.

| Award               | Primary rule | Tie-break order |
|---------------------|--------------|-----------------|
| **Team of the week** | Highest `totalScore` | `completionRate` → `quizPoints` → `participationRate` → `effortPoints` → `consistencyPoints` → `avgQuiz` |
| **Deep learners**    | Highest `avgQuiz` (must be &gt; 0) | `totalScore` → `completionRate` → `quizPoints` → `effortPoints` |
| **Perfect attendance** | `participationRate = 100%` | `totalScore` → `completionRate` → `quizPoints` → `effortPoints` → `consistencyPoints` |
| **Most improved**    | Largest gain in `totalScore` vs previous week (must be &gt; 0) | Current `totalScore` → `completionRate`. Requires comparison week in admin history. |
| **Comeback team**    | Previous week `totalScore` &lt; 50 **and** gain &gt; 5 points | Largest gain among eligible → current `totalScore` → `completionRate` |

Thresholds live in `METRICS.awards` in [`metrics.js`](../src/lib/metrics.js).

---

## Focal course selection (admin)

Handled in [`src/lib/scoring.ts`](../src/lib/scoring.ts), not in the point weights:

1. **Parent path** — learning path with the most in-week **Course** activity (or global fallback).
2. **Focal course** — course with the most distinct members who **started** it in the week; if none, the most frequent course under that path.

Mentors can override both on the admin page.

---

## Changing weights

Edit `METRICS` in [`src/lib/metrics.js`](../src/lib/metrics.js), then update this file if behavior descriptions change. Admin and student UIs read max points from `METRICS` / `METRIC_DEFINITIONS` so labels stay aligned.
