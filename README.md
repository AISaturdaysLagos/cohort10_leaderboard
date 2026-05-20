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
npm run dev
```

Open http://localhost:5173/

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
