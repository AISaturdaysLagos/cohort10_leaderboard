import { doc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import type { StoredAdminDraft } from "../types";
import { getFirebaseDb } from "./firebase";

const COLLECTION = "config";
const DOC_ID = "adminDraft";

function adminDraftRef() {
  return doc(getFirebaseDb(), COLLECTION, DOC_ID);
}

export function normalizeAdminDraft(raw: unknown): StoredAdminDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1 || typeof o.savedAt !== "string") return null;
  return {
    version: 1,
    activityCsv: typeof o.activityCsv === "string" ? o.activityCsv : "",
    rosterCsv: typeof o.rosterCsv === "string" ? o.rosterCsv : "",
    activityFileName: typeof o.activityFileName === "string" ? o.activityFileName : "",
    rosterFileName: typeof o.rosterFileName === "string" ? o.rosterFileName : "",
    weekMondayIso: typeof o.weekMondayIso === "string" ? o.weekMondayIso : "",
    parentOverride: typeof o.parentOverride === "string" ? o.parentOverride : "",
    focalOverride: typeof o.focalOverride === "string" ? o.focalOverride : "",
    savedAt: o.savedAt,
    updatedBy: typeof o.updatedBy === "string" ? o.updatedBy : undefined,
  };
}

export async function saveAdminDraftToFirestore(
  draft: Omit<StoredAdminDraft, "version" | "savedAt" | "updatedBy"> & {
    savedAt?: string;
    updatedBy?: string;
  },
): Promise<StoredAdminDraft> {
  const payload: StoredAdminDraft = {
    version: 1,
    activityCsv: draft.activityCsv,
    rosterCsv: draft.rosterCsv,
    activityFileName: draft.activityFileName,
    rosterFileName: draft.rosterFileName,
    weekMondayIso: draft.weekMondayIso,
    parentOverride: draft.parentOverride,
    focalOverride: draft.focalOverride,
    savedAt: draft.savedAt ?? new Date().toISOString(),
    updatedBy: draft.updatedBy,
  };
  await setDoc(adminDraftRef(), payload);
  return payload;
}

export function subscribeAdminDraftFromFirestore(
  onData: (data: StoredAdminDraft | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    adminDraftRef(),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(normalizeAdminDraft(snap.data()));
    },
    (err) => {
      onError?.(err);
      onData(null);
    },
  );
}
