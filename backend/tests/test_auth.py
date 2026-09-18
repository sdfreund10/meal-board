from fastapi.testclient import TestClient


def test_me_unauthenticated(client: TestClient) -> None:
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"authenticated": False, "admin_access": False}

def test_me_authenticated(auth_client: TestClient) -> None:
    response = auth_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"authenticated": True, "admin_access": False}    

def test_me_admin(admin_client: TestClient) -> None:
    response = admin_client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json() == {"authenticated": True, "admin_access": True}  

def test_login_rejects_invalid_pin(client: TestClient) -> None:
    response = client.post("/api/auth/login", json={"pin": "wrong"})
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid PIN"


def test_login_logout_session_roundtrip(client: TestClient) -> None:
    login = client.post("/api/auth/login", json={"pin": "1234"})
    assert login.status_code == 200
    assert login.json() == {"authenticated": True, "admin_access": False}

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == {"authenticated": True, "admin_access": False}

    protected = client.get("/api/auth/session")
    assert protected.status_code == 200
    assert protected.json() == {"authenticated": True, "admin_access": False}

    login = client.post("/api/auth/elevate", json={"password": "admin"})
    assert login.status_code == 200
    assert login.json() == {"authenticated": True, "admin_access": True}

    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json() == {"authenticated": True, "admin_access": True}

    logout = client.post("/api/auth/logout")
    assert logout.status_code == 200
    assert logout.json() == {"authenticated": False, "admin_access": False}

    me_after = client.get("/api/auth/me")
    assert me_after.status_code == 200
    assert me_after.json() == {"authenticated": False, "admin_access": False}


def test_session_requires_auth(client: TestClient) -> None:
    response = client.get("/api/auth/session")
    assert response.status_code == 401
