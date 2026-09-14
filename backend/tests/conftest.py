import os

# Must be set before app.config.settings is imported.
os.environ.setdefault("HOUSEHOLD_PIN", "1234")
os.environ.setdefault(
    "SESSION_SECRET",
    "test-session-secret-at-least-32-chars",
)

from collections.abc import Generator

import pytest
from app.database import Base, get_db
from app.main import app
from app.models import (  # noqa: F401
    DinnerSlot,
    Recipe,
    RecipeIngredient,
    RecipeStep,
    Tag,
)
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_database() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session() -> Generator[Session, None, None]:
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db() -> Generator[Session, None, None]:
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_client(client: TestClient) -> TestClient:
    response = client.post("/api/auth/login", json={"pin": "1234"})
    assert response.status_code == 200
    return client
