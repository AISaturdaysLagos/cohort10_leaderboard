import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { StoredTeamLeaders } from "../types";
import { fetchFirestoreDocPreferServer } from "./firestoreFetch";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "config";
const DOC_ID = "teamLeaders";

function teamLeadersRef() {
  return doc(getFirebaseDb(), COLLECTION, DOC_ID);
}

function normalizeTeamLeaders(raw: unknown): StoredTeamLeaders | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.csv !== "string") return null;
  return {
    version: 1,
    csv: o.csv,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : "",
    updatedBy: typeof o.updatedBy === "string" ? o.updatedBy : undefined,
  };
}

export async function saveTeamLeadersToFirestore(
  csv: string,
  updatedBy?: string,
): Promise<StoredTeamLeaders> {
  const payload: StoredTeamLeaders = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(teamLeadersRef(), payload);
  return payload;
}

export async function fetchTeamLeadersFromServer(): Promise<StoredTeamLeaders | null> {
  return fetchFirestoreDocPreferServer(teamLeadersRef(), normalizeTeamLeaders);
}

export function subscribeTeamLeadersFromFirestore(
  onData: (data: StoredTeamLeaders | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    teamLeadersRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeTeamLeaders(snap.data()));
    },
    (err) => {
      onError?.(err);
      onData(null);
    },
  );
}
