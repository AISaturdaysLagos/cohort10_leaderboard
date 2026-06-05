import type { StoredTeamDescriptions } from "../types";
import { currentAdminUser } from "./adminAuth";
import { isFirebaseConfigured } from "./firebase";
import {
  saveTeamDescriptionsToFirestore,
  subscribeTeamDescriptionsFromFirestore,
} from "./firebaseTeamDescriptions";

const KEY = "tri-saturdays-league-team-descriptions-v1";
const MAX_STORAGE_BYTES = 2_000_000;

export const TEAM_DESCRIPTIONS_CHANGE_EVENT = "tri-saturdays-league-team-descriptions-changed";

export type { StoredTeamDescriptions };

function readLocalCsv(): string {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > MAX_STORAGE_BYTES) return "";
    const p = JSON.parse(raw) as StoredTeamDescriptions;
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
  const payload: StoredTeamDescriptions = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy: mentorEmail(),
  };
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(TEAM_DESCRIPTIONS_CHANGE_EVENT));
}

export function usesFirebaseTeamDescriptions(): boolean {
  return isFirebaseConfigured();
}

export async function saveTeamDescriptions(csv: string): Promise<StoredTeamDescriptions> {
  const updatedBy = mentorEmail();
  if (isFirebaseConfigured()) {
    const payload = await saveTeamDescriptionsToFirestore(csv, updatedBy);
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

export function subscribeTeamDescriptions(
  onData: (data: StoredTeamDescriptions | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeTeamDescriptionsFromFirestore(onData, onError);
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
  window.addEventListener(TEAM_DESCRIPTIONS_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TEAM_DESCRIPTIONS_CHANGE_EVENT, refresh);
  };
}
