import {
  isSignInWithEmailLink,
  onAuthStateChanged,
  sendSignInLinkToEmail,
  signInWithEmailLink,
  signOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase";

const EMAIL_FOR_SIGN_IN_KEY = "tri-saturdays-league-email-for-sign-in";
const DEV_SESSION_KEY = "tri-saturdays-league-learner-email";

function teamPortalPath(): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return `${window.location.origin}${base}/my-team`;
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

export async function sendLearnerSignInLink(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@") || !normalized.includes(".")) {
    return "Enter a valid email address.";
  }
  if (!isFirebaseConfigured()) {
    sessionStorage.setItem(DEV_SESSION_KEY, normalized);
    return null;
  }
  try {
    await sendSignInLinkToEmail(getFirebaseAuth(), normalized, {
      url: teamPortalPath(),
      handleCodeInApp: true,
    });
    window.localStorage.setItem(EMAIL_FOR_SIGN_IN_KEY, normalized);
    return null;
  } catch {
    return "Could not send sign-in link. Check the email address and try again.";
  }
}

export async function completeLearnerEmailLinkSignIn(): Promise<string | null> {
  if (!isFirebaseConfigured()) return null;
  const auth = getFirebaseAuth();
  if (!isSignInWithEmailLink(auth, window.location.href)) return null;

  let email = window.localStorage.getItem(EMAIL_FOR_SIGN_IN_KEY);
  if (!email) {
    return "Open the sign-in link on the same browser where you requested it, or enter your email again.";
  }

  try {
    await signInWithEmailLink(auth, email, window.location.href);
    window.localStorage.removeItem(EMAIL_FOR_SIGN_IN_KEY);
    const path = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/my-team`.replace(/^\//, "/");
    window.history.replaceState({}, document.title, path);
    return null;
  } catch {
    return "This sign-in link is invalid or has expired. Request a new link.";
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
