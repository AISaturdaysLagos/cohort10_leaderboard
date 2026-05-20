import type { TeamMetricBreakdown } from "../types";

const KEY = "tri-saturdays-league-history-v1";

export type HistoryEntry = {
  id: string;
  weekLabel: string;
  focalActivity: string;
  metrics: TeamMetricBreakdown[];
  savedAt: string;
};

type Store = {
  version: 1;
  entries: HistoryEntry[];
};

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { version: 1, entries: [] };
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

export function loadHistory(): HistoryEntry[] {
  return readStore().entries;
}

export function saveHistoryEntry(entry: HistoryEntry) {
  const s = readStore();
  const next = s.entries.filter((e) => e.id !== entry.id);
  next.unshift(entry);
  writeStore({ version: 1, entries: next.slice(0, 24) });
}

export function clearHistory() {
  writeStore({ version: 1, entries: [] });
}
