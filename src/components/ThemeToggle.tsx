import { useCallback, useEffect, useState } from "react";
import {
  initTheme,
  readCurrentTheme,
  subscribeSystemTheme,
  THEME_CHANGE_EVENT,
  toggleTheme,
  type Theme,
} from "../lib/theme";

export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() =>
    typeof document !== "undefined" ? readCurrentTheme() : "dark",
  );

  useEffect(() => {
    const sync = () => setThemeState(readCurrentTheme());
    sync();
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  const onToggle = useCallback(() => {
    setThemeState(toggleTheme());
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={onToggle}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

/** Applies saved or system theme; follows OS changes until the user toggles. */
export function ThemeInit() {
  useEffect(() => {
    initTheme();
    return subscribeSystemTheme(() => {});
  }, []);
  return null;
}
