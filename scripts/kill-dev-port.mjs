#!/usr/bin/env node
/** Free port 5173 (and 5174) so Vite dev is not blocked by a stuck process. */
import { execSync } from "node:child_process";

for (const port of [5173, 5174]) {
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    if (!out) continue;
    for (const pid of out.split("\n")) {
      if (pid) {
        console.log(`Stopping process ${pid} on port ${port}`);
        process.kill(Number(pid), "SIGKILL");
      }
    }
  } catch {
    // nothing listening
  }
}
