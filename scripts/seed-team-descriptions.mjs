/**
 * Replace shared team descriptions in Firestore (config/teamDescriptions) from local CSV.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Papa from "papaparse";
import {
  loadEnvLocal,
  readCsvOrExit,
  resolveProjectId,
  uploadConfigDoc,
} from "./lib/firestore-seed-upload.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "team_descriptions.csv");

loadEnvLocal(root);

const projectId = resolveProjectId();
const csv = readCsvOrExit(csvPath, "team_descriptions.csv");
const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim() });
if (parsed.errors.length) {
  console.error("team_descriptions.csv has parse errors — fix before seeding:");
  for (const e of parsed.errors) console.error(`  row ${e.row}: ${e.message}`);
  process.exit(1);
}
if (parsed.data.length < 1) {
  console.error("team_descriptions.csv has no data rows.");
  process.exit(1);
}
const dataRows = parsed.data.length;
const payload = {
  version: 1,
  csv,
  updatedAt: new Date().toISOString(),
  updatedBy: "seed-script",
};

console.log(`Replacing config/teamDescriptions in project "${projectId}" (${dataRows} teams, ${Buffer.byteLength(csv, "utf8")} bytes)…`);

try {
  const authSource = await uploadConfigDoc(projectId, "teamDescriptions", payload, "seed-team-descriptions");
  console.log(`Auth: ${authSource}`);
  console.log("Done. Document config/teamDescriptions was fully replaced.");
  console.log(`Updated at: ${payload.updatedAt}`);
} catch (err) {
  const msg = err?.message ?? String(err);
  console.error("\nUpload failed:", msg);
  if (msg.includes("fetch failed") || msg.includes("NETWORK")) {
    console.error("\nThis usually means expired Firebase login or a blocked connection.");
    console.error("  npm run firebase:login-reauth");
    console.error("  npm run firebase:seed-team-descriptions");
  }
  process.exit(1);
}
