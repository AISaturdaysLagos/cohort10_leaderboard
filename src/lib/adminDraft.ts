/** Browser-local cache of last-uploaded admin CSVs (not synced to Firebase). */
const KEY = "tri-saturdays-league-admin-draft-v1";
const MAX_BYTES = 8_000_000;

export type AdminDraft = {
  version: 1;
  activityCsv: string;
  rosterCsv: string;
  activityFileName: string;
  rosterFileName: string;
  weekMondayIso: string;
  parentOverride: string;
  focalOverride: string;
  savedAt: string;
};

const EMPTY: AdminDraft = {
  version: 1,
  activityCsv: "",
  rosterCsv: "",
  activityFileName: "",
  rosterFileName: "",
  weekMondayIso: "",
  parentOverride: "",
  focalOverride: "",
  savedAt: "",
};

function readDraft(): AdminDraft {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    if (raw.length > MAX_BYTES) {
      localStorage.removeItem(KEY);
      return { ...EMPTY };
    }
    const p = JSON.parse(raw) as Partial<AdminDraft>;
    if (p?.version !== 1) return { ...EMPTY };
    return {
      version: 1,
      activityCsv: typeof p.activityCsv === "string" ? p.activityCsv : "",
      rosterCsv: typeof p.rosterCsv === "string" ? p.rosterCsv : "",
      activityFileName: typeof p.activityFileName === "string" ? p.activityFileName : "",
      rosterFileName: typeof p.rosterFileName === "string" ? p.rosterFileName : "",
      weekMondayIso: typeof p.weekMondayIso === "string" ? p.weekMondayIso : "",
      parentOverride: typeof p.parentOverride === "string" ? p.parentOverride : "",
      focalOverride: typeof p.focalOverride === "string" ? p.focalOverride : "",
      savedAt: typeof p.savedAt === "string" ? p.savedAt : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export function loadAdminDraft(): AdminDraft {
  return readDraft();
}

export function saveAdminDraft(patch: Partial<Omit<AdminDraft, "version">>): void {
  const current = readDraft();
  const next: AdminDraft = {
    ...current,
    ...patch,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  const payload = JSON.stringify(next);
  if (payload.length > MAX_BYTES) {
    console.warn("Admin draft too large for localStorage; not saved.");
    return;
  }
  try {
    localStorage.setItem(KEY, payload);
  } catch {
    console.warn("Could not save admin draft to localStorage.");
  }
}
