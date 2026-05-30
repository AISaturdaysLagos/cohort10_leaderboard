# Firebase setup for shared leaderboard

When Firebase is configured, **Publish** writes to Firestore and every student on the live site sees the same board. **Save snapshot to history** also writes to Firestore so all signed-in mentors share the same week snapshots. Without Firebase, the app falls back to **browser localStorage** (single-device only).

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project** (Spark / free plan is enough).
2. Register a **Web app** → copy the config values into `.env.local` (see [`.env.example`](../.env.example)).

## 2. Enable services

### Authentication

1. **Build → Authentication → Get started**
2. Enable **Google** (Sign-in method → Google → Enable)
3. Add your **Authorised domains** if needed (`localhost` is allowed by default; add your GitHub Pages host e.g. `aisaturdayslagos.github.io`)
4. In **Settings → Authorised domains**, ensure the Pages URL is listed for production sign-in

Set who can use `/admin` in `.env.local`:

**Organisation domain (recommended for TRI AI):**

```bash
VITE_FIREBASE_ADMIN_EMAIL_DOMAINS=tri-ai.org
```

Any Google account whose email ends with `@tri-ai.org` can sign in (must be a real Google Workspace account on that domain).

**Optional — individual emails** (e.g. external mentors on personal Gmail):

```bash
VITE_FIREBASE_ADMIN_EMAILS=mentor@gmail.com
```

You can combine both. Without any allowlist, any Google account that signs in could publish (not recommended).

Email/Password is still supported in code if you enable it in Firebase, but the admin UI uses **Sign in with Google** when Firebase is configured.

### Firestore

1. **Build → Firestore Database → Create database**
2. Start in **production mode** (you will deploy rules next)
3. Location: pick a region close to your cohort (e.g. `europe-west1`)

## 3. Deploy security rules

The Firebase CLI is included in this repo (no global install needed).

```bash
npm install
cp .firebaserc.example .firebaserc
# Edit .firebaserc — set default to your Firebase project ID (same as VITE_FIREBASE_PROJECT_ID)

npm run firebase:login
npm run firebase:deploy-rules
```

If deploy fails with *credentials are no longer valid*, refresh the token (opens browser):

```bash
npm run firebase:login-reauth
```

If you prefer a one-off without scripts: `npx firebase login --reauth` then `npx firebase deploy --only firestore:rules`.

You do **not** need `firebase init` — `firebase.json` and `firestore.rules` are already in the repo.

Rules in [`firestore.rules`](../firestore.rules):

- **Anyone** can **read** `leaderboard/published` (student page)
- **Signed-in mentors** can **read/write** `snapshots/{id}` (shared admin history)
- **Signed-in mentors** can **read/write** `config/teamMap` (shared email → team name map)
- **Signed-in mentors** can **write** `leaderboard/published` (publish from admin)

## 4. Local development

```bash
cp .env.example .env.local
# fill in VITE_FIREBASE_* values
npm run dev:clean
```

Sign in at `/admin` with **Google**, upload CSVs, **Publish to student page**. Open `/` in another browser or device — you should see the same board.

## 5. GitHub Pages deploy

Add repository secrets (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|--------|--------|
| `VITE_FIREBASE_API_KEY` | From Firebase web app config |
| `VITE_FIREBASE_AUTH_DOMAIN` | |
| `VITE_FIREBASE_PROJECT_ID` | |
| `VITE_FIREBASE_STORAGE_BUCKET` | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | |
| `VITE_FIREBASE_APP_ID` | |
| `VITE_FIREBASE_ADMIN_EMAIL_DOMAINS` | Comma-separated domains, e.g. `tri-ai.org` |
| `VITE_FIREBASE_ADMIN_EMAILS` | Optional extra individual emails |
| `VITE_FIREBASE_ADMIN_EMAIL` | Optional single-email allowlist (legacy) |

The deploy workflow passes these into the Vite build. Firebase web API keys are **designed to be public**; security comes from **Auth + Firestore rules**, not hiding the key.

Remove or leave unset `ADMIN_PASSWORD` when using Firebase — admin sign-in uses Firebase Auth instead.

## Data shape

Document path: `leaderboard/published`

```json
{
  "version": 1,
  "weekLabel": "Week of 14 Apr 2026",
  "focalActivity": "Course name",
  "metrics": [ "... team scores ..." ],
  "awards": { "teamOfTheWeek": ["Team 1"], "...": [] },
  "publishedAt": "2026-04-16T12:00:00.000Z"
}
```

Raw CSVs and roster emails **never** go to Firebase — only the curated leaderboard JSON.

### Snapshot history

Collection: `snapshots/{id}` (document id = week snapshot id, e.g. `2026-W15-my-course`)

```json
{
  "id": "2026-W15-my-course",
  "weekLabel": "Week of 14 Apr 2026",
  "focalActivity": "Course name",
  "metrics": [ "... team scores ..." ],
  "savedAt": "2026-04-16T12:00:00.000Z",
  "savedBy": "mentor@tri-ai.org"
}
```

Up to **24** snapshots are kept (oldest removed on save). Only signed-in mentors can read or delete them.

### Team assignments

Document path: `config/teamMap`

```json
{
  "version": 1,
  "csv": "Email,Team_ID,Team_Name\n…",
  "updatedAt": "2026-04-16T12:00:00.000Z",
  "updatedBy": "mentor@tri-ai.org"
}
```

The admin page loads this map first (expects **Email** + **Team_Name** or **Team** columns). Uploading a new CSV from `/admin` replaces the document for all mentors.

Seed the initial map from a local file (gitignored):

```bash
# team_assignments_with_names.csv in repo root
npm run firebase:seed-team-map
```

Requires Application Default Credentials (`gcloud auth application-default login` or `GOOGLE_APPLICATION_CREDENTIALS`).

## Free tier

Firestore + Auth on the **Spark plan** are sufficient for a weekly cohort leaderboard (reads/writes well within free quotas for thousands of learners checking once per week).
