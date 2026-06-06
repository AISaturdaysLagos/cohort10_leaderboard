import { getFirebaseAuth } from "./firebase";

function firestoreErrorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}

function isRetryableFirestoreError(error: unknown): boolean {
  const code = firestoreErrorCode(error);
  return code === "permission-denied" || code === "unauthenticated" || code === "failed-precondition";
}

/** Ensure the current user's ID token is attached before Firestore reads. Retries once after refresh. */
export async function fetchFirestoreWithAuthRetry<T>(fetch: () => Promise<T>): Promise<T> {
  const user = getFirebaseAuth().currentUser;
  if (user) await user.getIdToken();

  try {
    return await fetch();
  } catch (error) {
    if (!isRetryableFirestoreError(error)) throw error;
    const retryUser = getFirebaseAuth().currentUser;
    if (!retryUser) throw error;
    await retryUser.getIdToken(true);
    return fetch();
  }
}
