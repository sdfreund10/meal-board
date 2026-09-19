# Mealboard frontend

React 19 + Vite + Tailwind CSS UI for the household meal board.

## Setup

```bash
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173) — Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`. Start the backend first and use the household PIN from `backend/.env`. Leave `VITE_API_BASE_URL` unset locally so those relative paths hit the proxy.

## Production (Cloudflare Pages)

Git-connected Pages settings:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |

Environment variable (Production):

| Variable | Value |
| --- | --- |
| `VITE_API_BASE_URL` | `https://api.meals.sfreund.tools` |

Vite inlines this at build time; changing it requires a redeploy. `public/_redirects` sends SPA routes to `index.html`.

On the API, set `CORS_ORIGINS` to the Pages custom domain (e.g. `["https://meals.sfreund.tools"]`). Session cookies use `SameSite=Lax`, which is fine for `meals.*` → `api.meals.*` (same site under `sfreund.tools`). Preview hosts on `*.pages.dev` are cross-site: add those origins to `CORS_ORIGINS` and switch the API cookie to `SameSite=None` only if you need authenticated preview deploys.

## Routes

| Path | Screen |
|------|--------|
| `/` | Weekly dinner board (`?week=YYYY-MM-DD` Monday) |
| `/recipes` | Recipe catalog |
| `/weeks/:weekStart/grocery` | Grocery inventory for that week |

## Checks

```bash
npm run lint
npm test
npm run build
```
