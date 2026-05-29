import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { HistoryEntry } from "../types";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "snapshots";
const MAX_SNAPSHOTS = 24;

function snapshotsCol() {
  return collection(getFirebaseDb(), COLLECTION);
}

function snapshotRef(id: string) {
  return doc(getFirebaseDb(), COLLECTION, id);
}

function isHistoryEntry(raw: unknown): raw is HistoryEntry {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.weekLabel === "string" &&
    typeof o.focalActivity === "string" &&
    Array.isArray(o.metrics) &&
    typeof o.savedAt === "string"
  );
}

export async function saveHistoryEntryToFirestore(entry: HistoryEntry): Promise<void> {
  await setDoc(snapshotRef(entry.id), entry);
  await trimFirestoreSnapshots(MAX_SNAPSHOTS);
}

export async function deleteHistoryEntryFromFirestore(id: string): Promise<void> {
  await deleteDoc(snapshotRef(id));
}

async function trimFirestoreSnapshots(max: number): Promise<void> {
  const q = query(snapshotsCol(), orderBy("savedAt", "desc"));
  const snap = await getDocs(q);
  const excess = snap.docs.slice(max);
  await Promise.all(excess.map((d) => deleteDoc(d.ref)));
}

export function subscribeHistoryFromFirestore(
  onData: (entries: HistoryEntry[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(snapshotsCol(), orderBy("savedAt", "desc"), limit(MAX_SNAPSHOTS));
  return onSnapshot(
    q,
    (snap) => {
      const entries: HistoryEntry[] = [];
      for (const d of snap.docs) {
        const raw = d.data();
        if (isHistoryEntry(raw)) entries.push(raw);
      }
      onData(entries);
    },
    (err) => {
      onError?.(err);
      onData([]);
    },
  );
}
