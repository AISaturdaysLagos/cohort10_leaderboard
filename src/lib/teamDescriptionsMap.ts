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

function readLocalPayload(): StoredTeamDescriptions | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw || raw.length > MAX_STORAGE_BYTES) return null;
    const p = JSON.parse(raw) as StoredTeamDescriptions;
    if (p?.version !== 1 || typeof p.csv !== "string") return null;
    return p;
  } catch {
    return null;
  }
}

function readLocalCsv(): string {
  return readLocalPayload()?.csv ?? "";
}

function mentorEmail(): string | undefined {
  return currentAdminUser()?.email ?? undefined;
}

function writeLocalPayload(payload: StoredTeamDescriptions) {
  localStorage.setItem(KEY, JSON.stringify(payload));
  window.dispatchEvent(new Event(TEAM_DESCRIPTIONS_CHANGE_EVENT));
}

function writeLocalCsv(csv: string, meta?: Pick<StoredTeamDescriptions, "updatedAt" | "updatedBy">) {
  writeLocalPayload({
    version: 1,
    csv,
    updatedAt: meta?.updatedAt ?? new Date().toISOString(),
    updatedBy: meta?.updatedBy ?? mentorEmail(),
  });
}

/** Last team descriptions cached in this browser (may be stale until Firestore syncs). */
export function loadTeamDescriptionsLocal(): StoredTeamDescriptions | null {
  return readLocalPayload();
}

export function usesFirebaseTeamDescriptions(): boolean {
  return isFirebaseConfigured();
}

export async function saveTeamDescriptions(csv: string): Promise<StoredTeamDescriptions> {
  const updatedBy = mentorEmail();
  if (isFirebaseConfigured()) {
    const payload = await saveTeamDescriptionsToFirestore(csv, updatedBy);
    writeLocalPayload(payload);
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
    const cached = readLocalPayload();
    if (cached) onData(cached);

    return subscribeTeamDescriptionsFromFirestore(
      (data) => {
        if (data) {
          writeLocalPayload(data);
          onData(data);
          return;
        }
        const cached = readLocalPayload();
        if (!cached) onData(null);
      },
      (err) => {
        onError?.(err);
        onData(readLocalPayload());
      },
    );
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
