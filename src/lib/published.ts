import type { TeamMetricBreakdown, WeeklyAwards } from "../types";

const KEY = "tri-saturdays-league-published-v1";

export const PUBLISHED_STORAGE_KEY = KEY;

export type PublishedLeaderboard = {
  version: 1;
  weekLabel: string;
  focalActivity: string;
  metrics: TeamMetricBreakdown[];
  awards: WeeklyAwards;
  publishedAt: string;
};

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
    const p = JSON.parse(raw) as unknown;
    return isPayload(p) ? p : null;
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
