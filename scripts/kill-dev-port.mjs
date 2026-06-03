#!/usr/bin/env node
/** Free port 5173 (and 5174) so Vite dev is not blocked by a stuck process. */
import { execSync } from "node:child_process";

for (const port of [5173, 5174]) {
  let pids = [];
  try {
    const out = execSync(`lsof -ti :${port}`, { encoding: "utf8" }).trim();
    if (out) pids = out.split("\n").filter(Boolean);
  } catch {
    // nothing listening
  }

  for (const pid of pids) {
    const n = Number(pid);
    if (!Number.isFinite(n) || n <= 0) continue;
    try {
      console.log(`Stopping process ${n} on port ${port}`);
      process.kill(n, "SIGTERM");
    } catch (err) {
      if (err?.code === "ESRCH") continue;
      try {
        process.kill(n, "SIGKILL");
      } catch {
        console.warn(`Could not stop process ${n} on port ${port} (${err?.code ?? "error"})`);
      }
    }
  }
}
