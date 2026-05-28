import defaultTeamMapCsv from "../../team.csv?raw";
import { parseTeamLookupCsv } from "./parseCsv";

/** Canonical team assignments shipped with the app (repo root `team.csv`). */
export const INTERNAL_TEAM_MAP_CSV = defaultTeamMapCsv;

let cached: Map<string, string> | null = null;

export function internalTeamLookup(): Map<string, string> {
  if (!cached) {
    try {
      cached = parseTeamLookupCsv(INTERNAL_TEAM_MAP_CSV);
    } catch {
      cached = new Map();
    }
  }
  return cached;
}
