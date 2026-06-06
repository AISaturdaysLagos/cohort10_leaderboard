import { doc, getDocFromServer, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { StoredTeamDescriptions } from "../types";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "config";
const DOC_ID = "teamDescriptions";

function teamDescriptionsRef() {
  return doc(getFirebaseDb(), COLLECTION, DOC_ID);
}

function normalizeTeamDescriptions(raw: unknown): StoredTeamDescriptions | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.csv !== "string" || typeof o.updatedAt !== "string") return null;
  return {
    version: 1,
    csv: o.csv,
    updatedAt: o.updatedAt,
    updatedBy: typeof o.updatedBy === "string" ? o.updatedBy : undefined,
  };
}

export async function saveTeamDescriptionsToFirestore(
  csv: string,
  updatedBy?: string,
): Promise<StoredTeamDescriptions> {
  const payload: StoredTeamDescriptions = {
    version: 1,
    csv,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };
  await setDoc(teamDescriptionsRef(), payload);
  return payload;
}

export async function fetchTeamDescriptionsFromServer(): Promise<StoredTeamDescriptions | null> {
  const snap = await getDocFromServer(teamDescriptionsRef());
  if (!snap.exists()) return null;
  return normalizeTeamDescriptions(snap.data());
}

export function subscribeTeamDescriptionsFromFirestore(
  onData: (data: StoredTeamDescriptions | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    teamDescriptionsRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeTeamDescriptions(snap.data()));
    },
    (err) => {
      onError?.(err);
    },
  );
}
