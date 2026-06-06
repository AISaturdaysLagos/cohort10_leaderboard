import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
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

function normalizeLearnerEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@") || !normalized.includes(".")) {
    return null;
  }
  return normalized;
}

function learnerEmailPasswordError(error: unknown, signUp: boolean): string {
  switch (firebaseAuthCode(error)) {
    case "auth/operation-not-allowed":
      return "Email and password sign-in is not enabled. Ask your mentor to enable Email/Password in Firebase Console.";
    case "auth/invalid-email":
      return "Enter a valid email address.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/email-already-in-use":
      return "An account already exists for this email. Sign in instead.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return signUp ? "Could not create account. Try again." : "Incorrect email or password.";
    default:
      return signUp ? "Could not create account. Try again." : "Sign-in failed. Try again.";
  }
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

export async function tryLearnerEmailPasswordSignIn(email: string, password: string): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return "Sign-in is not configured.";
  }
  const normalized = normalizeLearnerEmail(email);
  if (!normalized) return "Enter a valid email address.";
  if (!password) return "Enter your password.";

  try {
    await signInWithEmailAndPassword(getFirebaseAuth(), normalized, password);
    return null;
  } catch (error: unknown) {
    return learnerEmailPasswordError(error, false);
  }
}

export async function tryLearnerEmailPasswordSignUp(email: string, password: string): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return "Sign-in is not configured.";
  }
  const normalized = normalizeLearnerEmail(email);
  if (!normalized) return "Enter a valid email address.";
  if (password.length < 6) return "Password must be at least 6 characters.";

  try {
    await createUserWithEmailAndPassword(getFirebaseAuth(), normalized, password);
    return null;
  } catch (error: unknown) {
    return learnerEmailPasswordError(error, true);
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
