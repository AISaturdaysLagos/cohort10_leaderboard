import Papa from "papaparse";
import type { TeamMemberProfile } from "../types";
import { canonicalizeEmailForMatch, normalizeEmail } from "./teamAssignments";

function normEmail(s: string): string {
  return normalizeEmail(s);
}

export function profileForEmail(
  profiles: Map<string, TeamMemberProfile>,
  email: string,
): TeamMemberProfile | undefined {
  return profiles.get(canonicalizeEmailForMatch(email));
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

type RawRow = Record<string, string>;

function pick(row: RawRow, key: string): string {
  const direct = row[key];
  if (direct !== undefined) return String(direct);
  const lower = Object.keys(row).find((k) => k.trim().toLowerCase() === key.trim().toLowerCase());
  return lower ? String(row[lower] ?? "") : "";
}

function pickFirst(row: RawRow, keys: string[]): string {
  for (const key of keys) {
    const v = pick(row, key);
    if (v.trim() !== "") return v;
  }
  return "";
}

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const EMAIL_KEYS = ["Email", "Email address", "User email", "Primary email", "Member email"];
const FIRST_NAME_KEYS = ["First name", "First name ", "First_Name", "Given name"];
const LAST_NAME_KEYS = ["Last name", " Last name  ", "Last name ", "Last_Name", "Family name"];
const TEAM_ID_KEYS = ["Team_ID", "Team ID", "TeamId"];
const TEAM_NAME_KEYS = ["Team_Name", "Team name", "Team", "Group", "Squad"];
const ROLE_KEYS = ["Role", "Team role"];
const LEADER_RANK_KEYS = ["Leader_Rank", "Leader rank", "Rank"];
const QUAL_SCORE_KEYS = ["Qualification_Score", "Qualification score"];
const LEADERSHIP_NUM_KEYS = ["Leadership_Num", "Leadership num"];
const HOURS_NUM_KEYS = ["Hours_Num", "Hours num"];
const PROJ_NUM_KEYS = ["Proj_Num", "Proj num"];
const EXP_SCORE_KEYS = ["Exp_Score", "Exp score"];

export function formatMemberName(profile: TeamMemberProfile | undefined): string {
  if (!profile) return "";
  const name = [profile.firstName, profile.lastName].map((s) => s.trim()).filter(Boolean).join(" ");
  return name;
}

export function isTeamLeaderRole(role: string): boolean {
  return role.trim().toLowerCase().startsWith("team leader");
}

export const TEAM_ROLE_OPTIONS = ["Member", "Team Leader 1", "Team Leader 2"] as const;

export function leaderRankFromRole(role: string): number | null {
  const r = role.trim();
  if (r === "Team Leader 1") return 1;
  if (r === "Team Leader 2") return 2;
  return null;
}

export function upsertMemberProfile(
  rows: TeamMemberProfile[],
  email: string,
  teamId: string,
  teamName: string,
  patch: Partial<Pick<TeamMemberProfile, "firstName" | "lastName" | "role" | "leaderRank">>,
): TeamMemberProfile[] {
  const norm = normEmail(email);
  if (!norm) return rows;
  const idx = rows.findIndex((r) => canonicalizeEmailForMatch(r.email) === canonicalizeEmailForMatch(norm));
  const existing = idx >= 0 ? rows[idx] : null;
  const role = patch.role ?? existing?.role ?? "Member";
  const leaderRank =
    patch.leaderRank !== undefined ? patch.leaderRank : leaderRankFromRole(role);
  const next: TeamMemberProfile = {
    email: norm,
    firstName: patch.firstName ?? existing?.firstName ?? "",
    lastName: patch.lastName ?? existing?.lastName ?? "",
    teamId,
    teamName,
    role,
    leaderRank,
    qualificationScore: existing?.qualificationScore ?? null,
    leadershipNum: existing?.leadershipNum ?? null,
    hoursNum: existing?.hoursNum ?? null,
    projNum: existing?.projNum ?? null,
    expScore: existing?.expScore ?? null,
  };
  if (idx >= 0) {
    const copy = [...rows];
    copy[idx] = next;
    return copy;
  }
  return [...rows, next];
}

export function profilesCsvEqual(a: TeamMemberProfile[], b: TeamMemberProfile[]): boolean {
  return teamLeadersToCsv(a) === teamLeadersToCsv(b);
}

/** Parse team_leaders_assignment.csv (names, role, leader scores). */
export function parseTeamLeadersCsv(text: string): TeamMemberProfile[] {
  const clean = stripBom(text);
  const parsed = Papa.parse<RawRow>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`Team leaders CSV parse error: ${msg}`);
  }

  const rows: TeamMemberProfile[] = [];
  for (const r of parsed.data) {
    const email = normEmail(pickFirst(r, EMAIL_KEYS));
    if (!email) continue;
    const teamName = pickFirst(r, TEAM_NAME_KEYS).trim();
    const teamId = pickFirst(r, TEAM_ID_KEYS).trim();
    rows.push({
      email,
      firstName: pickFirst(r, FIRST_NAME_KEYS).trim(),
      lastName: pickFirst(r, LAST_NAME_KEYS).trim(),
      teamId,
      teamName,
      role: pickFirst(r, ROLE_KEYS).trim(),
      leaderRank: parseNum(pickFirst(r, LEADER_RANK_KEYS)),
      qualificationScore: parseNum(pickFirst(r, QUAL_SCORE_KEYS)),
      leadershipNum: parseNum(pickFirst(r, LEADERSHIP_NUM_KEYS)),
      hoursNum: parseNum(pickFirst(r, HOURS_NUM_KEYS)),
      projNum: parseNum(pickFirst(r, PROJ_NUM_KEYS)),
      expScore: parseNum(pickFirst(r, EXP_SCORE_KEYS)),
    });
  }

  const byEmail = new Map<string, TeamMemberProfile>();
  for (const r of rows) byEmail.set(canonicalizeEmailForMatch(r.email), r);
  return [...byEmail.values()];
}

