import type { StoredAdminDraft } from "../types";
import { currentAdminUser } from "./adminAuth";
import { isFirebaseConfigured } from "./firebase";
import { saveAdminDraftToFirestore, subscribeAdminDraftFromFirestore } from "./firebaseAdminDraft";

const KEY = "tri-saturdays-league-admin-draft-v1";
const MAX_BYTES = 8_000_000;
const FIRESTORE_DEBOUNCE_MS = 600;

export const ADMIN_DRAFT_CHANGE_EVENT = "tri-saturdays-league-admin-draft-changed";

export type AdminDraft = Omit<StoredAdminDraft, "updatedBy">;

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

let firestoreTimer: ReturnType<typeof setTimeout> | null = null;
let pendingFirestore: AdminDraft | null = null;

function mentorEmail(): string | undefined {
  return currentAdminUser()?.email ?? undefined;
}

function readLocal(): AdminDraft {
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

function writeLocal(draft: AdminDraft) {
  const payload = JSON.stringify(draft);
  if (payload.length > MAX_BYTES) {
    console.warn("Admin draft too large for localStorage; not saved locally.");
    return;
  }
  try {
    localStorage.setItem(KEY, payload);
    window.dispatchEvent(new Event(ADMIN_DRAFT_CHANGE_EVENT));
  } catch {
    console.warn("Could not save admin draft to localStorage.");
  }
}

function toStored(draft: AdminDraft, updatedBy?: string): StoredAdminDraft {
  return { ...draft, updatedBy };
}

function isCsvPatch(patch: Partial<Omit<AdminDraft, "version">>): boolean {
  return "activityCsv" in patch || "rosterCsv" in patch;
}

async function flushFirestore(draft: AdminDraft) {
  if (!isFirebaseConfigured()) return;
  try {
    await saveAdminDraftToFirestore({
      ...draft,
      updatedBy: mentorEmail(),
    });
  } catch (err) {
    console.warn("Could not save admin draft to Firestore:", err);
  }
}

function scheduleFirestore(draft: AdminDraft, immediate: boolean) {
  if (!isFirebaseConfigured()) return;
  pendingFirestore = draft;
  if (immediate) {
    if (firestoreTimer) clearTimeout(firestoreTimer);
    firestoreTimer = null;
    void flushFirestore(draft);
    pendingFirestore = null;
    return;
  }
  if (firestoreTimer) clearTimeout(firestoreTimer);
  firestoreTimer = setTimeout(() => {
    firestoreTimer = null;
    const next = pendingFirestore;
    pendingFirestore = null;
    if (next) void flushFirestore(next);
  }, FIRESTORE_DEBOUNCE_MS);
}

export function usesFirebaseAdminDraft(): boolean {
  return isFirebaseConfigured();
}

/** Synchronous read from local cache (instant UI on reload). */
export function loadAdminDraft(): AdminDraft {
  return readLocal();
}

export function isRemoteDraftNewer(remote: StoredAdminDraft, local: AdminDraft): boolean {
  if (!remote.savedAt) return true;
  if (!local.savedAt) return true;
  return remote.savedAt > local.savedAt;
}

/** Persist uploads + week scope — Firestore when configured (shared across mentors), else localStorage only. */
export function saveAdminDraft(
  patch: Partial<Omit<AdminDraft, "version">>,
  options?: { immediate?: boolean },
): void {
  const current = readLocal();
  const next: AdminDraft = {
    ...current,
    ...patch,
    version: 1,
    savedAt: new Date().toISOString(),
  };
  writeLocal(next);
  scheduleFirestore(next, options?.immediate ?? isCsvPatch(patch));
}

/** Live admin draft (Firestore or localStorage). */
export function subscribeAdminDraft(
  onData: (data: StoredAdminDraft | null) => void,
  onError?: (error: Error) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return subscribeAdminDraftFromFirestore(
      (remote) => {
        if (remote) writeLocal(remote);
        onData(remote);
      },
      onError,
    );
  }

  const refresh = () => {
    const local = readLocal();
    onData(local.savedAt || local.activityCsv || local.rosterCsv ? toStored(local) : null);
  };
  refresh();
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) refresh();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(ADMIN_DRAFT_CHANGE_EVENT, refresh);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ADMIN_DRAFT_CHANGE_EVENT, refresh);
  };
}
