const STORAGE_KEY = "tri-saturdays-league-theme";
export const THEME_CHANGE_EVENT = "tri-theme-change";

export type Theme = "light" | "dark";

export function getSystemTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/** Saved choice, else OS light/dark preference. */
export function getPreferredTheme(): Theme {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
}

export function setTheme(theme: Theme): void {
  applyTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}

export function toggleTheme(): Theme {
  const next: Theme = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
  setTheme(next);
  return next;
}

export function initTheme(): Theme {
  const theme = getPreferredTheme();
  applyTheme(theme);
  return theme;
}

/** When the user has not picked a theme, follow OS changes. */
export function subscribeSystemTheme(onChange: (theme: Theme) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-color-scheme: light)");
  const handler = () => {
    if (getStoredTheme()) return;
    const theme = mq.matches ? "light" : "dark";
    applyTheme(theme);
    onChange(theme);
  };
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

export function readCurrentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}
