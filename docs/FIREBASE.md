# Firebase setup for shared leaderboard

When Firebase is configured, **Publish** writes to Firestore and every student on the live site sees the same board. **Save snapshot to history** also writes to Firestore so all signed-in mentors share the same week snapshots. Without Firebase, the app falls back to **browser localStorage** (single-device only).

## 1. Create a Firebase project

1. Go to [Firebase Console](https://console.firebase.google.com) → **Add project** (Spark / free plan is enough).
2. Register a **Web app** → copy the config values into `.env.local` (see [`.env.example`](../.env.example)).

## 2. Enable services

### Authentication

1. **Build → Authentication → Get started**
2. Enable **Google** (Sign-in method → Google → Enable)
3. Enable **Email/Password** (Sign-in method → Email/Password → Enable). Leave **Email link (passwordless)** off unless you want magic links — students use a normal password instead.
4. Add your **Authorised domains** if needed (`localhost` is allowed by default; add your GitHub Pages host e.g. `aisaturdayslagos.github.io`)
5. In **Settings → Authorised domains**, ensure the Pages URL is listed for production sign-in

**Admin** (`/admin`) signs in with Google only. **Students** (`/my-team`) can use Google or **email + password** (create account on first visit). Admin access is restricted by email/domain allowlist (below); students are matched to teams by whatever email they sign in with.

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

Email/Password is required for students without Gmail; the admin UI still uses **Sign in with Google** only.

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

### Admin scoreboard draft (activity, roster, week scope)

Document path: `config/adminDraft`

```json
{
  "version": 1,
  "activityCsv": "…full Skills Boost activity export…",
  "rosterCsv": "…program members export…",
  "activityFileName": "activity.csv",
  "rosterFileName": "roster.csv",
  "weekMondayIso": "2026-06-01",
  "parentOverride": "",
  "focalOverride": "",
  "savedAt": "2026-04-16T12:00:00.000Z",
  "updatedBy": "mentor@tri-ai.org"
}
```

Mentors see the same **import preview** and **Team management → member metrics** after signing in. Uploading a new **activity** or **roster** CSV on the Scoreboard tab updates this document immediately; week and focal course changes are debounced (~600ms). A copy is also kept in browser `localStorage` for fast reload.

Firestore documents are limited to **1 MiB** — very large exports may fail to save (same constraint as `config/teamMap`).

Seed the initial map from a local file (gitignored):

```bash
# team_assignments_with_names.csv in repo root

# Step 1 — run alone; complete sign-in in the browser when it opens
npm run firebase:login-reauth

# Step 2 — after step 1 succeeds
npm run firebase:seed-team-map
```

Run the two commands **separately** (do not paste them on one line). If `login-reauth` finishes instantly with no browser, run:

```bash
node ./node_modules/firebase-tools/lib/bin/firebase.js login --reauth
```

**Service account (no browser):** Firebase Console → Project settings → Service accounts → Generate new private key, then:

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your-key.json"
npm run firebase:seed-team-map
```

**Admin UI:** `/admin` → Team management → upload `team_assignments_with_names.csv` (replaces the shared map for all admins).

### Team leader profiles (names, roles, scores)

Document path: `config/teamLeaders`

```json
{
  "version": 1,
  "csv": "…full team_leaders_assignment.csv export…",
  "updatedAt": "2026-04-16T12:00:00.000Z",
  "updatedBy": "mentor@tri-ai.org"
}
```

Expected CSV columns: **Email**, **First name**, **Last name**, **Team_ID**, **Team_Name**, **Role** (Team Leader 1 / Team Leader 2 / Member), **Leader_Rank**, plus optional qualification score columns.

Team management shows **Name** and **Role** on each member row (leaders listed first). Team assignments (`config/teamMap`) still control roster membership; leader profiles add display metadata only.

```bash
npm run firebase:seed-team-leaders
# or seed both assignments + leaders:
npm run firebase:seed-config
```

**Admin UI:** `/admin` → Team management → **Upload leaders CSV** (`team_leaders_assignment.csv`).

### Team descriptions (student portal)

Document path: `config/teamDescriptions`

```json
{
  "version": 1,
  "csv": "…full team_descriptions.csv…",
  "updatedAt": "2026-04-16T12:00:00.000Z",
  "updatedBy": "seed-script"
}
```

CSV columns: **Team_ID**, **Team_Name**, **Team_Size**, **Category**, **Overview**, **Interesting_Details**, **Image_URL**, **Image_Source**.

Fetch landmark photos (Wikipedia → Openverse, with category gradient fallback in the app):

```bash
npm run firebase:fetch-team-images
npm run firebase:fetch-team-images -- --only-missing
npm run firebase:fetch-team-images -- --fix-bad
npm run firebase:seed-team-descriptions
```

```bash
npm run firebase:seed-team-descriptions
# included in:
npm run firebase:seed-config
```

### Student team portal (`/my-team`)

Learners sign in with **Google** or **email + password**. After sign-in, the app reads `config/teamMap`, `config/teamLeaders`, and `config/teamDescriptions` and shows:

- **All learners:** team name + description
- **Team leaders** (Role = Team Leader 1 / 2): full roster with names and roles
- **Admins** (allowlisted mentor accounts): team picker + preview as student or team leader

Enable **Google** and **Email/Password** in Firebase Console (see [Authentication](#authentication) above). Students without Gmail can create an account with the same email listed in the cohort roster.

**Browser caching:** `/my-team` loads descriptions live from Firestore (`onSnapshot`). Each successful sync also writes to `localStorage` key `tri-saturdays-league-team-descriptions-v1` as an offline fallback. Hero **photos** are separate URLs (Wikimedia/Flickr) and may be cached by the browser until you hard-refresh. You must be **signed in** to read config docs (Firestore rules). Seeding via `npm run firebase:seed-team-descriptions` updates Firestore only — reload `/my-team` (signed in) once to refresh the local cache.

**Local production preview:** After `npm run build:pages`, use `npm run preview:pages` and open **`http://localhost:4173/cohort10_leaderboard/my-team`** (not the site root — assets use the GitHub Pages base path). For day-to-day work, `npm run dev` at `http://localhost:5173/my-team` is simpler.

### Team Discord channels

Document path: `config/teamDiscord`

CSV file: `team_discord_channels.csv` (197 rows — one per team)

| Column | Description |
|--------|-------------|
| **Team_ID** | Matches team assignments |
| **Team_Name** | e.g. Serengeti |
| **Channel_Name** | Optional display name (e.g. `serengeti`) |
| **Discord_Channel_URL** | `https://discord.com/channels/SERVER_ID/CHANNEL_ID` |
| **Discord_Invite_URL** | Per-team invite (`https://discord.gg/…`) — shown as **Team invite link** on My team |

Right-click your team channel in Discord → **Copy link**, then paste into the CSV. Re-upload from Admin → Team management or:

```bash
npm run firebase:seed-team-discord
```

Optional env var **`VITE_DISCORD_SERVER_INVITE`** — general server invite shown alongside the team channel button (see `.env.example`).

## Free tier

Firestore + Auth on the **Spark plan** are sufficient for a weekly cohort leaderboard (reads/writes well within free quotas for thousands of learners checking once per week).
