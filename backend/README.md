# Mealboard backend

FastAPI + SQLAlchemy API for recipes, weekly dinner board, and grocery inventory. Dependencies are managed with [uv](https://docs.astral.sh/uv/).

## Setup

```bash
uv sync
cp .env.example .env
# Required: HOUSEHOLD_PIN, SESSION_SECRET (≥32 chars)
# Optional: DATABASE_URL, CORS_ORIGINS, SESSION_HTTPS_ONLY
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

OpenAPI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

## Auth

- `POST /api/auth/login` `{ "pin": "..." }` → httpOnly `mealboard_session` cookie
- `GET /api/auth/me` → `{ "authenticated": bool }`
- `POST /api/auth/logout` → clear cookie

Most `/api/*` routes require a valid session.

## Checks

```bash
uv run ruff check app tests
uv run pytest
```