export function teamLeadersToCsv(rows: TeamMemberProfile[]): string {
  const sorted = [...rows].sort((a, b) => {
    const ta = Number(a.teamId);
    const tb = Number(b.teamId);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    const ra = a.leaderRank ?? 999;
    const rb = b.leaderRank ?? 999;
    if (ra !== rb) return ra - rb;
    return a.email.localeCompare(b.email);
  });
  return Papa.unparse(
    sorted.map((r) => ({
      Email: r.email,
      "First name ": r.firstName,
      " Last name  ": r.lastName,
      Team_ID: r.teamId,
      Team_Name: r.teamName,
      Role: r.role,
      Leader_Rank: r.leaderRank ?? "",
      Qualification_Score: r.qualificationScore ?? "",
      Leadership_Num: r.leadershipNum ?? "",
      Hours_Num: r.hoursNum ?? "",
      Proj_Num: r.projNum ?? "",
      Exp_Score: r.expScore ?? "",
    })),
    { header: true, newline: "\n" },
  );
}

export function teamLeadersToLookup(rows: TeamMemberProfile[]): Map<string, TeamMemberProfile> {
  return new Map(rows.map((r) => [canonicalizeEmailForMatch(r.email), r]));
}

/** Leaders first (by rank), then members alphabetically by email. */
export function sortMembersByProfile(
  members: string[],
  profiles: Map<string, TeamMemberProfile>,
): string[] {
  return [...members].sort((a, b) => {
    const pa = profileForEmail(profiles, a);
    const pb = profileForEmail(profiles, b);
    const ra = pa?.leaderRank ?? 999;
    const rb = pb?.leaderRank ?? 999;
    if (ra !== rb) return ra - rb;
    const na = formatMemberName(pa) || a;
    const nb = formatMemberName(pb) || b;
    return na.localeCompare(nb);
  });
}
