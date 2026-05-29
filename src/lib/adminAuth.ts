import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { FIREBASE_ADMIN_EMAIL, getFirebaseAuth, isFirebaseConfigured } from "./firebase";

const SESSION_KEY = "tri-saturdays-league-admin-session-v1";

/** Legacy static-site password when Firebase is not configured. */
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD?.trim() ?? "";

function sessionToken(): string {
  if (!ADMIN_PASSWORD) return "";
  return `ok:${ADMIN_PASSWORD.length}:${hashCode(ADMIN_PASSWORD)}`;
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Comma-separated email domains (e.g. tri-ai.org → any *@tri-ai.org Google account). */
export function allowedAdminDomains(): Set<string> {
  const fromEnv =
    import.meta.env.VITE_FIREBASE_ADMIN_EMAIL_DOMAINS?.split(",").map((d) => d.trim().toLowerCase()) ??
    [];
  return new Set(fromEnv.map((d) => d.replace(/^@/, "")).filter(Boolean));
}

/** Comma-separated mentor emails allowed to use /admin (Google or email sign-in). */
export function allowedAdminEmails(): Set<string> {
  const fromList =
    import.meta.env.VITE_FIREBASE_ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];
  const emails = [...fromList];
  if (FIREBASE_ADMIN_EMAIL) {
    emails.push(FIREBASE_ADMIN_EMAIL.toLowerCase());
  }
  return new Set(emails.filter(Boolean));
}

export function hasAdminAllowlist(): boolean {
  return allowedAdminEmails().size > 0 || allowedAdminDomains().size > 0;
}

/** @deprecated Use hasAdminAllowlist */
export function hasAdminEmailAllowlist(): boolean {
  return hasAdminAllowlist();
}

export function adminAllowlistHint(): string | null {
  const domains = [...allowedAdminDomains()];
  if (domains.length === 1) {
    return `@${domains[0]} Google accounts`;
  }
  if (domains.length > 1) {
    return `Google accounts on ${domains.map((d) => `@${d}`).join(", ")}`;
  }
  if (allowedAdminEmails().size > 0) {
    return "allowlisted mentor Google accounts";
  }
  return null;
}

export function isAllowedAdmin(user: User | null): boolean {
  if (!user) return false;
  const email = user.email?.trim().toLowerCase();
  if (!email) return false;

  const domains = allowedAdminDomains();
  const emails = allowedAdminEmails();
  if (domains.size === 0 && emails.size === 0) return true;

  if (emails.has(email)) return true;

  const domain = email.split("@")[1];
  return Boolean(domain && domains.has(domain));
}

export function isAdminPasswordConfigured(): boolean {
  return ADMIN_PASSWORD.length > 0;
}

export function isAdminConfigured(): boolean {
  return isFirebaseConfigured() || isAdminPasswordConfigured();
}

function isLegacyAuthed(): boolean {
  if (!isAdminPasswordConfigured()) return false;
  return sessionStorage.getItem(SESSION_KEY) === sessionToken();
}

export function isAdminAuthed(): boolean {
  if (isFirebaseConfigured()) {
    const user = getFirebaseAuth().currentUser;
    return Boolean(user && isAllowedAdmin(user));
  }
  return isLegacyAuthed();
}

async function rejectUnauthorizedUser(user: User | null): Promise<boolean> {
  if (!user || isAllowedAdmin(user)) return Boolean(user);
  await signOut(getFirebaseAuth());
  return false;
}

export function subscribeAdminAuth(onChange: (authed: boolean) => void): () => void {
  if (isFirebaseConfigured()) {
    return onAuthStateChanged(getFirebaseAuth(), (user) => {
      void rejectUnauthorizedUser(user).then(onChange);
    });
  }
  onChange(isLegacyAuthed());
  return () => {};
}

function adminAccessDeniedMessage(): string {
  const hint = adminAllowlistHint();
  return hint
    ? `Only ${hint} can access admin.`
    : "This Google account is not authorised for admin.";
}

export async function tryAdminGoogleLogin(): Promise<string | null> {
  if (!isFirebaseConfigured()) {
    return "Admin is not configured.";
  }
  try {
    const provider = new GoogleAuthProvider();
    const domains = [...allowedAdminDomains()];
    if (domains.length === 1) {
      provider.setCustomParameters({ hd: domains[0], prompt: "select_account" });
    } else {
      provider.setCustomParameters({ prompt: "select_account" });
    }
    const cred = await signInWithPopup(getFirebaseAuth(), provider);
    if (!isAllowedAdmin(cred.user)) {
      await signOut(getFirebaseAuth());
      return adminAccessDeniedMessage();
    }
    return null;
  } catch (e: unknown) {
    const code = e && typeof e === "object" && "code" in e ? String(e.code) : "";
    if (code === "auth/popup-closed-by-user") return null;
    return "Google sign-in failed. Try again.";
  }
}

export async function tryAdminLogin(email: string, password: string): Promise<string | null> {
  if (isFirebaseConfigured()) {
    const trimmedEmail = email.trim() || FIREBASE_ADMIN_EMAIL;
    if (!trimmedEmail) {
      return "Enter your mentor email.";
    }
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), trimmedEmail, password);
      if (!isAllowedAdmin(cred.user)) {
        await signOut(getFirebaseAuth());
        return "This account is not authorised for admin.";
      }
      return null;
    } catch {
      return "Incorrect email or password.";
    }
  }

  if (!isAdminPasswordConfigured()) {
    return "Admin is not configured.";
  }
  if (password !== ADMIN_PASSWORD) {
    return "Incorrect password.";
  }
  sessionStorage.setItem(SESSION_KEY, sessionToken());
  return null;
}

export async function adminLogout(): Promise<void> {
  if (isFirebaseConfigured()) {
    await signOut(getFirebaseAuth());
    return;
  }
  sessionStorage.removeItem(SESSION_KEY);
}

export function currentAdminUser(): User | null {
  if (!isFirebaseConfigured()) return null;
  const user = getFirebaseAuth().currentUser;
  return user && isAllowedAdmin(user) ? user : null;
}
