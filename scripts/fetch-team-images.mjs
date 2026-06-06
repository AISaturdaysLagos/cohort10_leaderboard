/**
 * Fetch landmark photos for teams in team_descriptions.csv (Wikipedia → Openverse).
 * Adds Image_URL and Image_Source columns.
 *
 * Usage:
 *   node scripts/fetch-team-images.mjs
 *   node scripts/fetch-team-images.mjs --only-missing
 *   node scripts/fetch-team-images.mjs --fix-bad
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "team_descriptions.csv");
const onlyMissing = process.argv.includes("--only-missing");
const fixBad = process.argv.includes("--fix-bad");
const delayMs = 900;
const UA = "TRI-AI-Saturdays-League/1.0 (cohort team images; contact hello@tri-ai.org)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeWikiThumb(url) {
  if (!url || !url.includes("upload.wikimedia.org") || !url.includes("/thumb/")) return url;
  const ALLOWED = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];
  const m = url.match(/\/(\d+)px-/);
  if (!m) return url;
  const current = Number(m[1]);
  if (ALLOWED.includes(current)) return url;
  const target = 960;
  return url.replace(/\/(\d+)px-/, `/${target}px-`);
}

function upsizeThumb(url) {
  if (!url) return url;
  if (url.includes("staticflickr.com")) return url.replace("_b.jpg", "_c.jpg");
  return normalizeWikiThumb(url);
}

function splitCamelCase(s) {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

function isGeoCategory(category) {
  const cat = (category ?? "").toLowerCase();
  return /river|lake|mountain|volcano|desert|national park/.test(cat);
}

const COUNTRY_WIKI_TITLES = new Set([
  "the gambia",
  "gambia",
  "malawi",
  "senegal",
  "niger",
  "chad",
  "ghana",
  "kenya",
  "benin",
  "togo",
  "guinea",
  "liberia",
  "zambia",
  "mali",
  "cameroon",
]);

function isWrongRiverImage(url, teamName = "", overview = "", category = "") {
  if (!(category ?? "").toLowerCase().includes("river")) return false;
  const u = url.toLowerCase();
  const team = (teamName ?? "").toLowerCase();
  const text = `${team} ${overview ?? ""}`.toLowerCase();
  if (/jama'?are/.test(text) && /bunga/.test(u)) return true;
  if (/tana/.test(text) && /kenya|africa|indian ocean/.test(text) && /finland|lapland|teno|utsjoki/.test(u)) return true;
  return false;
}

function isBadImageUrl(url, source = "", category = "", teamName = "", overview = "") {
  if (!url?.trim()) return true;
  if (isWrongRiverImage(url, teamName, overview, category)) return true;
  const u = url.toLowerCase();
  const s = (source ?? "").toLowerCase();
  const cat = (category ?? "").toLowerCase();

  if (/\.svg|flag_of|flag-of|coat_of_arms|seal_of|emblem_of|national_flag/.test(u)) return true;
  if (/location_map|locator_map|_osm\.|basin_osm|river_basin|versant|watershed|drainage|_3d\.gif|\.gif$/i.test(u)) return true;
  if (/location map|locator map|river basin|drainage basin|osm\.png/i.test(s)) return true;
  if (/mountain|river|lake|volcano|national park|desert/.test(cat)) {
    if (/boeing|airbus|airlines|aircraft|\/777|737-|a320|msn_|vghs|takeoff|runway|ethiopian_airlines/i.test(`${u} ${s}`)) return true;
  }
  if (cat.includes("river") && /bridge|viaduct|overpass/.test(`${u} ${s}`)) return true;
  if (cat.includes("mountain") && /austrostipa|_sp_|_sp\.|herbarium|botanical|flora_of|wildflower|\bgrass\b|\bplant\b|\borchid\b/i.test(`${u} ${s}`)) return true;

  if (s.startsWith("wikipedia:")) {
    const title = source.slice(11).trim().toLowerCase();
    if (cat.includes("river") && COUNTRY_WIKI_TITLES.has(title)) return true;
    if (cat.includes("lake") && (title === "malawi" || title === "chad")) return true;
    if (cat.includes("river") && title === "shire") return true;
  }

  return false;
}

function isBadImageHit(url, source = "", category = "", wikiDescription = "", teamName = "", overview = "") {
  if (isBadImageUrl(url, source, category, teamName, overview)) return true;

  const s = (source ?? "").toLowerCase();
  const cat = (category ?? "").toLowerCase();
  const desc = (wikiDescription ?? "").toLowerCase();
  if (!desc || !s.startsWith("wikipedia:")) return false;

  if (/^(country|sovereign state|republic| kingdom|landlocked country)/.test(desc)) {
    if (cat.includes("river") || cat.includes("lake") || cat.includes("mountain")) return true;
  }

  const title = source.slice(11).trim().toLowerCase();
  if (cat.includes("river") && !title.includes("river") && !/\briver\b/.test(desc)) {
    if (!/nile|creek|stream| tributary|falls|delta/.test(title)) return true;
  }
  if (cat.includes("lake") && !title.includes("lake") && !/\blake\b/.test(desc)) return true;

  return false;
}

function guessTitles(teamName, category, overview) {
  const name = splitCamelCase(teamName.trim());
  const cat = (category ?? "").toLowerCase();
  const titles = [];

  if (overview) {
    const lead = overview.match(/^(.+?)\s+(is|in|are|was|flows|forms|joins|has|lies|sits|spans|holds|rises|wraps|anchors|often|located|feeds|borders|includes|protects|covers|spans|contains)\s/i);
    if (lead?.[1]) titles.push(lead[1].replace(/\(\~.+?\)/g, "").trim());
    const mountName = overview.match(/^(Mount [^(,.—]+)/i);
    if (mountName?.[1]) titles.push(mountName[1].trim());
    const namedMount = overview.match(/Mount [A-Za-z]+(?:\s+[A-Za-z]+)*(?:\s*\([^)]+\))?/i);
    if (namedMount?.[0]) titles.push(namedMount[0].trim());
    const riverLead = overview.match(/The ([A-Za-z'’]+(?:\s+[A-Za-z'’]+)* River)/i);
    if (riverLead?.[1]) titles.push(riverLead[1], `The ${riverLead[1]}`);
    const peakLead = overview.match(/^([A-Za-z][^(,.—]+(?:\(\~?\d[\d,.\s m]+\))?)/);
    if (peakLead?.[1] && cat.includes("mountain")) {
      titles.push(peakLead[1].trim(), peakLead[1].replace(/\s*\([^)]+\)/, "").trim());
    }
  }

  if (cat.includes("national park")) {
    if (/\s+park$/i.test(name)) titles.push(name.replace(/\s+park$/i, " National Park"));
    titles.push(`${name} National Park`);
  }
  if (cat.includes("lake")) titles.push(`Lake ${name}`, `${name} Lake`);
  if (cat.includes("river")) {
    titles.push(`${name} River`, `${name} river`);
    const region = overview ? regionFromOverview(overview) : null;
    if (region) {
      titles.push(`${name} River (${region})`, `The ${name} River (${region})`);
    }
  }
  if (cat.includes("mountain") && overview) {
    const region = regionFromOverview(overview);
    if (region) titles.push(`Mount ${name} ${region}`, `${name} ${region}`);
  }
  if (cat.includes("mountain")) titles.push(`Mount ${name}`, `${name} Mountains`, `${name} Mountain`);
  if (cat.includes("volcano")) titles.push(`${name} (volcano)`, `${name} volcano`);
  if (cat.includes("desert")) titles.push(`${name} Desert`);
  if (cat.includes("tree")) titles.push(`${name} tree`, `${name} Tree`);

  if (!isGeoCategory(category)) titles.push(name, teamName.trim());
  return [...new Set(titles.filter(Boolean))];
}

function regionFromOverview(overview) {
  const match = overview.match(
    /\b(?:in|from)\s+(Ethiopia|Kenya|Nigeria|Uganda|Ghana|Rwanda|Tanzania|Cameroon|Gabon|Senegal|Mozambique|South Africa|Democratic Republic of the Congo|DRC|Morocco|Egypt|Sudan|Zimbabwe|Zambia|Malawi|Benin|Togo|Guinea|Liberia|Sierra Leone|Mali|Niger|Chad|Burkina Faso|Côte d'Ivoire|Ivory Coast|Namibia|Botswana|Lesotho|Eswatini|Madagascar|Somalia|Djibouti|Eritrea|Algeria|Tunisia|Libya|Mauritania|Angola|Congo|Central African Republic|Equatorial Guinea|Burundi|South Sudan|Gambia|Cape Verde|São Tomé and Príncipe|Comoros|Seychelles|Mauritius|Rwanda)\b/i,
  );
  return match?.[1];
}

function isGeographicMismatch(label, overview) {
  if (!overview) return false;
  const o = overview.toLowerCase();
  const l = label.toLowerCase();
  if (/ethiopia|bale|oromia|gurage/.test(o) && /indonesia|malang|java|bali|arjuno|jakarta|singosari/.test(l)) return true;
  if (/nigeria|cross river/.test(o) && /grand canyon|arizona|yellowstone|yosemite|zion/.test(l)) return true;
  if (/kenya|africa|indian ocean|tanzania|uganda|zambia|nigeria|ethiopia/.test(o) && /finland|lapland|teno|utsjoki|norway|sweden|scandinavia/.test(l)) return true;
  return false;
}

function searchQueries(teamName, category, overview) {
  const titles = guessTitles(teamName, category, overview);
  const queries = [...titles];
  const region = overview ? regionFromOverview(overview) : null;
  if (region) {
    for (const title of titles.slice(0, 3)) queries.push(`${title} ${region}`);
  }
  if (category) queries.push(`${titles[0] ?? teamName} ${category} Africa`);
  if (overview) {
    const short = overview.split(".")[0]?.slice(0, 80);
    if (short) queries.push(short);
  }
  return [...new Set(queries.filter(Boolean))];
}

async function fetchWithRetry(url, opts = {}, retries = 4) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, { ...opts, headers: { "User-Agent": UA, ...opts.headers } });
    if (res.status === 429) {
      await sleep(3000 * (i + 1));
      continue;
    }
    return res;
  }
  return null;
}

async function wikiSummaryImage(title, category, teamName, overview) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`;
  try {
    const res = await fetchWithRetry(url);
    if (!res?.ok) return null;
    const data = await res.json();
    const src = data.originalimage?.source ?? data.thumbnail?.source;
    if (!src) return null;
    const hit = {
      url: normalizeWikiThumb(data.thumbnail?.source ?? src),
      source: `Wikipedia: ${data.title ?? title}`,
      wikiDescription: data.description ?? "",
    };
    if (isBadImageHit(hit.url, hit.source, category, hit.wikiDescription, teamName, overview)) return null;
    return hit;
  } catch {
    return null;
  }
}

async function commonsImage(query, category, teamName, overview) {
  try {
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srnamespace=6&srlimit=6&format=json&origin=*`;
    const searchRes = await fetchWithRetry(searchUrl);
    if (!searchRes?.ok) return null;
    const searchData = await searchRes.json();
    for (const hit of searchData.query?.search ?? []) {
      const fileTitle = hit.title ?? "";
      if (/specimen|skin|mammals|rodent|naturalis|boeing|airbus|airlines|aircraft|bridge|viaduct|\.pdf/i.test(fileTitle)) continue;
      if (!/\.(jpg|jpeg|png|webp)/i.test(fileTitle)) continue;
      const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitle)}&prop=imageinfo&iiprop=url&iiurlwidth=960&format=json&origin=*`;
      const infoRes = await fetchWithRetry(infoUrl);
      if (!infoRes?.ok) continue;
      const infoData = await infoRes.json();
      const page = Object.values(infoData.query?.pages ?? {})[0];
      const info = page?.imageinfo?.[0];
      if (!info?.thumburl) continue;
      const label = fileTitle.replace(/^File:/, "").replace(/_/g, " ");
      const result = {
        url: normalizeWikiThumb(info.thumburl),
        source: `Wikipedia Commons: ${label}`,
      };
      if (isBadImageHit(result.url, result.source, category, "", teamName, overview)) continue;
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

async function openverseImage(query, category, teamName, overview) {
  const params = new URLSearchParams({
    q: query,
    page_size: "8",
    license: "by,by-sa,cc0,pdm",
  });
  try {
    const res = await fetchWithRetry(`https://api.openverse.org/v1/images/?${params}`);
    if (!res?.ok) return null;
    const data = await res.json();
    for (const hit of data.results ?? []) {
      if (!hit.url) continue;
      const label = `${hit.title ?? ""} ${hit.url}`;
      if (/logo|icon|flag|map|diagram|location map|basin|osm|3d\.gif|\.svg|specimen|naturalis|rodent|\brat\b|mammals|museum collection|biodiversity center|grand canyon|yellowstone|yosemite|zion national|death valley|boeing|airbus|airlines|aircraft|777-|737-|a320|\bbridge\b|viaduct/i.test(label)) continue;
      if (isGeographicMismatch(label, overview)) continue;
      const creator = hit.creator ? hit.creator : "Openverse";
      const license = hit.license ? hit.license.toUpperCase() : "CC";
      const result = {
        url: hit.url,
        source: `${creator} (${license} via Openverse)`,
      };
      if (isBadImageHit(result.url, result.source, category, "", teamName, overview)) continue;
      return result;
    }
  } catch {
    return null;
  }
  return null;
}

async function findImage(teamName, category, overview) {
  const queries = searchQueries(teamName, category, overview);
  for (const title of queries.slice(0, 8)) {
    const hit = await wikiSummaryImage(title, category, teamName, overview);
    if (hit) return hit;
    const commonsHit = await commonsImage(title, category, teamName, overview);
    if (commonsHit) return commonsHit;
    await sleep(400);
  }
  for (const q of queries.slice(0, 6)) {
    const hit = await openverseImage(q, category, teamName, overview);
    if (hit) return hit;
    await sleep(300);
  }
  return null;
}

function rowNeedsFix(row) {
  if (!row.Image_URL?.trim()) return false;
  return isBadImageUrl(
    row.Image_URL,
    row.Image_Source ?? "",
    row.Category ?? "",
    row.Team_Name ?? "",
    row.Overview ?? "",
  );
}

const csv = readFileSync(csvPath, "utf8");
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
const rows = parsed.data;

let found = 0;
let skipped = 0;
let missing = 0;

const todo = rows.filter((r) => {
  if (fixBad) return rowNeedsFix(r);
  if (onlyMissing) return !r.Image_URL?.trim();
  return true;
});
console.log(
  `Processing ${todo.length} teams (${fixBad ? "fix bad only" : onlyMissing ? "missing only" : "all"})…`,
);

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  if (fixBad && !rowNeedsFix(row)) {
    skipped++;
    continue;
  }
  if (!fixBad && onlyMissing && row.Image_URL?.trim()) {
    skipped++;
    continue;
  }

  const teamName = row.Team_Name ?? "";
  process.stdout.write(`[${i + 1}/${rows.length}] ${teamName}… `);
  const hit = await findImage(teamName, row.Category ?? "", row.Overview ?? "");
  if (hit) {
    row.Image_URL = hit.url;
    row.Image_Source = hit.source;
    found++;
    console.log("ok");
  } else {
    row.Image_URL = row.Image_URL ?? "";
    row.Image_Source = row.Image_Source ?? "";
    missing++;
    console.log("not found");
  }
  await sleep(delayMs);
}

const out = Papa.unparse(rows, {
  header: true,
  newline: "\n",
  columns: [
    "Team_ID",
    "Team_Name",
    "Team_Size",
    "Category",
    "Overview",
    "Interesting_Details",
    "Image_URL",
    "Image_Source",
  ],
});
writeFileSync(csvPath, out);

const totalWith = rows.filter((r) => r.Image_URL?.trim()).length;
console.log(`\nDone. ${found} fetched this run, ${skipped} skipped, ${missing} still missing.`);
console.log(`${totalWith}/${rows.length} teams now have images.`);
