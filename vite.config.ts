import { copyFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Must match the GitHub repo name when using project Pages (not user/org root site). */
const GITHUB_PAGES_BASE = "/cohort10_leaderboard/";

export default defineConfig(({ command }) => {
  const base =
    process.env.VITE_BASE_PATH ??
    (command === "build" && process.env.GITHUB_ACTIONS === "true" ? GITHUB_PAGES_BASE : "/");

  return {
    base,
    server: {
      port: 5173,
      strictPort: false,
    },
    plugins: [
      react(),
      {
        name: "gh-pages-spa-fallback",
        closeBundle() {
          if (command !== "build") return;
          const index = resolve(__dirname, "dist/index.html");
          if (existsSync(index)) {
            copyFileSync(index, resolve(__dirname, "dist/404.html"));
          }
        },
      },
    ],
  };
});
