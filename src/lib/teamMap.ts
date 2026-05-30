import type { StoredTeamMap } from "../types";
import { currentAdminUser } from "./adminAuth";
import { isFirebaseConfigured } from "./firebase";
import { saveTeamMapToFirestore, subscribeTeamMapFromFirestore } from "./firebaseTeamMap";

const KEY = "tri-saturdays-league-team-map-v1";
const MAX_STORAGE_BYTES = 2_000_000;

export const TEAM_MAP_CHANGE_EVENT = "tri-saturdays-league-team-map-changed";

export type { StoredTeamMap };

function readLocalCsv(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > MAX_STORAGE_BYTES) return "";
    const p = JSON.parse(raw) as StoredTeamMap;
    if (p?.version !== 1 || typeof p.csv !== "string") return "";
    return p.csv;
  } catch {
    return "";
  }
}

function mentorEmail(): string | undefined {
  return currentAdminUser()?.email ?? undefined;
}

function writeLocalCsv(csv: string) {
  const payload: StoredTeamMap = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy: mentorEmail(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(TEAM_MAP_CHANGE_EVENT));
}

export function usesFirebaseTeamMap(): boolean {
  return isFirebaseConfigured();
}

/** Save team assignments — Firestore when configured (shared across mentors), else localStorage. */
export async function saveTeamMap(csv: string): Promise<StoredTeamMap> {
  const updatedBy = mentorEmail();
  if (isFirebaseConfigured()) {
    const payload = await saveTeamMapToFirestore(csv, updatedBy);
    writeLocalCsv(csv);
    return payload;
  }
  writeLocalCsv(csv);
  return {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

/** Live team map for admin (Firestore or localStorage). */
export function subscribeTeamMap(
  onData: (data: StoredTeamMap | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeTeamMapFromFirestore(onData, onError);
  }

  const refresh = () => {
    const csv = readLocalCsv();
    onData(csv ? { version: 1, csv, updatedAt: "", updatedBy: undefined } : null);
  };
  refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(TEAM_MAP_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TEAM_MAP_CHANGE_EVENT, refresh);
  };
}
