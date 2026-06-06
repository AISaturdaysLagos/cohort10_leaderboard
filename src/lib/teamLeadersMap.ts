import type { StoredTeamLeaders } from "../types";
import { currentAdminUser } from "./adminAuth";
import { isFirebaseConfigured } from "./firebase";
import { saveTeamLeadersToFirestore, subscribeTeamLeadersFromFirestore } from "./firebaseTeamLeaders";

const KEY = "tri-saturdays-league-team-leaders-v1";
const MAX_STORAGE_BYTES = 2_000_000;

export const TEAM_LEADERS_CHANGE_EVENT = "tri-saturdays-league-team-leaders-changed";

export type { StoredTeamLeaders };

function readLocalCsv(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > MAX_STORAGE_BYTES) return "";
    const p = JSON.parse(raw) as StoredTeamLeaders;
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
  const payload: StoredTeamLeaders = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy: mentorEmail(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(TEAM_LEADERS_CHANGE_EVENT));
}

export function usesFirebaseTeamLeaders(): boolean {
  return isFirebaseConfigured();
}

export async function saveTeamLeaders(csv: string): Promise<StoredTeamLeaders> {
  const updatedBy = mentorEmail();
  if (isFirebaseConfigured()) {
    return saveTeamLeadersToFirestore(csv, updatedBy);
  }
  writeLocalCsv(csv);
  return {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
}

export function subscribeTeamLeaders(
  onData: (data: StoredTeamLeaders | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeTeamLeadersFromFirestore(onData, onError);
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
  window.addEventListener(TEAM_LEADERS_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TEAM_LEADERS_CHANGE_EVENT, refresh);
  };
}
