# TRI AI Saturdays League — cohort leaderboard

Weekly team leaderboard from Google Skills Boost activity exports. Student view at `/`, mentor tools at `/admin`.

## Live site (GitHub Pages)

After the deploy workflow runs on `main`:

**https://aisaturdayslagos.github.io/cohort10_leaderboard/**

- Student leaderboard: `/`
- Admin: `/admin`

Published scores are stored in **Firebase Firestore** when configured (all students see the same board). Without Firebase, the app falls back to **localStorage** in the browser for local development only.

Setup: [`docs/FIREBASE.md`](docs/FIREBASE.md)

## Local development

```bash
npm install
npm run dev:clean
```

Open the URL Vite prints (usually **http://localhost:5173/**). If the page hangs, run `npm run dev:clean` — a stuck process often blocks port 5173.

### Admin sign-in

**Production (Firebase):** follow [`docs/FIREBASE.md`](docs/FIREBASE.md) — mentors sign in at `/admin` with a Firebase Email/Password user. Publishing writes to Firestore; students worldwide see the update.

**Local-only fallback:** copy `.env.example` to `.env.local` and set `VITE_ADMIN_PASSWORD` (leave Firebase vars empty). Restart with `npm run dev:clean`.

### Preview the Pages build locally

```bash
npm run build:pages
npm run preview:pages
```

Open http://localhost:4173/cohort10_leaderboard/

## Deploy to GitHub Pages

1. In the repo on GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Push to `main` (or run the **Deploy to GitHub Pages** workflow manually).

The workflow [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds with base path `/cohort10_leaderboard/` and deploys `dist/` to Pages.

Add Firebase repository secrets for production — see [`docs/FIREBASE.md`](docs/FIREBASE.md).

If the repository is renamed, update `VITE_BASE_PATH` in the workflow and `GITHUB_PAGES_BASE` in [`vite.config.ts`](vite.config.ts).

## Metrics

Scoring weights and formulas: [`docs/METRICS.md`](docs/METRICS.md) · implementation: [`src/lib/metrics.js`](src/lib/metrics.js).
