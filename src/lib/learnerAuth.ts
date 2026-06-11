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
import { canonicalizeEmailForMatch, normalizeEmail } from "./teamAssignments";

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

function firebaseUserDisplayEmail(user: User): string | null {
  const direct = user.email?.trim();
  if (direct) return direct.toLowerCase();
  for (const provider of user.providerData) {
    const providerEmail = provider.email?.trim();
    if (providerEmail) return providerEmail.toLowerCase();
  }
  return null;
}

/** Email exactly as the student signed in (for display). Gmail dots and + aliases preserved. */
export function currentLearnerDisplayEmail(user: User | null): string | null {
  if (user) return firebaseUserDisplayEmail(user);
  return devLearnerEmail();
}

/** Canonical email for roster lookup (Gmail dot/plus normalization). */
export function currentLearnerMatchEmail(user: User | null): string | null {
  const display = currentLearnerDisplayEmail(user);
  return display ? canonicalizeEmailForMatch(display) : null;
}

/** @deprecated Use currentLearnerDisplayEmail or currentLearnerMatchEmail */
export function currentLearnerEmail(user: User | null): string | null {
  return currentLearnerMatchEmail(user);
}

export function subscribeLearnerAuth(
  onChange: (state: { displayEmail: string; matchEmail: string } | null) => void,
): () => void {
  if (isFirebaseConfigured()) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      const displayEmail = currentLearnerDisplayEmail(user);
      onChange(
        displayEmail
          ? { displayEmail, matchEmail: canonicalizeEmailForMatch(displayEmail) }
          : null,
      );
    });
  }
  const dev = devLearnerEmail();
  onChange(dev ? { displayEmail: dev, matchEmail: canonicalizeEmailForMatch(dev) } : null);
  const onStorage = (e: StorageEvent) => {
    if (e.key === DEV_SESSION_KEY || e.key === null) {
      const next = devLearnerEmail();
      onChange(next ? { displayEmail: next, matchEmail: canonicalizeEmailForMatch(next) } : null);
    }
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function normalizeLearnerEmail(email: string): string | null {
  const normalized = normalizeEmail(email);
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
  const display = email.trim().toLowerCase();
  if (!display.includes("@")) return "Enter a valid email address.";
  sessionStorage.setItem(DEV_SESSION_KEY, display);
  return null;
}
