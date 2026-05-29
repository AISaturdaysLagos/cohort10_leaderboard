import type { HistoryEntry } from "../types";
import { currentAdminUser } from "./adminAuth";
import { isFirebaseConfigured } from "./firebase";
import {
  deleteHistoryEntryFromFirestore,
  saveHistoryEntryToFirestore,
  subscribeHistoryFromFirestore,
} from "./firebaseHistory";

const KEY = "tri-saturdays-league-history-v1";
const MAX_STORAGE_BYTES = 8_000_000;
const MAX_ENTRIES = 24;

export const HISTORY_CHANGE_EVENT = "tri-saturdays-league-history-changed";

export type { HistoryEntry } from "../types";

type Store = {
  version: 1;
  entries: HistoryEntry[];
};

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, entries: [] };
    if (raw.length > MAX_STORAGE_BYTES) {
      console.warn("Snapshot history too large for this browser; clearing stored history.");
      localStorage.removeItem(KEY);
      return { version: 1, entries: [] };
    }
    const p = JSON.parse(raw) as Store;
    if (p?.version !== 1 || !Array.isArray(p.entries)) return { version: 1, entries: [] };
    return p;
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeStore(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function notifyHistoryChange() {
  window.dispatchEvent(new Event(HISTORY_CHANGE_EVENT));
}

/** Local-only history (development fallback). */
export function loadHistoryLocal(): HistoryEntry[] {
  return readStore().entries;
}

/** @deprecated Use loadHistoryLocal or subscribeHistory */
export function loadHistory(): HistoryEntry[] {
  return loadHistoryLocal();
}

function saveHistoryEntryLocal(entry: HistoryEntry) {
  const s = readStore();
  const next = s.entries.filter((e) => e.id !== entry.id);
  next.unshift(entry);
  writeStore({ version: 1, entries: next.slice(0, MAX_ENTRIES) });
  notifyHistoryChange();
}

export function usesFirebaseHistory(): boolean {
  return isFirebaseConfigured();
}

/** Save a week snapshot — Firestore when configured (shared across mentors), else localStorage. */
export async function saveHistoryEntry(entry: HistoryEntry): Promise<void> {
  const withMeta: HistoryEntry = {
    ...entry,
    savedBy: currentAdminUser()?.email ?? entry.savedBy,
  };
  if (isFirebaseConfigured()) {
    await saveHistoryEntryToFirestore(withMeta);
    saveHistoryEntryLocal(withMeta);
    notifyHistoryChange();
    return;
  }
  saveHistoryEntryLocal(withMeta);
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  if (isFirebaseConfigured()) {
    await deleteHistoryEntryFromFirestore(id);
  }
  const s = readStore();
  writeStore({ version: 1, entries: s.entries.filter((e) => e.id !== id) });
  notifyHistoryChange();
}

export function clearHistoryLocal() {
  writeStore({ version: 1, entries: [] });
  notifyHistoryChange();
}

/** Live snapshot list for admin (Firestore or localStorage). */
export function subscribeHistory(
  onData: (entries: HistoryEntry[]) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeHistoryFromFirestore(onData, onError);
  }

  const refresh = () => onData(loadHistoryLocal());
  refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(HISTORY_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(HISTORY_CHANGE_EVENT, refresh);
  };
}
