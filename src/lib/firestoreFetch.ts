import {
  enableNetwork,
  getDoc,
  getDocFromServer,
  type DocumentReference,
  type DocumentData,
} from "firebase/firestore";
import { getFirebaseAuth, getFirebaseDb } from "./firebase";

function firestoreErrorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isOfflineFirestoreError(error: unknown): boolean {
  const code = firestoreErrorCode(error);
  if (code === "unavailable") return true;
  const message = errorMessage(error).toLowerCase();
  return message.includes("offline") || message.includes("failed to get document");
}

function isRetryableAuthError(error: unknown): boolean {
  const code = firestoreErrorCode(error);
  return code === "permission-denied" || code === "unauthenticated";
}

async function ensureAuthToken(forceRefresh = false): Promise<void> {
  const user = getFirebaseAuth().currentUser;
  if (user) await user.getIdToken(forceRefresh);
}

async function ensureFirestoreOnline(): Promise<void> {
  try {
    await enableNetwork(getFirebaseDb());
  } catch {
    // Firestore may already be online.
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readDoc<T>(
  docRef: DocumentReference<DocumentData, DocumentData>,
  normalize: (raw: unknown) => T | null,
  fromServer: boolean,
): Promise<T | null> {
  const snap = fromServer ? await getDocFromServer(docRef) : await getDoc(docRef);
  if (!snap.exists()) return null;
  return normalize(snap.data());
}

/**
 * Load a Firestore config doc for /my-team.
 * Prefers the server when online; retries brief "client is offline" races; falls back to getDoc.
 */
export async function fetchFirestoreDocPreferServer<T>(
  docRef: DocumentReference<DocumentData, DocumentData>,
  normalize: (raw: unknown) => T | null,
): Promise<T | null> {
  await ensureAuthToken();
  await ensureFirestoreOnline();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await readDoc(docRef, normalize, true);
    } catch (error) {
      if (isRetryableAuthError(error)) {
        await ensureAuthToken(true);
        continue;
      }
      if (isOfflineFirestoreError(error) && attempt < 2) {
        await ensureFirestoreOnline();
        await sleep(350 * (attempt + 1));
        continue;
      }
      if (isOfflineFirestoreError(error)) {
        return readDoc(docRef, normalize, false);
      }
      throw error;
    }
  }

  return readDoc(docRef, normalize, false);
}

/** @deprecated Use fetchFirestoreDocPreferServer */
export async function fetchFirestoreWithAuthRetry<T>(fetch: () => Promise<T>): Promise<T> {
  await ensureAuthToken();
  try {
    return await fetch();
  } catch (error) {
    if (!isRetryableAuthError(error)) throw error;
    await ensureAuthToken(true);
    return fetch();
  }
}
