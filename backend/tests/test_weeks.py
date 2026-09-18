from fastapi.testclient import TestClient


def _create_recipe(auth_client: TestClient, name: str = "Tacos") -> int:
    response = auth_client.post(
        "/api/recipes",
        json={
            "name": name,
            "ingredients": [{"name": "onion", "quantity": "1"}],
            "steps": [{"text": "Cook"}],
            "tag_ids": [],
        },
    )
    assert response.status_code == 201
    return response.json()["id"]


def test_week_board_requires_auth(client: TestClient) -> None:
    assert client.get("/api/weeks/2026-09-07").status_code == 401

def test_week_board_mutations_require_admin(auth_client: TestClient) -> None:
    auth_response = auth_client.post(
        "/api/weeks/2026-09-07/days/1/recipes",
        json={"recipe_id": "123"},
    )
    assert auth_response.status_code == 403

def test_week_board_empty_week(auth_client: TestClient) -> None:
    response = auth_client.get("/api/weeks/2026-09-07")
    assert response.status_code == 200
    body = response.json()
    assert body["week_start"] == "2026-09-07"
    assert len(body["days"]) == 7
    for index, day in enumerate(body["days"]):
        assert day["day_of_week"] == index
        assert day["recipes"] == []


def test_week_board_rejects_non_monday(admin_client: TestClient) -> None:
    # 2026-09-08 is a Tuesday
    response = admin_client.get("/api/weeks/2026-09-08")
    assert response.status_code == 400


def test_add_multiple_recipes_per_day(admin_client: TestClient) -> None:
    main_id = _create_recipe(admin_client, "Tacos")
    side_id = _create_recipe(admin_client, "Rice")
    week = "2026-09-07"

    first = admin_client.post(
        f"/api/weeks/{week}/days/1/recipes",
        json={"recipe_id": main_id},
    )
    assert first.status_code == 200
    tuesday = first.json()["days"][1]
    assert tuesday["day_of_week"] == 1
    assert [r["id"] for r in tuesday["recipes"]] == [main_id]
    assert tuesday["recipes"][0]["name"] == "Tacos"

    second = admin_client.post(
        f"/api/weeks/{week}/days/1/recipes",
        json={"recipe_id": side_id},
    )
    assert second.status_code == 200
    tuesday = second.json()["days"][1]
    assert [r["id"] for r in tuesday["recipes"]] == [main_id, side_id]
    assert [r["name"] for r in tuesday["recipes"]] == ["Tacos", "Rice"]

    board = admin_client.get(f"/api/weeks/{week}")
    assert board.status_code == 200
    assert [r["id"] for r in board.json()["days"][1]["recipes"]] == [
        main_id,
        side_id,
    ]
    assert board.json()["days"][0]["recipes"] == []


def test_add_duplicate_recipe_returns_409(admin_client: TestClient) -> None:
    recipe_id = _create_recipe(admin_client)
    week = "2026-09-07"

    first = admin_client.post(
        f"/api/weeks/{week}/days/0/recipes",
        json={"recipe_id": recipe_id},
    )
    assert first.status_code == 200

    duplicate = admin_client.post(
        f"/api/weeks/{week}/days/0/recipes",
        json={"recipe_id": recipe_id},
    )
    assert duplicate.status_code == 409
    assert [r["id"] for r in first.json()["days"][0]["recipes"]] == [recipe_id]


def test_add_unknown_recipe_returns_404(admin_client: TestClient) -> None:
    response = admin_client.post(
        "/api/weeks/2026-09-07/days/0/recipes",
        json={"recipe_id": 999},
    )
    assert response.status_code == 404


def test_add_rejects_non_monday_week_start(admin_client: TestClient) -> None:
    recipe_id = _create_recipe(admin_client, "Soup")
    response = admin_client.post(
        "/api/weeks/2026-09-08/days/0/recipes",
        json={"recipe_id": recipe_id},
    )
    assert response.status_code == 400


def test_add_rejects_invalid_day(admin_client: TestClient) -> None:
    recipe_id = _create_recipe(admin_client, "Soup")
    response = admin_client.post(
        "/api/weeks/2026-09-07/days/7/recipes",
        json={"recipe_id": recipe_id},
    )
    assert response.status_code == 422


def test_remove_one_recipe_keeps_others(admin_client: TestClient) -> None:
    main_id = _create_recipe(admin_client, "Tacos")
    side_id = _create_recipe(admin_client, "Rice")
    week = "2026-09-07"

    admin_client.post(
        f"/api/weeks/{week}/days/2/recipes",
        json={"recipe_id": main_id},
    )
    admin_client.post(
        f"/api/weeks/{week}/days/2/recipes",
        json={"recipe_id": side_id},
    )

    remove = admin_client.delete(f"/api/weeks/{week}/days/2/recipes/{main_id}")
    assert remove.status_code == 200
    recipes = remove.json()["days"][2]["recipes"]
    assert [r["id"] for r in recipes] == [side_id]

    board = admin_client.get(f"/api/weeks/{week}")
    assert [r["id"] for r in board.json()["days"][2]["recipes"]] == [side_id]


def test_remove_missing_recipe_is_idempotent(admin_client: TestClient) -> None:
    week = "2026-09-07"
    response = admin_client.delete(f"/api/weeks/{week}/days/3/recipes/999")
    assert response.status_code == 200
    assert response.json()["days"][3]["recipes"] == []


def test_clear_day_removes_all_slots(admin_client: TestClient) -> None:
    main_id = _create_recipe(admin_client, "Tacos")
    side_id = _create_recipe(admin_client, "Rice")
    week = "2026-09-07"

    admin_client.post(
        f"/api/weeks/{week}/days/4/recipes",
        json={"recipe_id": main_id},
    )
    admin_client.post(
        f"/api/weeks/{week}/days/4/recipes",
        json={"recipe_id": side_id},
    )

    clear = admin_client.delete(f"/api/weeks/{week}/days/4")
    assert clear.status_code == 200
    assert clear.json()["days"][4]["recipes"] == []

    board = admin_client.get(f"/api/weeks/{week}")
    assert board.json()["days"][4]["recipes"] == []


def test_get_orders_recipes_by_position(
    auth_client: TestClient, admin_client: TestClient
) -> None:
    first_id = _create_recipe(admin_client, "First")
    second_id = _create_recipe(admin_client, "Second")
    third_id = _create_recipe(admin_client, "Third")
    week = "2026-09-07"

    for recipe_id in (first_id, second_id, third_id):
        response = auth_client.post(
            f"/api/weeks/{week}/days/5/recipes",
            json={"recipe_id": recipe_id},
        )
        assert response.status_code == 200

    board = auth_client.get(f"/api/weeks/{week}")
    names = [r["name"] for r in board.json()["days"][5]["recipes"]]
    assert names == ["First", "Second", "Third"]
