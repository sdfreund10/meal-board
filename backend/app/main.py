from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import settings
from app.database import healthcheck
from app.routers import auth, recipes, tags, weeks

app = FastAPI(title="Mealboard API", version="0.1.0")

# Last added = outermost. CORS outside Session so credentials work cross-origin.
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.session_secret,
    session_cookie="mealboard_session",
    same_site="lax",
    https_only=settings.session_https_only,
    max_age=60 * 60 * 24 * 14,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(recipes.public_router, prefix=settings.api_prefix)
app.include_router(recipes.admin_router, prefix=settings.api_prefix)
app.include_router(tags.router, prefix=settings.api_prefix)
app.include_router(tags.admin_router, prefix=settings.api_prefix)
app.include_router(weeks.router, prefix=settings.api_prefix)
app.include_router(weeks.admin_router, prefix=settings.api_prefix)


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}

@app.get("/db-health")
def db_health() -> dict:
    return healthcheck()
