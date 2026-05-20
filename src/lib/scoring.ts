import type { ActivityRow, WeekBounds } from "../types";
import { isInRange } from "./dates";

function normType(t: string): string {
  return t.trim().toLowerCase();
}

export function inferDominantParent(rows: ActivityRow[], week: WeekBounds): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (normType(r.activityType) !== "course") continue;
    if (!r.parentName) continue;
    const inW =
      (r.dateStarted && isInRange(r.dateStarted, week)) ||
      (r.dateCompleted && isInRange(r.dateCompleted, week));
    if (!inW) continue;
    counts.set(r.parentName, (counts.get(r.parentName) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts) {
    if (v > n) {
      best = k;
      n = v;
    }
  }
  return best;
}

export function inferDominantParentGlobal(rows: ActivityRow[]): string | null {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (normType(r.activityType) !== "course") continue;
    if (!r.parentName) continue;
    counts.set(r.parentName, (counts.get(r.parentName) ?? 0) + 1);
  }
  let best: string | null = null;
  let n = 0;
  for (const [k, v] of counts) {
    if (v > n) {
      best = k;
      n = v;
    }
  }
  return best;
}

export function listCourseActivities(rows: ActivityRow[], parentName: string | null): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (normType(r.activityType) !== "course") continue;
    if (parentName && r.parentName !== parentName) continue;
    const act = r.activity.trim();
    if (act) set.add(act);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function inferFocalCourse(
  rows: ActivityRow[],
  week: WeekBounds,
  parentName: string | null,
): string | null {
  const starters = new Map<string, Set<string>>();
  for (const r of rows) {
    if (normType(r.activityType) !== "course") continue;
    if (parentName && r.parentName !== parentName) continue;
    if (!r.dateStarted || !isInRange(r.dateStarted, week)) continue;
    const act = r.activity.trim();
    if (!act) continue;
    if (!starters.has(act)) starters.set(act, new Set());
    starters.get(act)!.add(r.member);
  }
  let best: string | null = null;
  let n = 0;
  for (const [act, set] of starters) {
    if (set.size > n) {
      best = act;
      n = set.size;
    }
  }
  if (best) return best;
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (normType(r.activityType) !== "course") continue;
    if (parentName && r.parentName !== parentName) continue;
    const act = r.activity.trim();
    if (!act) continue;
    counts.set(act, (counts.get(act) ?? 0) + 1);
  }
  for (const [act, c] of counts) {
    if (c > n) {
      best = act;
      n = c;
    }
  }
  return best;
}

export function snapshotId(week: WeekBounds, focalActivity: string): string {
  return `${week.start.toISOString().slice(0, 10)}_${week.end.toISOString().slice(0, 10)}_${focalActivity}`;
}
