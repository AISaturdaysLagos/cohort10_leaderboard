import Papa from "papaparse";
import type { TeamDescription } from "../types";
import { normalizeWikiImageUrl } from "./wikiImageUrl";

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

const TEAM_ID_KEYS = ["Team_ID", "Team ID", "TeamId"];
const TEAM_NAME_KEYS = ["Team_Name", "Team name", "Team"];
const TEAM_SIZE_KEYS = ["Team_Size", "Team size"];
const CATEGORY_KEYS = ["Category"];
const OVERVIEW_KEYS = ["Overview"];
const DETAILS_KEYS = ["Interesting_Details", "Interesting details"];
const IMAGE_URL_KEYS = ["Image_URL", "Image URL", "ImageUrl"];
const IMAGE_SOURCE_KEYS = ["Image_Source", "Image Source", "ImageSource"];

export function parseTeamDescriptionsCsv(text: string): TeamDescription[] {
  const clean = stripBom(text);
  const parsed = Papa.parse<RawRow>(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  const fatalErrors = parsed.errors.filter((e) => e.code !== "TooManyFields");
  if (fatalErrors.length) {
    const msg = fatalErrors.map((e) => e.message).join("; ");
    throw new Error(`Team descriptions CSV parse error: ${msg}`);
  }
  if (parsed.errors.length) {
    console.warn("Team descriptions CSV field warnings:", parsed.errors.map((e) => e.message).join("; "));
  }

  const rows: TeamDescription[] = [];
  for (const r of parsed.data) {
    const teamId = pickFirst(r, TEAM_ID_KEYS).trim();
    const teamName = pickFirst(r, TEAM_NAME_KEYS).trim();
    if (!teamId && !teamName) continue;
    rows.push({
      teamId: teamId || teamName,
      teamName: teamName || teamId,
      teamSize: parseNum(pickFirst(r, TEAM_SIZE_KEYS)),
      category: pickFirst(r, CATEGORY_KEYS).trim(),
      overview: pickFirst(r, OVERVIEW_KEYS).trim(),
      interestingDetails: pickFirst(r, DETAILS_KEYS).trim(),
      imageUrl: normalizeWikiImageUrl(pickFirst(r, IMAGE_URL_KEYS).trim()),
      imageSource: pickFirst(r, IMAGE_SOURCE_KEYS).trim(),
    });
  }
  return rows;
}

export function teamDescriptionsToCsv(rows: TeamDescription[]): string {
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
      Team_Size: r.teamSize ?? "",
      Category: r.category,
      Overview: r.overview,
      Interesting_Details: r.interestingDetails,
      Image_URL: r.imageUrl,
      Image_Source: r.imageSource,
    })),
    { header: true, newline: "\n" },
  );
}

export function teamDescriptionsById(rows: TeamDescription[]): Map<string, TeamDescription> {
  const map = new Map<string, TeamDescription>();
  for (const r of rows) {
    map.set(r.teamId, r);
    if (r.teamName) map.set(r.teamName.toLowerCase(), r);
  }
  return map;
}
