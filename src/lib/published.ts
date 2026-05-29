import type { PublishedLeaderboard, TeamMetricBreakdown, WeeklyAwards } from "../types";
import { isFirebaseConfigured } from "./firebase";
import { savePublishedToFirestore, subscribePublishedFromFirestore } from "./firebasePublished";

const KEY = "tri-saturdays-league-published-v1";
const MAX_STORAGE_BYTES = 4_000_000;

export const PUBLISHED_STORAGE_KEY = KEY;

export type { PublishedLeaderboard };

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

function normalizePayload(raw: unknown): PublishedLeaderboard | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    o.version !== 1 ||
    typeof o.weekLabel !== "string" ||
    typeof o.focalActivity !== "string" ||
    !Array.isArray(o.metrics) ||
    o.awards == null ||
    typeof o.awards !== "object"
  ) {
    return null;
  }
  return {
    version: 1,
    weekLabel: o.weekLabel,
    focalActivity: o.focalActivity,
    metrics: o.metrics as TeamMetricBreakdown[],
    awards: normalizeAwards(o.awards),
    publishedAt: typeof o.publishedAt === "string" ? o.publishedAt : new Date().toISOString(),
  };
}

/** Read from browser localStorage (offline / legacy fallback). */
export function loadPublishedLocal(): PublishedLeaderboard | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    if (raw.length > MAX_STORAGE_BYTES) {
      console.warn("Published leaderboard too large for this browser; clearing stored copy.");
      localStorage.removeItem(KEY);
      return null;
    }
    return normalizePayload(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export const PUBLISH_EVENT = "tri-saturdays-league-published";

function savePublishedLocal(data: Omit<PublishedLeaderboard, "version" | "publishedAt">): PublishedLeaderboard {
  const payload: PublishedLeaderboard = {
    version: 1,
    ...data,
    publishedAt: new Date().toISOString(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(PUBLISH_EVENT));
  return payload;
}

/** @deprecated Use loadPublishedLocal or subscribePublished */
export function loadPublished(): PublishedLeaderboard | null {
  return loadPublishedLocal();
}

/** @deprecated Use savePublished */
export function savePublished(data: Omit<PublishedLeaderboard, "version" | "publishedAt">): PublishedLeaderboard {
  return savePublishedLocal(data);
}

/** Persist the student-facing board — Firestore when configured, else localStorage. */
export async function savePublishedBoard(
  data: Omit<PublishedLeaderboard, "version" | "publishedAt">,
): Promise<PublishedLeaderboard> {
  if (isFirebaseConfigured()) {
    const payload = await savePublishedToFirestore(data);
    savePublishedLocal(data);
    window.dispatchEvent(new Event(PUBLISH_EVENT));
    return payload;
  }
  return savePublishedLocal(data);
}

export function usesFirebasePublished(): boolean {
  return isFirebaseConfigured();
}

/** Live updates for the student page (Firestore snapshot or localStorage events). */
export function subscribePublished(
  onData: (data: PublishedLeaderboard | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribePublishedFromFirestore(
      (data) => onData(data ? { ...data, awards: normalizeAwards(data.awards) } : null),
      onError,
    );
  }

  const refresh = () => onData(loadPublishedLocal());
  refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PUBLISH_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PUBLISH_EVENT, refresh);
  };
}

export function clearPublished() {
  localStorage.removeItem(KEY);
}
