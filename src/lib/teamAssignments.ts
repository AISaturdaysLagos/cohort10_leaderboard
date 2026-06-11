import Papa from "papaparse";
import type { TeamAssignmentRow, TeamGroup, TeamMemberProfile } from "../types";

/** Trim and lowercase — preserves Gmail dots and + aliases in stored data. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Lowercase + Gmail/googlemail dot and plus-alias normalization for roster matching only. */
export function canonicalizeEmailForMatch(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at <= 0) return normalized;

  let local = normalized.slice(0, at);
  let domain = normalized.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";

  if (domain === "gmail.com") {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
    local = local.replace(/\./g, "");
  }

  return `${local}@${domain}`;
}

export function emailsMatch(a: string, b: string): boolean {
  return canonicalizeEmailForMatch(a) === canonicalizeEmailForMatch(b);
}

function normEmail(s: string): string {
  return normalizeEmail(s);
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

const EMAIL_KEYS = ["Email", "Email address", "User email", "Primary email", "Member email"];
const TEAM_ID_KEYS = ["Team_ID", "Team ID", "TeamId"];
const TEAM_NAME_KEYS = ["Team_Name", "Team name", "Team", "Group", "Squad"];

export function isValidEmail(email: string): boolean {
  const e = email.trim();
  return e.includes("@") && e.includes(".") && e.length >= 5;
}

/** Parse team assignment CSV (Email, Team_ID, Team_Name or Email + Team). */
export function parseTeamAssignmentsCsv(text: string): TeamAssignmentRow[] {
  const clean = stripBom(text);
  const parsed = Papa.parse<RawRow>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`Team CSV parse error: ${msg}`);
  }

  const rows: TeamAssignmentRow[] = [];
  let autoId = 1;
  const nameToId = new Map<string, string>();

  for (const r of parsed.data) {
    const email = normEmail(pickFirst(r, EMAIL_KEYS));
    const teamName = pickFirst(r, TEAM_NAME_KEYS).trim();
    let teamId = pickFirst(r, TEAM_ID_KEYS).trim();
    const resolvedName = teamName || teamId;
    if (!email || !resolvedName) continue;

    if (!teamId) {
      const cached = nameToId.get(resolvedName.toLowerCase());
      if (cached) {
        teamId = cached;
      } else {
        teamId = String(autoId++);
        nameToId.set(resolvedName.toLowerCase(), teamId);
      }
    } else if (teamName) {
      nameToId.set(teamName.toLowerCase(), teamId);
    }

    rows.push({
      email,
      teamId,
      teamName: teamName || teamId,
    });
  }

  return dedupeByEmail(rows);
}

export function teamAssignmentsToCsv(rows: TeamAssignmentRow[]): string {
  const sorted = [...rows].sort(
    (a, b) =>
      compareTeamIds(a.teamId, b.teamId) ||
      a.teamName.localeCompare(b.teamName) ||
      a.email.localeCompare(b.email),
  );
  return Papa.unparse(
    sorted.map((r) => ({
      Email: r.email,
      Team_ID: r.teamId,
      Team_Name: r.teamName,
    })),
    { header: true, newline: "\n" },
  );
}

export function teamAssignmentsToLookup(rows: TeamAssignmentRow[]): Map<string, string> {
  return new Map(rows.map((r) => [canonicalizeEmailForMatch(r.email), r.teamName]));
}

/** Build assignment rows from leader profiles when config/teamMap is missing or empty. */
export function assignmentsFromLeaderProfiles(profiles: TeamMemberProfile[]): TeamAssignmentRow[] {
  const rows: TeamAssignmentRow[] = [];
  for (const profile of profiles) {
    if (!profile.email) continue;
    const teamName = profile.teamName.trim();
    const teamId = profile.teamId.trim() || teamName;
    if (!teamId) continue;
    rows.push({
      email: normalizeEmail(profile.email),
      teamId,
      teamName: teamName || teamId,
    });
  }
  return dedupeByEmail(rows);
}

function compareTeamIds(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
  return a.localeCompare(b);
}

function dedupeByEmail(rows: TeamAssignmentRow[]): TeamAssignmentRow[] {
  const byEmail = new Map<string, TeamAssignmentRow>();
  for (const r of rows) byEmail.set(canonicalizeEmailForMatch(r.email), r);
  return [...byEmail.values()];
}

