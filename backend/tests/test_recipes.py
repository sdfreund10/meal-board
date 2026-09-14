from fastapi.testclient import TestClient


def test_recipes_require_auth(client: TestClient) -> None:
    assert client.get("/api/recipes").status_code == 401
    assert client.post("/api/recipes", json={"name": "Tacos"}).status_code == 401


def test_tags_require_auth(client: TestClient) -> None:
    assert client.get("/api/tags").status_code == 401
    assert client.post("/api/tags", json={"name": "quick"}).status_code == 401


def test_tag_crud(auth_client: TestClient) -> None:
    create = auth_client.post(
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

    updated = auth_client.patch(
        f"/api/tags/{tag_id}",
        json={"board_visible": False},
    )
    assert updated.status_code == 200
    assert updated.json()["board_visible"] is False

    deleted = auth_client.delete(f"/api/tags/{tag_id}")
    assert deleted.status_code == 204
    assert auth_client.get("/api/tags").json() == []


def test_tag_name_must_be_unique(auth_client: TestClient) -> None:
    assert (
        auth_client.post("/api/tags", json={"name": "spicy"}).status_code == 201
    )
    conflict = auth_client.post("/api/tags", json={"name": "spicy"})
    assert conflict.status_code == 409


def test_recipe_crud_with_ingredients_steps_tags(auth_client: TestClient) -> None:
    tag = auth_client.post(
        "/api/tags",
        json={"name": "mexican", "board_visible": True},
    ).json()

    create = auth_client.post(
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

    patched = auth_client.patch(
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

    deleted = auth_client.delete(f"/api/recipes/{recipe_id}")
    assert deleted.status_code == 204
    assert auth_client.get(f"/api/recipes/{recipe_id}").status_code == 404


def test_recipe_rejects_unknown_tag(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/recipes",
        json={"name": "Soup", "tag_ids": [999]},
    )
    assert response.status_code == 400


def test_recipe_not_found(auth_client: TestClient) -> None:
    assert auth_client.get("/api/recipes/999").status_code == 404
    patch = auth_client.patch("/api/recipes/999", json={"name": "Nope"})
    assert patch.status_code == 404
    assert auth_client.delete("/api/recipes/999").status_code == 404


def test_recipe_rejects_unsafe_source_url(auth_client: TestClient) -> None:
    response = auth_client.post(
        "/api/recipes",
        json={"name": "Bad", "source_url": "javascript:alert(1)"},
    )
    assert response.status_code == 422
