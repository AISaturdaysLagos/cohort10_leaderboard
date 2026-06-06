import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { StoredTeamMap } from "../types";
import { fetchFirestoreDocPreferServer } from "./firestoreFetch";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "config";
const DOC_ID = "teamMap";

function teamMapRef() {
  return doc(getFirebaseDb(), COLLECTION, DOC_ID);
}

function normalizeTeamMap(raw: unknown): StoredTeamMap | null {
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

export async function saveTeamMapToFirestore(csv: string, updatedBy?: string): Promise<StoredTeamMap> {
  const payload: StoredTeamMap = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(teamMapRef(), payload);
  return payload;
}

/** Prefer server; retry offline races; fall back to standard getDoc. */
export async function fetchTeamMapFromServer(): Promise<StoredTeamMap | null> {
  return fetchFirestoreDocPreferServer(teamMapRef(), normalizeTeamMap);
}

export function subscribeTeamMapFromFirestore(
  onData: (data: StoredTeamMap | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    teamMapRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeTeamMap(snap.data()));
    },
    (err) => {
      onError?.(err);
      onData(null);
    },
  );
}
