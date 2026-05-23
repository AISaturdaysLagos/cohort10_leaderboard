# TRI AI Saturdays League — cohort leaderboard

Weekly team leaderboard from Google Skills Boost activity exports. Student view at `/`, mentor tools at `/admin`.

## Live site (GitHub Pages)

After the deploy workflow runs on `main`:

**https://aisaturdayslagos.github.io/cohort10_leaderboard/**

- Student leaderboard: `/`
- Admin: `/admin`

Published scores use `localStorage` in the browser (mentor publishes from admin on the same device or cohort).

## Local development

```bash
npm install
npm run dev:clean
```

Open the URL Vite prints (usually **http://localhost:5173/**). If the page hangs, run `npm run dev:clean` — a stuck process often blocks port 5173.

If you previously published the **100 teams** sample, clear site data for localhost (DevTools → Application → Local Storage) if the page feels frozen.

### Admin password

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_ADMIN_PASSWORD` to a strong mentor-only password.
3. Restart the dev server (`npm run dev:clean`).

For GitHub Pages, add repo secret **`ADMIN_PASSWORD`** (Settings → Secrets and variables → Actions). The deploy workflow passes it into the build.

`/admin` shows a sign-in form; the session lasts until the browser tab is closed. The student page stays public. This is a client-side gate suitable for a static site — not enterprise SSO.

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

If the repository is renamed, update `VITE_BASE_PATH` in the workflow and `GITHUB_PAGES_BASE` in [`vite.config.ts`](vite.config.ts).

## Metrics

Scoring weights and formulas: [`docs/METRICS.md`](docs/METRICS.md) · implementation: [`src/lib/metrics.js`](src/lib/metrics.js).

## Sample data

```bash
npm run generate:sample-100teams   # 100 teams × 10 students in public/
```
