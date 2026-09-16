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

## Recipe extraction evals

The fixture-based eval suite compares recipe extraction quality, latency, and cost
across OpenRouter models. Set `OPENROUTER_API_KEY` in `.env`, then run the suite
from this directory:

```bash
uv run python -m evals.run \
  --repeat=3 \
  --model=google/gemini-2.5-flash-lite
```

Each repeat makes a separate paid model request. The terminal displays a compact
summary, while complete model responses and scoring details are written to
`evals/results/<model>_<timestamp>.json`.

Eval cases consist of:

- HTML snapshots in `evals/fixtures/`
- Expected ingredient and step signals in `evals/fixtures/expected.json`
- Source URLs in `evals/refresh_fixtures.py`

To refresh the HTML snapshots from their source URLs:

```bash
uv run python -m evals.refresh_fixtures
```

Review refreshed snapshots before comparing them with earlier runs because source
pages can change independently of the prompt or model.
