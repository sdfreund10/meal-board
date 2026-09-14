# Mealboard frontend

React 19 + Vite + Tailwind CSS UI for the household meal board.

## Setup

```bash
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173) — Vite proxies `/api` and `/health` to `http://127.0.0.1:8000`. Start the backend first and use the household PIN from `backend/.env`.

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
