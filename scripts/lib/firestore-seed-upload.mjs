/**
 * Shared Firestore config document upload for seed scripts.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import admin from "firebase-admin";

const require = createRequire(import.meta.url);

export function loadEnvLocal(root) {
  const envLocalPath = join(root, ".env.local");
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

export function resolveProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.VITE_FIREBASE_PROJECT_ID?.trim() ||
    "tri-ai-cohort-10-leaderboard"
  );
}

export function failAuth(message, scriptName) {
  console.error(`\n${message}\n`);
  console.error("Try these steps (run separately):");
  console.error("  npm run firebase:login-reauth");
  console.error(`  npm run firebase:${scriptName}\n`);
  console.error("Or use a service account:");
  console.error('  export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"');
  console.error(`  npm run firebase:${scriptName}\n`);
  process.exit(1);
}

function isNetworkError(err) {
  const msg = err?.message ?? String(err);
  const cause = err?.cause?.message ?? "";
  return (
    msg.includes("fetch failed") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("ENOTFOUND") ||
    cause.includes("fetch failed")
  );
}

async function fetchWithRetry(url, options, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function uploadViaFirebaseCli(projectId, payload, docId) {
  const { getGlobalDefaultAccount, getAccessToken } = require("firebase-tools/lib/auth");
  const scopes = require("firebase-tools/lib/scopes");

  const account = getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) {
    throw new Error("NOT_SIGNED_IN");
  }

  let accessToken;
  try {
    const tokens = await getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM]);
    accessToken = tokens?.access_token;
  } catch (err) {
    const msg = err?.message ?? String(err);
    if (msg.includes("invalid_grant") || msg.includes("invalid_rapt") || msg.includes("reauth")) {
      throw new Error("AUTH_EXPIRED");
    }
    if (isNetworkError(err)) throw new Error("NETWORK_DURING_AUTH");
    throw err;
  }

  if (!accessToken) throw new Error("NO_ACCESS_TOKEN");

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

  const res = await fetchWithRetry(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    if (text.includes("invalid_grant") || text.includes("invalid_rapt")) throw new Error("AUTH_EXPIRED");
    throw new Error(`Firestore HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  return `firebase login (${account.user.email})`;
}

async function uploadViaServiceAccount(projectId, payload, docId) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  }
  await admin.firestore().doc(`config/${docId}`).set(payload);
  return "GOOGLE_APPLICATION_CREDENTIALS (service account)";
}

async function uploadViaAdminFromCli(projectId, payload, docId) {
  const { getGlobalDefaultAccount, getAccessToken } = require("firebase-tools/lib/auth");
  const scopes = require("firebase-tools/lib/scopes");
  const account = getGlobalDefaultAccount();
  if (!account?.tokens?.refresh_token) throw new Error("NOT_SIGNED_IN");
  const tokens = await getAccessToken(account.tokens.refresh_token, [scopes.CLOUD_PLATFORM]);
  if (!tokens?.refresh_token) throw new Error("NO_ACCESS_TOKEN");

  const app = admin.initializeApp(
    {
      credential: admin.credential.refreshToken({
        clientId: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
        clientSecret: "j9iVZfS8kkCEFUPUHwf0Rl41",
        refreshToken: tokens.refresh_token,
        type: "authorized_user",
      }),
      projectId,
    },
    `seed-${docId}-${Date.now()}`,
  );
  try {
    await app.firestore().doc(`config/${docId}`).set(payload);
  } finally {
    await app.delete();
  }
  return `firebase login via admin SDK (${account.user.email})`;
}

export async function uploadConfigDoc(projectId, docId, payload, scriptName) {
  const csvBytes = Buffer.byteLength(payload.csv, "utf8");
  if (csvBytes > 1_000_000) {
    throw new Error(`CSV is ${csvBytes} bytes — Firestore limit is ~1 MiB per document.`);
  }

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()) {
    return uploadViaServiceAccount(projectId, payload, docId);
  }

  try {
    return await uploadViaFirebaseCli(projectId, payload, docId);
  } catch (err) {
    const code = err?.message ?? String(err);
    if (code === "NOT_SIGNED_IN" || code === "AUTH_EXPIRED") {
      failAuth(
        code === "AUTH_EXPIRED"
          ? "Firebase CLI session expired (Google Workspace re-auth required)."
          : "Not signed in to Firebase CLI.",
        scriptName,
      );
    }
    if (code === "NETWORK_DURING_AUTH" || isNetworkError(err)) {
      console.warn("Network error via REST — trying Firebase Admin SDK fallback…");
      try {
        return await uploadViaAdminFromCli(projectId, payload, docId);
      } catch {
        failAuth(
          "Could not reach Google / Firestore (fetch failed). Check internet or VPN, then run firebase:login-reauth.",
          scriptName,
        );
      }
    }
    throw err;
  }
}

export function readCsvOrExit(csvPath, label) {
  try {
    const csv = readFileSync(csvPath, "utf8");
    if (!csv.trim()) {
      console.error(`${label} is empty.`);
      process.exit(1);
    }
    return csv;
  } catch {
    console.error(`Could not read ${csvPath}`);
    process.exit(1);
  }
}
