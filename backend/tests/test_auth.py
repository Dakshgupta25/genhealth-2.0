import pytest

def test_signup_and_login_flow(client):
    # 1. Sign up a new user
    signup_payload = {
        "email": "jane.doe@example.com",
        "password": "SecurePassword123!",
        "full_name": "Jane Doe",
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    user_data = signup_res.json()
    assert user_data["email"] == "jane.doe@example.com"
    assert user_data["full_name"] == "Jane Doe"
    assert user_data["role"] == "patient"
    assert "id" in user_data

    # 2. Login with correct credentials
    login_payload = {
        "email": "jane.doe@example.com",
        "password": "SecurePassword123!",
    }
    login_res = client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["id"] == user_data["id"]
    assert login_data["email"] == "jane.doe@example.com"


def test_login_invalid_password(client):
    signup_payload = {
        "email": "john.smith@example.com",
        "password": "CorrectPassword123!",
        "full_name": "John Smith",
    }
    client.post("/api/v1/auth/signup", json=signup_payload)

    # Attempt login with wrong password
    bad_login = {
        "email": "john.smith@example.com",
        "password": "WrongPassword999!",
    }
    res = client.post("/api/v1/auth/login", json=bad_login)
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."


def test_login_nonexistent_user(client):
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@example.com", "password": "AnyPassword123!"},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "Invalid email or password."
