const SESSION_KEY = "tri-saturdays-league-admin-session-v1";

/** Set at build time via VITE_ADMIN_PASSWORD (see .env.example). */
const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD?.trim() ?? "";

function sessionToken(): string {
  if (!ADMIN_PASSWORD) return "";
  return `ok:${ADMIN_PASSWORD.length}:${hashCode(ADMIN_PASSWORD)}`;
}

/** Small deterministic hash — not cryptographic; pairs with sessionStorage for this static app. */
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export function isAdminPasswordConfigured(): boolean {
  return ADMIN_PASSWORD.length > 0;
}

export function isAdminAuthed(): boolean {
  if (!isAdminPasswordConfigured()) return false;
  return sessionStorage.getItem(SESSION_KEY) === sessionToken();
}

export function tryAdminLogin(password: string): boolean {
  if (!isAdminPasswordConfigured()) return false;
  if (password !== ADMIN_PASSWORD) return false;
  sessionStorage.setItem(SESSION_KEY, sessionToken());
  return true;
}

export function adminLogout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