export function groupTeams(rows: TeamAssignmentRow[]): TeamGroup[] {
  const map = new Map<string, TeamGroup>();
  for (const r of rows) {
    let g = map.get(r.teamId);
    if (!g) {
      g = { teamId: r.teamId, teamName: r.teamName, members: [] };
      map.set(r.teamId, g);
    }
    if (r.teamName) g.teamName = r.teamName;
    if (!g.members.includes(r.email)) g.members.push(r.email);
  }
  for (const g of map.values()) g.members.sort();
  return [...map.values()].sort((a, b) => compareTeamIds(a.teamId, b.teamId));
}

export function flattenTeams(groups: TeamGroup[]): TeamAssignmentRow[] {
  const rows: TeamAssignmentRow[] = [];
  for (const g of groups) {
    for (const email of g.members) {
      rows.push({ email, teamId: g.teamId, teamName: g.teamName });
    }
  }
  return rows;
}

export function nextTeamId(rows: TeamAssignmentRow[]): string {
  let max = 0;
  for (const r of rows) {
    const n = Number(r.teamId);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return String(max + 1);
}

export function validateTeamAssignments(rows: TeamAssignmentRow[]): string | null {
  const seen = new Set<string>();
  for (const r of rows) {
    if (!isValidEmail(r.email)) return `Invalid email: ${r.email}`;
    if (!r.teamName.trim()) return `Missing team name for ${r.email}`;
    const key = canonicalizeEmailForMatch(r.email);
    if (seen.has(key)) return `Duplicate email: ${r.email}`;
    seen.add(key);
  }
  return null;
}

export function renameTeam(rows: TeamAssignmentRow[], teamId: string, teamName: string): TeamAssignmentRow[] {
  const name = teamName.trim();
  if (!name) return rows;
  return rows.map((r) => (r.teamId === teamId ? { ...r, teamName: name } : r));
}

export function removeMember(rows: TeamAssignmentRow[], email: string): TeamAssignmentRow[] {
  const key = canonicalizeEmailForMatch(email);
  return rows.filter((r) => canonicalizeEmailForMatch(r.email) !== key);
}

export function removeTeam(rows: TeamAssignmentRow[], teamId: string): TeamAssignmentRow[] {
  return rows.filter((r) => r.teamId !== teamId);
}

export function addMember(
  rows: TeamAssignmentRow[],
  teamId: string,
  teamName: string,
  email: string,
): TeamAssignmentRow[] {
  const normalized = normEmail(email);
  if (!isValidEmail(normalized)) throw new Error("Enter a valid email address.");
  if (rows.some((r) => emailsMatch(r.email, normalized))) {
    throw new Error(`Email already assigned: ${normalized}`);
  }
  return [...rows, { email: normalized, teamId, teamName: teamName.trim() || teamId }];
}

export function updateMemberEmail(
  rows: TeamAssignmentRow[],
  oldEmail: string,
  newEmail: string,
): TeamAssignmentRow[] {
  const from = normEmail(oldEmail);
  const to = normEmail(newEmail);
  if (!isValidEmail(to)) throw new Error("Enter a valid email address.");
  if (!emailsMatch(from, to) && rows.some((r) => emailsMatch(r.email, to))) {
    throw new Error(`Email already assigned: ${to}`);
  }
  return rows.map((r) => (emailsMatch(r.email, from) ? { ...r, email: to } : r));
}

export function moveMember(
  rows: TeamAssignmentRow[],
  email: string,
  toTeamId: string,
  toTeamName: string,
): TeamAssignmentRow[] {
  const key = canonicalizeEmailForMatch(email);
  return rows.map((r) =>
    emailsMatch(r.email, key) ? { ...r, teamId: toTeamId, teamName: toTeamName.trim() || toTeamId } : r,
  );
}

export function createEmptyTeamMeta(rows: TeamAssignmentRow[], teamName: string): TeamGroup {
  const teamId = nextTeamId(rows);
  const name = teamName.trim() || `Team ${teamId}`;
  return { teamId, teamName: name, members: [] };
}

export function groupsEqual(a: TeamGroup[], b: TeamGroup[]): boolean {
  return rowsEqual(flattenTeams(a), flattenTeams(b));
}

export function rowsEqual(a: TeamAssignmentRow[], b: TeamAssignmentRow[]): boolean {
  if (a.length !== b.length) return false;
  const sortKey = (r: TeamAssignmentRow) => `${r.email}\0${r.teamId}\0${r.teamName}`;
  const sa = [...a].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  const sb = [...b].sort((x, y) => sortKey(x).localeCompare(sortKey(y)));
  return sa.every((r, i) => r.email === sb[i].email && r.teamId === sb[i].teamId && r.teamName === sb[i].teamName);
}

export function filterTeams(
  groups: TeamGroup[],
  query: string,
  memberProfiles?: Map<string, { firstName?: string; lastName?: string; role?: string }>,
): TeamGroup[] {
  const q = query.trim().toLowerCase();
  if (!q) return groups;
  const out: TeamGroup[] = [];
  for (const g of groups) {
    const teamMatch = g.teamName.toLowerCase().includes(q) || g.teamId.toLowerCase().includes(q);
    const matchingMembers = g.members.filter((m) => {
      if (m.includes(q)) return true;
      const p = memberProfiles?.get(canonicalizeEmailForMatch(m));
      if (!p) return false;
      const name = [p.firstName, p.lastName].filter(Boolean).join(" ").toLowerCase();
      return name.includes(q) || (p.role?.toLowerCase().includes(q) ?? false);
    });
    if (teamMatch) {
      out.push(g);
    } else if (matchingMembers.length) {
      out.push({ ...g, members: matchingMembers });
    }
  }
  return out;
}

/** Total members shown after a member-aware team filter (for result counts). */
export function filteredMemberCount(groups: TeamGroup[]): number {
  return groups.reduce((n, g) => n + g.members.length, 0);
}

export function renameTeamInGroups(groups: TeamGroup[], teamId: string, teamName: string): TeamGroup[] {
  const name = teamName.trim();
  if (!name) return groups;
  return groups.map((g) => (g.teamId === teamId ? { ...g, teamName: name } : g));
}

export function removeTeamFromGroups(groups: TeamGroup[], teamId: string): TeamGroup[] {
  return groups.filter((g) => g.teamId !== teamId);
}

export function addMemberToGroup(groups: TeamGroup[], teamId: string, email: string): TeamGroup[] {
  const normalized = normEmail(email);
  if (!isValidEmail(normalized)) throw new Error("Enter a valid email address.");
  if (groups.some((g) => g.members.some((m) => emailsMatch(m, normalized)))) {
    throw new Error(`Email already assigned: ${normalized}`);
  }
  return groups.map((g) =>
    g.teamId === teamId ? { ...g, members: [...g.members, normalized].sort() } : g,
  );
}

export function removeMemberFromGroup(groups: TeamGroup[], teamId: string, email: string): TeamGroup[] {
  const key = canonicalizeEmailForMatch(email);
  return groups.map((g) =>
    g.teamId === teamId ? { ...g, members: g.members.filter((m) => !emailsMatch(m, key)) } : g,
  );
}

export function updateMemberInGroup(
  groups: TeamGroup[],
  teamId: string,
  oldEmail: string,
  newEmail: string,
): TeamGroup[] {
  const from = normEmail(oldEmail);
  const to = normEmail(newEmail);
  if (!isValidEmail(to)) throw new Error("Enter a valid email address.");
  if (!emailsMatch(from, to) && groups.some((g) => g.members.some((m) => emailsMatch(m, to)))) {
    throw new Error(`Email already assigned: ${to}`);
  }
  return groups.map((g) =>
    g.teamId === teamId
      ? { ...g, members: g.members.map((m) => (emailsMatch(m, from) ? to : m)).sort() }
      : g,
  );
}

export function addTeamGroup(groups: TeamGroup[], teamName: string): TeamGroup[] {
  const next = createEmptyTeamMeta(flattenTeams(groups), teamName);
  return [...groups, next].sort((a, b) => compareTeamIds(a.teamId, b.teamId));
}

export function moveMemberToGroup(
  groups: TeamGroup[],
  email: string,
  toTeamId: string,
): TeamGroup[] {
  const key = canonicalizeEmailForMatch(email);
  const target = groups.find((g) => g.teamId === toTeamId);
  if (!target) throw new Error("Target team not found.");
  let found = false;
  let memberEmail = normEmail(email);
  const next = groups.map((g) => {
    const existing = g.members.find((m) => emailsMatch(m, key));
    if (existing) {
      found = true;
      memberEmail = existing;
      return { ...g, members: g.members.filter((m) => !emailsMatch(m, key)) };
    }
    return g;
  });
  if (!found) throw new Error("Member not found.");
  return next.map((g) =>
    g.teamId === toTeamId ? { ...g, members: [...g.members, memberEmail].sort() } : g,
  );
}
