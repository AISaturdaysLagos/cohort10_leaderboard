/**
 * Replace shared team Discord channel links in Firestore (config/teamDiscord) from local CSV.
 *
 * Reads team_discord_channels.csv from the repo root.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const csvPath = join(root, "team_discord_channels.csv");
const envLocalPath = join(root, ".env.local");

function loadEnvLocal() {
  if (!existsSync(envLocalPath)) return;
  const text = readFileSync(envLocalPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}

function failAuth(message) {
  console.error(`\n${message}\n`);
  console.error("  npm run firebase:login-reauth");
  console.error("  npm run firebase:seed-team-discord\n");
  process.exit(1);
}

async function uploadViaFirebaseCli(projectId, payload, docId) {
  const { getGlobalDefaultAccount, getAccessToken } = require("firebase-tools/lib/auth");
  const scopes = require("firebase-tools/lib/scopes");

  const account = getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) failAuth("Not signed in to Firebase CLI.");

  let accessToken;
  try {
    const tokens = await getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM]);
    accessToken = tokens?.access_token;
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes("invalid_grant") || msg.includes("invalid_rapt") || msg.includes("reauth")) {
      failAuth("Firebase CLI session expired.");
    }
    throw err;
  }

  if (!accessToken) failAuth("Could not obtain a Firebase access token.");

  const docPath = `projects/${projectId}/databases/(default)/documents/config/${docId}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  const body = {
    fields: {
      version: { integerValue: String(payload.version) },
      csv: { stringValue: payload.csv },
      updatedAt: { stringValue: payload.updatedAt },
      updatedBy: { stringValue: payload.updatedBy },
    },
  };

  const res = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes("invalid_grant") || text.includes("invalid_rapt")) failAuth("Firebase credentials rejected.");
    throw new Error(`Firestore HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  return `firebase login (${account.user.email})`;
}

async function uploadViaServiceAccount(projectId, payload, docId) {
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId });
  await admin.firestore().doc(`config/${docId}`).set(payload);
  return "GOOGLE_APPLICATION_CREDENTIALS (service account)";
}

loadEnvLocal();

const projectId =
  process.env.FIREBASE_PROJECT_ID?.trim() ||
  process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
  "tri-ai-cohort-10-leaderboard";

let csv;
try {
  csv = readFileSync(csvPath, "utf8");
} catch {
  console.error(`Could not read ${csvPath}`);
  process.exit(1);
}

if (!csv.trim()) {
  console.error("team_discord_channels.csv is empty.");
  process.exit(1);
}

const dataRows = csv.trim().split(/\r?\n/).length - 1;
const linkedRows = csv.trim().split(/\r?\n/).slice(1).filter((line) => {
  const url = line.split(",").pop()?.trim() ?? "";
  return url.startsWith("http");
}).length;

const payload = {
  version: 1,
  csv,
  updatedAt: new Date().toISOString(),
  updatedBy: "seed-script",
};

console.log(`Replacing config/teamDiscord in project "${projectId}" (${dataRows} rows, ${linkedRows} with URLs)…`);

if (linkedRows === 0) {
  console.warn("Warning: no Discord_Channel_URL values found — fill team_discord_channels.csv before seeding.");
}

let authSource;
try {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    authSource = await uploadViaServiceAccount(projectId, payload, "teamDiscord");
  } else {
    authSource = await uploadViaFirebaseCli(projectId, payload, "teamDiscord");
  }
} catch (err) {
  const msg = err?.message ?? String(err);
  if (msg.includes("invalid_grant") || msg.includes("invalid_rapt") || msg.includes("reauth")) {
    failAuth("Firebase credentials expired.");
  }
  console.error("\nUpload failed:", msg);
  process.exit(1);
}

console.log(`Auth: ${authSource}`);
console.log("Done. Document config/teamDiscord was fully replaced.");
