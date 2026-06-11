import Papa from "papaparse";
import type { ActivityRow, RosterRow } from "../types";
import { parseTeamAssignmentsCsv, teamAssignmentsToLookup, canonicalizeEmailForMatch } from "./teamAssignments";
import { parseUtcDate } from "./dates";

function norm(s: string): string {
  return s.trim().toLowerCase();
}

function parseBool(v: string | undefined): boolean {
  return norm(v ?? "") === "true";
}

function parseNumberLoose(v: string | undefined): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

type RawActivity = Record<string, string>;

function pick(row: RawActivity, key: string): string {
  const direct = row[key];
  if (direct !== undefined) return String(direct);
  const lower = Object.keys(row).find((k) => norm(k) === norm(key));
  return lower ? String(row[lower] ?? "") : "";
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function pickFirst(row: RawActivity, keys: string[]): string {
  for (const key of keys) {
    const v = pick(row, key);
    if (v.trim() !== "") return v;
  }
  return "";
}

export function parseActivityCsv(text: string): ActivityRow[] {
  const clean = stripBom(text);
  const parsed = Papa.parse<RawActivity>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`CSV parse error: ${msg}`);
  }
  const rows: ActivityRow[] = [];
  for (const r of parsed.data) {
    const member = pick(r, "Member");
    if (!member) continue;
    const activityType = pick(r, "Activity Type");
    rows.push({
      member: norm(member),
      activity: pick(r, "Activity").trim(),
      activityType: activityType.trim(),
      passed: parseBool(pick(r, "Passed")),
      givenScore: parseNumberLoose(pick(r, "Given Score")),
      maximumScore: parseNumberLoose(pick(r, "Maximum Score")),
      dateStarted: parseUtcDate(pick(r, "Date started")),
      dateCompleted: parseUtcDate(pick(r, "Date completed")),
      learningMinutes:
        parseNumberLoose(
          pickFirst(r, [
            "Learning time (minutes)",
            "Learning Time (minutes)",
            "Time spent learning (minutes)",
            "Time Spent Learning (minutes)",
            "Learning time",
            "Learning Time",
          ]),
        ) ?? 0,
      parentName: (() => {
        const p = pick(r, "Parent Name").trim();
        return p ? p : null;
      })(),
    });
  }
  return rows;
}

/** Google “program group members” exports often omit Team — team comes from the shared team map. */
export function parseRosterCsv(text: string): RosterRow[] {
  const clean = stripBom(text);
  const parsed = Papa.parse<RawActivity>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`Roster CSV parse error: ${msg}`);
  }
  const out: RosterRow[] = [];
  for (const r of parsed.data) {
    const email = norm(
      pickFirst(r, ["Email", "Email address", "User email", "Primary email", "Member email"]),
    );
    if (!email) continue;

    let team = pickFirst(r, [
      "Team",
      "Group",
      "Group name",
      "Subgroup",
      "Team name",
      "Learning group",
    ]).trim();

    const statusRaw = norm(pickFirst(r, ["Status", "Member status", "State", "Membership"]));
    const status: RosterRow["status"] =
      statusRaw === "active" ? "active" : statusRaw === "pending" ? "pending" : "other";
    const last = pickFirst(r, [
      "Last active",
      "Last Active",
      "Last active (UTC)",
      "Last Active (UTC)",
      "Last activity",
      "Last Activity",
      "Last active time",
      "Last login",
      "Last seen",
    ]);
    out.push({
      email,
      team,
      status,
      lastActive: parseUtcDate(last),
    });
  }
  return out;
}

/** Minimal CSV: Email + Team (one row per learner). Merged into roster/program export. */
export function parseTeamLookupCsv(text: string): Map<string, string> {
  return teamAssignmentsToLookup(parseTeamAssignmentsCsv(text));
}

/** Keep roster rows whose email exists in the team map; assign team name from the map. */
export function applyTeamMapToRoster(roster: RosterRow[], lookup: Map<string, string>): RosterRow[] {
  if (!lookup.size) return [];
  return roster
    .filter((r) => lookup.has(canonicalizeEmailForMatch(r.email)))
    .map((r) => ({ ...r, team: lookup.get(canonicalizeEmailForMatch(r.email))! }));
}

/** Activity rows for learners listed in the team map only. */
export function filterActivityByTeamMap<T extends { member: string }>(
  rows: T[],
  lookup: Map<string, string>,
): T[] {
  if (!lookup.size) return [];
  return rows.filter((r) => lookup.has(canonicalizeEmailForMatch(r.member)));
}

/** @deprecated Use applyTeamMapToRoster */
export function mergeTeamAssignments(roster: RosterRow[], lookup: Map<string, string>): RosterRow[] {
  return applyTeamMapToRoster(roster, lookup);
}
