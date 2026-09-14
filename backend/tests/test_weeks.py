
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


def test_week_board_empty_week(auth_client: TestClient) -> None:
    response = auth_client.get("/api/weeks/2026-09-07")
    assert response.status_code == 200
    body = response.json()
    assert body["week_start"] == "2026-09-07"
    assert len(body["days"]) == 7
    for index, day in enumerate(body["days"]):
        assert day["day_of_week"] == index
        assert day["recipe"] is None


def test_week_board_rejects_non_monday(auth_client: TestClient) -> None:
    # 2026-09-08 is a Tuesday
    response = auth_client.get("/api/weeks/2026-09-08")
    assert response.status_code == 400


def test_assign_and_clear_dinner_slot(auth_client: TestClient) -> None:
    recipe_id = _create_recipe(auth_client)
    week = "2026-09-07"

    assign = auth_client.put(
        f"/api/weeks/{week}/days/1",
        json={"recipe_id": recipe_id},
    )
    assert assign.status_code == 200
    body = assign.json()
    assert body["week_start"] == week
    tuesday = body["days"][1]
    assert tuesday["day_of_week"] == 1
    assert tuesday["recipe"]["id"] == recipe_id
    assert tuesday["recipe"]["name"] == "Tacos"

    board = auth_client.get(f"/api/weeks/{week}")
    assert board.json()["days"][1]["recipe"]["id"] == recipe_id
    assert board.json()["days"][0]["recipe"] is None

    clear = auth_client.put(
        f"/api/weeks/{week}/days/1",
        json={"recipe_id": None},
    )
    assert clear.status_code == 200
    assert clear.json()["days"][1]["recipe"] is None


def test_assign_unknown_recipe(auth_client: TestClient) -> None:
    response = auth_client.put(
        "/api/weeks/2026-09-07/days/0",
        json={"recipe_id": 999},
    )
    assert response.status_code == 404


def test_assign_rejects_invalid_day(auth_client: TestClient) -> None:
    recipe_id = _create_recipe(auth_client, "Soup")
    response = auth_client.put(
        "/api/weeks/2026-09-07/days/7",
        json={"recipe_id": recipe_id},
    )
    assert response.status_code == 422
