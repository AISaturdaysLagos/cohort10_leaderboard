import Papa from "papaparse";
import type { TeamDiscordLink } from "../types";

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

const TEAM_ID_KEYS = ["Team_ID", "Team ID", "TeamId"];
const TEAM_NAME_KEYS = ["Team_Name", "Team name", "Team"];
const URL_KEYS = ["Discord_Channel_URL", "Discord URL", "Discord_URL", "Channel_URL", "Channel URL"];
const CHANNEL_NAME_KEYS = ["Channel_Name", "Channel name", "Discord_Channel", "Channel"];

export function isValidDiscordUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  try {
    const u = new URL(t);
    const host = u.hostname.replace(/^www\./, "");
    return host === "discord.com" || host === "discord.gg";
  } catch {
    return false;
  }
}

export function parseTeamDiscordCsv(text: string): TeamDiscordLink[] {
  const clean = stripBom(text);
  const parsed = Papa.parse<RawRow>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (parsed.errors.length) {
    const msg = parsed.errors.map((e) => e.message).join("; ");
    throw new Error(`Team Discord CSV parse error: ${msg}`);
  }

  const rows: TeamDiscordLink[] = [];
  for (const r of parsed.data) {
    const teamId = pickFirst(r, TEAM_ID_KEYS).trim();
    const teamName = pickFirst(r, TEAM_NAME_KEYS).trim();
    const channelUrl = pickFirst(r, URL_KEYS).trim();
    if (!teamId && !teamName) continue;
    if (!isValidDiscordUrl(channelUrl)) continue;
    rows.push({
      teamId: teamId || teamName,
      teamName: teamName || teamId,
      channelUrl,
      channelName: pickFirst(r, CHANNEL_NAME_KEYS).trim(),
    });
  }
  return rows;
}

export function teamDiscordToCsv(rows: TeamDiscordLink[]): string {
  const sorted = [...rows].sort((a, b) => {
    const na = Number(a.teamId);
    const nb = Number(b.teamId);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.teamName.localeCompare(b.teamName);
  });
  return Papa.unparse(
    sorted.map((r) => ({
      Team_ID: r.teamId,
      Team_Name: r.teamName,
      Channel_Name: r.channelName,
      Discord_Channel_URL: r.channelUrl,
    })),
    { header: true, newline: "\n" },
  );
}

export function teamDiscordById(rows: TeamDiscordLink[]): Map<string, TeamDiscordLink> {
  const map = new Map<string, TeamDiscordLink>();
  for (const r of rows) {
    map.set(r.teamId, r);
    if (r.teamName) map.set(r.teamName.toLowerCase(), r);
  }
  return map;
}

export function findTeamDiscordLink(
  links: Map<string, TeamDiscordLink>,
  teamId: string,
  teamName: string,
): TeamDiscordLink | null {
  return links.get(teamId) ?? links.get(teamName.toLowerCase()) ?? null;
}
