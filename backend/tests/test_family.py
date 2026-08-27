import uuid
import pytest
from app.models.user import User
from app.models.family_relationship import FamilyRelationship


def test_link_family_member_success(client, db_session):
    # 1. Create two users
    user_a = User(
        email="parent@test.com",
        password_hash="fakehash",
        full_name="Parent User",
        role="patient",
    )
    user_b = User(
        email="child@test.com",
        password_hash="fakehash",
        full_name="Child User",
        role="patient",
    )
    db_session.add_all([user_a, user_b])
    db_session.commit()
    db_session.refresh(user_a)
    db_session.refresh(user_b)

    # 2. Link user_b as daughter to user_a
    link_payload = {
        "user_id": str(user_a.id),
        "relative_user_id": str(user_b.id),
        "relationship_type": "daughter",
    }
    response = client.post("/api/v1/family/link", json=link_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["relative_id"] == str(user_b.id)
    assert data["full_name"] == "Child User"
    assert data["relationship_type"] == "daughter"
    rel_id = data["relationship_id"]

    # 3. Fetch family list for user_a
    get_res = client.get(f"/api/v1/family/{user_a.id}")
    assert get_res.status_code == 200
    relatives = get_res.json()
    assert len(relatives) == 1
    assert relatives[0]["relative_id"] == str(user_b.id)
    assert relatives[0]["relationship_type"] == "daughter"

    # 4. Unlink the relationship
    del_res = client.delete(f"/api/v1/family/{rel_id}")
    assert del_res.status_code == 204

    # 5. Confirm list is now empty
    get_after = client.get(f"/api/v1/family/{user_a.id}")
    assert len(get_after.json()) == 0


def test_link_self_fails(client, db_session):
    user = User(
        email="lonely@test.com",
        password_hash="fakehash",
        full_name="Self Linker",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    link_payload = {
        "user_id": str(user.id),
        "relative_user_id": str(user.id),
        "relationship_type": "brother",
    }
    res = client.post("/api/v1/family/link", json=link_payload)
    assert res.status_code == 400
    assert "Cannot link a user to themselves" in res.json()["detail"]


def test_link_nonexistent_user(client, db_session):
    user = User(
        email="real@test.com",
        password_hash="fakehash",
        full_name="Real User",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    link_payload = {
        "user_id": str(user.id),
        "relative_user_id": str(uuid.uuid4()),
        "relationship_type": "spouse",
    }
    res = client.post("/api/v1/family/link", json=link_payload)
    assert res.status_code == 404
    assert "Target relative User ID does not exist" in res.json()["detail"]
