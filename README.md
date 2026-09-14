# Mealboard

Full-stack scaffold: **FastAPI** + **SQLAlchemy** + **PostgreSQL**, with a **React** (Vite) frontend styled with **Tailwind CSS**.

## Prerequisites

- [uv](https://docs.astral.sh/uv/getting-started/installation/) (installs Python and manages the backend venv)
- Node.js 20+
- Docker (for PostgreSQL)

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

App: [http://localhost:5173](http://localhost:5173) (proxies `/api` and `/health` to the backend).

## Lint and test

### Backend (Ruff + pytest)

```bash
cd backend
uv sync
uv run ruff check app tests
uv run pytest
```

### Frontend (Standard style + Vitest)

Lint uses **ESLint** with `eslint-config-standard-with-typescript` and `eslint-config-standard-jsx` (the Standard.js ruleset for TypeScript/React).

```bash
cd frontend
npm run lint
npm test
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

## Sample API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/items` | List items |
| POST | `/api/items` | Create item |
| GET | `/api/items/{id}` | Get item |
| PATCH | `/api/items/{id}` | Update item |
| DELETE | `/api/items/{id}` | Delete item |
