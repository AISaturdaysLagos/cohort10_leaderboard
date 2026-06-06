import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

const DEV_SESSION_KEY = "tri-saturdays-league-learner-email";

function firebaseAuthCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error ? String(error.code) : "";
}

export function isLearnerAuthConfigured(): boolean {
  return isFirebaseConfigured();
}

export function devLearnerEmail(): string | null {
  return sessionStorage.getItem(DEV_SESSION_KEY);
}

export function currentLearnerEmail(user: User | null): string | null {
  if (user?.email) return user.email.trim().toLowerCase();
  return devLearnerEmail();
}

export function subscribeLearnerAuth(onChange: (email: string | null) => void): () => void {
  if (isFirebaseConfigured()) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      onChange(currentLearnerEmail(user));
    });
  }
  onChange(devLearnerEmail());
  const onStorage = (e: StorageEvent) => {
    if (e.key === DEV_SESSION_KEY || e.key === null) onChange(devLearnerEmail());
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

export async function tryLearnerGoogleLogin(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return "Sign-in is not configured.";
  }
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await signInWithPopup(getFirebaseAuth(), provider);
    return null;
  } catch (error: unknown) {
    const code = firebaseAuthCode(error);
    if (code === "auth/popup-closed-by-user") return null;
    if (code === "auth/operation-not-allowed") {
      return "Google sign-in is not enabled. Ask your mentor to enable it in Firebase Console (Authentication → Sign-in method → Google).";
    }
    return "Google sign-in failed. Try again.";
  }
}

export async function learnerLogout(): Promise<void> {
  sessionStorage.removeItem(DEV_SESSION_KEY);
  if (isFirebaseConfigured()) {
    await signOut(getFirebaseAuth());
  }
}

export function devSignInWithEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) return "Enter a valid email address.";
  sessionStorage.setItem(DEV_SESSION_KEY, normalized);
  return null;
}
