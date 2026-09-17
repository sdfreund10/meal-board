from unittest.mock import MagicMock, patch

import requests
from app.models import Recipe, RecipeIngredient, RecipeStep
from fastapi.testclient import TestClient


def test_recipes_are_public(client: TestClient) -> None:
    assert client.get("/api/recipes").status_code == 200
    assert client.post("/api/recipes", json={"name": "Tacos"}).status_code == 401
    assert (
        client.post(
            "/api/recipes/import",
            json={"url": "https://example.com/tacos"},
        ).status_code
        == 401
    )

def test_recipe_mutations_require_admin_access(auth_client: TestClient) -> None:
    assert auth_client.post("/api/recipes", json={"name": "Tacos"}).status_code == 403
    assert (
        auth_client.post(
            "/api/recipes/import",
            json={"url": "https://example.com/tacos"},
        ).status_code
        == 403
    )


def test_recipe_crud_with_ingredients_steps_tags(auth_client: TestClient, admin_client: TestClient) -> None:
    tag = admin_client.post(
        "/api/tags",
        json={"name": "mexican", "board_visible": True},
    ).json()

    create = admin_client.post(
        "/api/recipes",
        json={
            "name": "Tacos",
            "rating": "up",
            "leftovers": True,
            "source_url": "https://example.com/tacos",
            "ingredients": [
                {"name": "tortillas", "quantity": "8"},
                {"name": "onion", "quantity": "1"},
            ],
            "steps": [
                {"text": "Warm tortillas"},
                {"text": "Fill and fold"},
            ],
            "tag_ids": [tag["id"]],
        },
    )
    assert create.status_code == 201
    recipe = create.json()
    assert recipe["name"] == "Tacos"
    assert recipe["rating"] == "up"
    assert recipe["leftovers"] is True
    assert len(recipe["ingredients"]) == 2
    assert recipe["ingredients"][0]["name"] == "tortillas"
    assert recipe["ingredients"][0]["position"] == 0
    assert len(recipe["steps"]) == 2
    assert recipe["steps"][1]["text"] == "Fill and fold"
    assert recipe["steps"][1]["position"] == 1
    assert len(recipe["tags"]) == 1
    assert recipe["tags"][0]["name"] == "mexican"
    recipe_id = recipe["id"]

    listed = auth_client.get("/api/recipes")
    assert listed.status_code == 200
    assert len(listed.json()) == 1

    fetched = auth_client.get(f"/api/recipes/{recipe_id}")
    assert fetched.status_code == 200
    assert fetched.json()["name"] == "Tacos"

    patched = admin_client.patch(
        f"/api/recipes/{recipe_id}",
        json={
            "name": "Fish tacos",
            "rating": None,
            "ingredients": [{"name": "fish", "quantity": "1 lb"}],
            "steps": [{"text": "Cook fish"}, {"text": "Assemble"}],
            "tag_ids": [],
        },
    )
    assert patched.status_code == 200
    body = patched.json()
    assert body["name"] == "Fish tacos"
    assert body["rating"] is None
    assert len(body["ingredients"]) == 1
    assert body["ingredients"][0]["name"] == "fish"
    assert len(body["steps"]) == 2
    assert body["tags"] == []

    deleted = admin_client.delete(f"/api/recipes/{recipe_id}")
    assert deleted.status_code == 204
    assert auth_client.get(f"/api/recipes/{recipe_id}").status_code == 404


def test_recipe_rejects_unknown_tag(admin_client: TestClient) -> None:
    response = admin_client.post(
        "/api/recipes",
        json={"name": "Soup", "tag_ids": [999]},
    )
    assert response.status_code == 400


def test_recipe_not_found(auth_client: TestClient, admin_client: TestClient) -> None:
    assert auth_client.get("/api/recipes/999").status_code == 404
    patch = admin_client.patch("/api/recipes/999", json={"name": "Nope"})
    assert patch.status_code == 404
    assert admin_client.delete("/api/recipes/999").status_code == 404


def test_recipe_rejects_unsafe_source_url(admin_client: TestClient) -> None:
    response = admin_client.post(
        "/api/recipes",
        json={"name": "Bad", "source_url": "javascript:alert(1)"},
    )
    assert response.status_code == 422


def test_recipe_import_rejects_unsafe_url(admin_client: TestClient) -> None:
    response = admin_client.post(
        "/api/recipes/import",
        json={"url": "javascript:alert(1)"},
    )
    assert response.status_code == 422


@patch("app.routers.recipes.recipe_from_url")
def test_recipe_import_from_url(
    mock_recipe_from_url: MagicMock,
    admin_client: TestClient,
) -> None:
    mock_recipe_from_url.return_value = Recipe(
        name="Tomato Pasta",
        source_url="https://example.com/pasta",
        ingredients=[
            RecipeIngredient(name="pasta", quantity="12 oz", position=0),
            RecipeIngredient(name="tomatoes", quantity="2", position=1),
        ],
        steps=[
            RecipeStep(text="Boil the pasta", position=0),
            RecipeStep(text="Sauce the tomatoes", position=1),
        ],
    )

    response = admin_client.post(
        "/api/recipes/import",
        json={"url": "https://example.com/pasta"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Tomato Pasta"
    assert body["source_url"] == "https://example.com/pasta"
    assert len(body["ingredients"]) == 2
    assert body["ingredients"][0]["name"] == "pasta"
    assert body["ingredients"][0]["quantity"] == "12 oz"
    assert len(body["steps"]) == 2
    assert body["steps"][1]["text"] == "Sauce the tomatoes"
    mock_recipe_from_url.assert_called_once_with("https://example.com/pasta")


@patch("app.routers.recipes.recipe_from_url")
def test_recipe_import_fetch_failure(
    mock_recipe_from_url: MagicMock,
    admin_client: TestClient,
) -> None:
    mock_recipe_from_url.side_effect = requests.HTTPError("404")

    response = admin_client.post(
        "/api/recipes/import",
        json={"url": "https://example.com/missing"},
    )

    assert response.status_code == 502
    assert response.json()["detail"] == "Failed to fetch recipe URL"


@patch("app.routers.recipes.recipe_from_url")
def test_recipe_import_extract_failure(
    mock_recipe_from_url: MagicMock,
    admin_client: TestClient,
) -> None:
    mock_recipe_from_url.side_effect = ValueError("bad llm payload")

    response = admin_client.post(
        "/api/recipes/import",
        json={"url": "https://example.com/not-a-recipe"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == "Could not extract recipe from URL"
