from unittest.mock import MagicMock, patch

import requests
from app.models import Recipe, RecipeIngredient, RecipeStep
from fastapi.testclient import TestClient


def test_tags_require_auth(client: TestClient) -> None:
    assert client.get("/api/tags").status_code == 401
    assert client.post("/api/tags", json={"name": "quick"}).status_code == 401

def test_tag_mutations_require_admin(auth_client: TestClient) -> None:
    assert auth_client.get("/api/tags").status_code == 200
    assert auth_client.post("/api/tags", json={"name": "quick"}).status_code == 403

def test_tag_crud(auth_client: TestClient, admin_client: TestClient) -> None:
    create = admin_client.post(
        "/api/tags",
        json={"name": "weeknight", "board_visible": True},
    )
    assert create.status_code == 201
    tag = create.json()
    assert tag["name"] == "weeknight"
    assert tag["board_visible"] is True
    tag_id = tag["id"]

    listed = auth_client.get("/api/tags")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    updated = admin_client.patch(
        f"/api/tags/{tag_id}",
        json={"board_visible": False},
    )
    assert updated.status_code == 200
    assert updated.json()["board_visible"] is False

    deleted = admin_client.delete(f"/api/tags/{tag_id}")
    assert deleted.status_code == 204
    assert auth_client.get("/api/tags").json() == []


def test_tag_name_must_be_unique(admin_client: TestClient) -> None:
    assert admin_client.post("/api/tags", json={"name": "spicy"}).status_code == 201
    conflict = admin_client.post("/api/tags", json={"name": "spicy"})
    assert conflict.status_code == 409