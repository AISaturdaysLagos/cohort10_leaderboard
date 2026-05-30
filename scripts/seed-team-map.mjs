/**
 * Seed shared team assignments to Firestore (config/teamMap).
 *
 * Reads team_assignments_with_names.csv from the repo root (gitignored locally).
 * Requires Application Default Credentials, e.g. after:
 *   gcloud auth application-default login
 * or a service account via GOOGLE_APPLICATION_CREDENTIALS.
 *
 * Usage:
 *   npm run firebase:seed-team-map
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "team_assignments_with_names.csv");

const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
  "tri-ai-cohort-10-leaderboard";

let csv;
try {
  csv = readFileSync(csvPath, "utf8");
} catch {
  console.error(`Could not read ${csvPath}`);
  console.error("Place team_assignments_with_names.csv in the repo root (file is gitignored).");
  process.exit(1);
}

if (!csv.trim()) {
  console.error("team_assignments_with_names.csv is empty.");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId,
});

const payload = {
  version: 1,
  csv,
  updatedAt: new Date().toISOString(),
  updatedBy: "seed-script",
};

await admin.firestore().doc("config/teamMap").set(payload);

console.log(`Uploaded team map to Firestore (${csv.split(/\r?\n/).length - 1} data rows).`);
console.log(`Project: ${projectId} · Document: config/teamMap`);
