import type { TeamMetricBreakdown, WeeklyAwards } from "../types";

const KEY = "tri-saturdays-league-published-v1";
const MAX_STORAGE_BYTES = 4_000_000;

export const PUBLISHED_STORAGE_KEY = KEY;

export type PublishedLeaderboard = {
  version: 1;
  weekLabel: string;
  focalActivity: string;
  metrics: TeamMetricBreakdown[];
  awards: WeeklyAwards;
  publishedAt: string;
};

function awardTeams(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((t): t is string => typeof t === "string");
  if (typeof value === "string") return [value];
  return [];
}

function normalizeAwards(raw: unknown): WeeklyAwards {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    teamOfTheWeek: awardTeams(o.teamOfTheWeek),
    mostImproved: awardTeams(o.mostImproved),
    perfectAttendance: awardTeams(o.perfectAttendance),
    deepLearners: awardTeams(o.deepLearners),
    comebackTeam: awardTeams(o.comebackTeam),
  };
}

function isPayload(x: unknown): x is PublishedLeaderboard {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    o.version === 1 &&
    typeof o.weekLabel === "string" &&
    typeof o.focalActivity === "string" &&
    Array.isArray(o.metrics) &&
    o.awards != null &&
    typeof o.awards === "object"
  );
}

export function loadPublished(): PublishedLeaderboard | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    if (raw.length > MAX_STORAGE_BYTES) {
      console.warn("Published leaderboard too large for this browser; clearing stored copy.");
      localStorage.removeItem(KEY);
      return null;
    }
    const p = JSON.parse(raw) as unknown;
    if (!isPayload(p)) return null;
    return { ...p, awards: normalizeAwards(p.awards) };
  } catch {
    return null;
  }
}

export const PUBLISH_EVENT = "tri-saturdays-league-published";

export function savePublished(data: Omit<PublishedLeaderboard, "version" | "publishedAt">): PublishedLeaderboard {
  const payload: PublishedLeaderboard = {
    version: 1,
    ...data,
    publishedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(PUBLISH_EVENT));
  return payload;
}

export function clearPublished() {
  localStorage.removeItem(KEY);
}
