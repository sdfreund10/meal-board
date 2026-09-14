# Mealboard

Household web app for **family dinner planning** and a shared **recipe catalog**. Plan a Mon–Sun board, slot multiple recipes per night, and generate a grocery inventory for the week.

**Stack:** FastAPI + SQLAlchemy + PostgreSQL · React (Vite) + Tailwind CSS · PIN session auth (httpOnly cookie)

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python + backend venv)
- Node.js 20+
- Docker (PostgreSQL)

## Quick start

### 1. Database

```bash
docker compose up -d
```

### 2. Backend

```bash
cd backend
uv sync
cp .env.example .env
# Set HOUSEHOLD_PIN and a SESSION_SECRET (≥32 random characters)
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

API docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:5173](http://localhost:5173) (proxies `/api` and `/health` to the backend). Enter the household PIN from `.env` to unlock the app.

## What v1 includes

| Area | Behavior |
|------|----------|
| **Auth** | Shared PIN; session cookie remembered for the browser |
| **Recipes** | Catalog with ingredients, steps, tags, thumbs rating, leftovers flag |
| **Tags** | Shared list; `board_visible` tags show on the weekly board |
| **Weekly board** | Mon–Sun stepper; multiple recipes per day; assign / remove / clear |
| **Grocery** | Week inventory: ingredients deduped by name, quantities listed side-by-side |

**Not in v1:** recipe URL import, AI suggestions, pantry/shopping checkout, nutrition, offline.

## Lint and test

### Backend (Ruff + pytest)

```bash
cd backend
uv sync
uv run ruff check app tests
uv run pytest
```

### Frontend (ESLint Standard + Vitest)

```bash
cd frontend
npm run lint
npm test
npm run build
```

## Project layout

```
backend/
  app/           FastAPI app, models, schemas, routers
  alembic/       Database migrations
frontend/
  src/           React UI + API client
docker-compose.yml   PostgreSQL 16
```

## API overview

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/login` | PIN login (sets session cookie) |
| POST | `/api/auth/logout` | Clear session |
| GET | `/api/auth/me` | Session status |
| * | `/api/recipes` | Recipe CRUD |
| * | `/api/tags` | Tag CRUD |
| GET | `/api/weeks/{monday}` | Week board (7 days, recipes[]) |
| POST | `/api/weeks/{monday}/days/{0-6}/recipes` | Add recipe to a day |
| DELETE | `/api/weeks/{monday}/days/{0-6}/recipes/{id}` | Remove one recipe |
| DELETE | `/api/weeks/{monday}/days/{0-6}` | Clear a day |
| GET | `/api/weeks/{monday}/grocery` | Aggregated grocery inventory |

`{monday}` must be an ISO date for a Monday (`YYYY-MM-DD`). Authenticated routes require the session cookie.
