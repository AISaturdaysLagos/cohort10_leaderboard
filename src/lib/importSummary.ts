import type { ActivityRow, RosterRow } from "../types";

export function activityImportSummary(rows: ActivityRow[], excluded = 0): string {
  if (!rows.length && excluded === 0) return "";
  const members = new Set(rows.map((r) => r.member));
  let minT = Infinity;
  let maxT = -Infinity;
  for (const r of rows) {
    for (const d of [r.dateStarted, r.dateCompleted]) {
      if (!d) continue;
      const t = d.getTime();
      if (Number.isFinite(t)) {
        if (t < minT) minT = t;
        if (t > maxT) maxT = t;
      }
    }
  }
  const span =
    Number.isFinite(minT) && Number.isFinite(maxT)
      ? `${new Date(minT).toISOString().slice(0, 10)} → ${new Date(maxT).toISOString().slice(0, 10)}`
      : "—";
  let line = `${rows.length.toLocaleString("en-GB")} activity rows · ${members.size} mapped members · activity dates ${span} (UTC)`;
  if (excluded > 0) line += ` · ${excluded.toLocaleString("en-GB")} rows excluded (not in team map)`;
  return line;
}

export function rosterImportSummary(roster: RosterRow[], excluded = 0): string {
  if (!roster.length && excluded === 0) return "";
  const teams = new Set(roster.map((r) => r.team));
  const active = roster.filter((r) => r.status === "active").length;
  const pending = roster.filter((r) => r.status === "pending").length;
  let line = `${roster.length} roster rows in team map · ${teams.size} teams · ${active} active · ${pending} pending`;
  if (excluded > 0) line += ` · ${excluded} roster rows excluded (not in team map)`;
  return line;
}

export function teamLookupSummary(lookup: Map<string, string>): string {
  if (!lookup.size) return "";
  const names = new Set(lookup.values());
  return `${lookup.size} team assignments · ${names.size} unique team names`;
}
