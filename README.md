# Mealboard

Household web app for **family dinner planning** and a shared **recipe catalog**. Plan a Mon–Sun board, slot multiple recipes per night, and generate a grocery inventory for the week.

**Stack:** FastAPI + SQLAlchemy + PostgreSQL · React (Vite) + Tailwind CSS · PIN and elevated admin sessions (httpOnly cookie)

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (Python + backend venv)
- Node.js 20+
- Docker (PostgreSQL)

## Quick start

### 1. Backend

```bash
cd backend
uv sync
cp .env.example .env
# Set HOUSEHOLD_PIN, ADMIN_PASSWORD, and a SESSION_SECRET (≥32 random characters)
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

App: [http://localhost:5173](http://localhost:5173) (proxies `/api` and `/health` to the backend). The recipe catalog is public. Enter the household PIN to open the board and grocery inventory; editing prompts for the admin password.

## What v1 includes

| Area | Behavior |
|------|----------|
| **Auth** | Shared PIN session for household pages; 24-hour admin elevation for mutations |
| **Recipes** | Public read-only catalog; admins can manage ingredients, steps, tags, ratings, and leftovers |
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
