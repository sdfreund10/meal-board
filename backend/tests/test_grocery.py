from fastapi.testclient import TestClient


def _create_recipe(
    auth_client: TestClient,
    name: str,
    ingredients: list[dict[str, str]],
) -> int:
    response = auth_client.post(
        "/api/recipes",
        json={
            "name": name,
            "ingredients": ingredients,
            "steps": [{"text": "Cook"}],
            "tag_ids": [],
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_grocery_requires_auth(client: TestClient) -> None:
    assert client.get("/api/weeks/2026-09-07/grocery").status_code == 401


def test_grocery_rejects_non_monday(auth_client: TestClient) -> None:
    # 2026-09-08 is a Tuesday
    response = auth_client.get("/api/weeks/2026-09-08/grocery")
    assert response.status_code == 400


def test_grocery_empty_week(auth_client: TestClient) -> None:
    response = auth_client.get("/api/weeks/2026-09-07/grocery")
    assert response.status_code == 200
    assert response.json() == []


def test_grocery_dedupes_with_side_by_side_quantities(
    auth_client: TestClient,
    admin_client: TestClient
) -> None:
    week = "2026-09-07"
    tacos_id = _create_recipe(
        admin_client,
        "Tacos",
        [
            {"name": "Onion", "quantity": "2"},
            {"name": "Cilantro", "quantity": "1 bunch"},
            {"name": "Salt", "quantity": ""},
        ],
    )
    soup_id = _create_recipe(
        admin_client,
        "Onion Soup",
        [
            {"name": "onion", "quantity": "1"},
            {"name": "Butter", "quantity": "2 tbsp"},
            {"name": "  Salt  ", "quantity": "   "},
        ],
    )
    rice_id = _create_recipe(
        admin_client,
        "Rice",
        [
            {"name": "Rice", "quantity": "1 cup"},
            {"name": "Onion", "quantity": "1/2"},
        ],
    )

    # Mon: Tacos; Tue: Soup then Rice (multi-recipe day)
    assert (
        admin_client.post(
            f"/api/weeks/{week}/days/0/recipes",
            json={"recipe_id": tacos_id},
        ).status_code
        == 200
    )
    assert (
        admin_client.post(
            f"/api/weeks/{week}/days/1/recipes",
            json={"recipe_id": soup_id},
        ).status_code
        == 200
    )
    assert (
        admin_client.post(
            f"/api/weeks/{week}/days/1/recipes",
            json={"recipe_id": rice_id},
        ).status_code
        == 200
    )

    response = auth_client.get(f"/api/weeks/{week}/grocery")
    assert response.status_code == 200
    assert response.json() == [
        {"name": "Onion", "quantities": ["2", "1", "1/2"]},
        {"name": "Cilantro", "quantities": ["1 bunch"]},
        {"name": "Salt", "quantities": []},
        {"name": "Butter", "quantities": ["2 tbsp"]},
        {"name": "Rice", "quantities": ["1 cup"]},
    ]
