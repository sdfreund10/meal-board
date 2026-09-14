# Mealboard backend

Python API (FastAPI + SQLAlchemy). Dependencies and virtualenv are managed with [uv](https://docs.astral.sh/uv/).

```bash
uv sync
cp .env.example .env   # set HOUSEHOLD_PIN and SESSION_SECRET
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Auth: `POST /api/auth/login` with `{ "pin": "..." }` sets an httpOnly `mealboard_session` cookie. Use `GET /api/auth/me` to check status and `POST /api/auth/logout` to clear it.
