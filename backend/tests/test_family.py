import uuid
import pytest
from app.models.user import User
from app.models.family_relationship import FamilyRelationship
from app.models.claim_request import ClaimRequest
from app.models.report import Report
from app.models.report_result import ReportResult


def test_link_family_member_bidirectional_success(client, db_session):
    # 1. Create two users: Father (male) and Child (female)
    user_father = User(
        email="dad@test.com",
        password_hash="fakehash",
        full_name="Dad User",
        gender="male",
        role="patient",
    )
    user_daughter = User(
        email="daughter@test.com",
        password_hash="fakehash",
        full_name="Daughter User",
        gender="female",
        role="patient",
    )
    db_session.add_all([user_father, user_daughter])
    db_session.commit()
    db_session.refresh(user_father)
    db_session.refresh(user_daughter)

    # 2. Daughter links dad as father
    link_payload = {
        "user_id": str(user_daughter.id),
        "relative_user_id": str(user_father.id),
        "relationship_type": "father",
    }
    response = client.post("/api/v1/family/link", json=link_payload)
    assert response.status_code == 201
    data = response.json()
    assert data["relative_id"] == str(user_father.id)
    assert data["relationship_type"] == "father"
    assert data["tier"] == "parents"
    assert data["badge_code"] == "F"
    rel_id = data["relationship_id"]

    # 3. Verify Dad's side automatically has daughter as daughter (inferred from female gender)
    dad_relatives = client.get(f"/api/v1/family/{user_father.id}").json()
    assert len(dad_relatives) == 1
    assert dad_relatives[0]["relative_id"] == str(user_daughter.id)
    assert dad_relatives[0]["relationship_type"] == "daughter"
    assert dad_relatives[0]["tier"] == "children"
    assert dad_relatives[0]["badge_code"] == "DAU"

    # 4. Unlink from daughter side — should sever both sides atomically
    del_res = client.delete(f"/api/v1/family/{rel_id}")
    assert del_res.status_code == 204

    # 5. Confirm both lists are empty
    assert len(client.get(f"/api/v1/family/{user_daughter.id}").json()) == 0
    assert len(client.get(f"/api/v1/family/{user_father.id}").json()) == 0


def test_link_family_member_gender_unspecified_fallback(client, db_session):
    # 1. Create two users with gender unspecified/omitted
    user_parent = User(
        email="parent_unspec@test.com",
        password_hash="fakehash",
        full_name="Alex Parent",
        gender="unspecified",
        role="patient",
    )
    user_relative = User(
        email="relative_unspec@test.com",
        password_hash="fakehash",
        full_name="Morgan Kin",
        gender="unspecified",
        role="patient",
    )
    db_session.add_all([user_parent, user_relative])
    db_session.commit()
    db_session.refresh(user_parent)
    db_session.refresh(user_relative)

    # 2. Morgan links Alex as "parent"
    link_res = client.post("/api/v1/family/link", json={
        "user_id": str(user_relative.id),
        "relative_user_id": str(user_parent.id),
        "relationship_type": "parent",
    })
    assert link_res.status_code == 201
    forward_data = link_res.json()
    assert forward_data["relationship_type"] == "parent"
    assert forward_data["tier"] == "parents"
    assert forward_data["badge_code"] == "P"

    # 3. Verify Alex sees Morgan as neutral "child" because Morgan's gender is unspecified
    parent_list = client.get(f"/api/v1/family/{user_parent.id}").json()
    assert len(parent_list) == 1
    assert parent_list[0]["relative_id"] == str(user_relative.id)
    assert parent_list[0]["relationship_type"] == "child"
    assert parent_list[0]["tier"] == "children"
    assert parent_list[0]["badge_code"] == "CH"



def test_managed_placeholder_flow(client, db_session):
    manager = User(
        email="manager@test.com",
        password_hash="fakehash",
        full_name="Manager User",
        gender="female",
        role="patient",
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)

    # 1. Manager creates a placeholder for their father
    placeholder_payload = {
        "manager_user_id": str(manager.id),
        "full_name": "Elderly Dad",
        "relationship_type": "father",
        "gender": "male",
        "avatar_url": "https://example.com/avatar.jpg",
    }
    res = client.post("/api/v1/family/placeholder", json=placeholder_payload)
    assert res.status_code == 201
    placeholder_data = res.json()
    assert placeholder_data["is_placeholder"] is True
    assert placeholder_data["managed_by_user_id"] == str(manager.id)
    assert placeholder_data["can_edit"] is True
    assert placeholder_data["full_name"] == "Elderly Dad"
    placeholder_id = placeholder_data["relative_id"]

    # 2. Manager edits placeholder's full name and avatar
    update_payload = {
        "manager_user_id": str(manager.id),
        "full_name": "Grandpa Joe",
        "avatar_url": "https://example.com/new-avatar.png",
    }
    update_res = client.patch(f"/api/v1/family/member/{placeholder_id}", json=update_payload)
    assert update_res.status_code == 200
    assert update_res.json()["full_name"] == "Grandpa Joe"
    assert update_res.json()["avatar_url"] == "https://example.com/new-avatar.png"

    # 3. Unauthorized other user cannot edit the placeholder
    other_user = User(
        email="stranger@test.com",
        password_hash="fakehash",
        full_name="Stranger",
    )
    db_session.add(other_user)
    db_session.commit()
    db_session.refresh(other_user)

    unauth_payload = {
        "manager_user_id": str(other_user.id),
        "full_name": "Hacked Name",
    }
    unauth_res = client.patch(f"/api/v1/family/member/{placeholder_id}", json=unauth_payload)
    assert unauth_res.status_code == 403

    # 4. Hierarchical tree endpoint returns correct tree tiers
    tree_res = client.get(f"/api/v1/family/{manager.id}/tree")
    assert tree_res.status_code == 200
    tree_data = tree_res.json()
    assert tree_data["self_node"]["full_name"] == "Manager User"
    assert len(tree_data["parents"]) == 1
    assert tree_data["parents"][0]["full_name"] == "Grandpa Joe"
    assert tree_data["parents"][0]["is_placeholder"] is True


def test_claim_flow_approve_merge(client, db_session):
    # 1. Manager creates a placeholder
    manager = User(
        email="mom@test.com",
        password_hash="fakehash",
        full_name="Mom Manager",
        gender="female",
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)

    create_res = client.post("/api/v1/family/placeholder", json={
        "manager_user_id": str(manager.id),
        "full_name": "Son Timmy Placeholder",
        "relationship_type": "son",
        "gender": "male",
    })
    assert create_res.status_code == 201
    placeholder_id = create_res.json()["relative_id"]

    # Ingest a mock lab report under the placeholder profile
    report = Report(
        user_id=uuid.UUID(placeholder_id),
        original_filename="blood_test.pdf",
        file_mime_type="application/pdf",
        status="done",
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    result_item = ReportResult(
        report_id=report.id,
        raw_test_name="Fasting Glucose",
        canonical_test_name="Fasting Blood Sugar",
        value="95",
        numeric_value=95.0,
        unit="mg/dL",
        abnormality_flag="normal",
    )
    db_session.add(result_item)
    db_session.commit()

    # 2. Real Timmy signs up and inputs the placeholder UUID
    signup_payload = {
        "email": "timmy.real@gmail.com",
        "password": "Password123!",
        "full_name": "Timmy Real User",
        "gender": "male",
        "claim_uuid": placeholder_id,
    }
    signup_res = client.post("/api/v1/auth/signup", json=signup_payload)
    assert signup_res.status_code == 201
    signup_data = signup_res.json()
    assert signup_data["is_pending_claim"] is True
    claim_id = signup_data["claim_id"]
    claimant_id = signup_data["id"]

    # 3. Manager checks pending claims
    claims_res = client.get(f"/api/v1/claims/pending/{manager.id}")
    assert claims_res.status_code == 200
    pending_list = claims_res.json()
    assert len(pending_list) == 1
    assert pending_list[0]["claimant_email"] == "timmy.real@gmail.com"

    # 4. Manager approves claim -> Atomic Merge
    approve_res = client.post(f"/api/v1/claims/{claim_id}/approve", json={"user_id": str(manager.id)})
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 5. Verify placeholder profile is now owned by Timmy with his email and password
    merged_placeholder = db_session.get(User, uuid.UUID(placeholder_id))
    assert merged_placeholder.is_placeholder is False
    assert merged_placeholder.managed_by_user_id is None
    assert merged_placeholder.email == "timmy.real@gmail.com"

    # 6. Verify temporary claimant row is deleted
    assert db_session.get(User, uuid.UUID(claimant_id)) is None

    # 7. Timmy logs in with his email and password -> lands on the placeholder's original UUID!
    login_res = client.post("/api/v1/auth/login", json={
        "email": "timmy.real@gmail.com",
        "password": "Password123!",
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert login_data["id"] == placeholder_id
    assert login_data["is_pending_claim"] is False

    # 8. Historical reports remain intact under Timmy's active UUID
    tree_res = client.get(f"/api/v1/family/{placeholder_id}/tree")
    assert tree_res.status_code == 200
    assert tree_res.json()["self_node"]["health_status"]["status"] == "normal"


def test_claim_flow_abandon(client, db_session):
    manager = User(
        email="manager2@test.com",
        password_hash="fakehash",
        full_name="Manager Two",
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)

    create_res = client.post("/api/v1/family/placeholder", json={
        "manager_user_id": str(manager.id),
        "full_name": "Cousin Bob Placeholder",
        "relationship_type": "brother",
    })
    placeholder_id = create_res.json()["relative_id"]

    # Bob signs up to claim
    signup_res = client.post("/api/v1/auth/signup", json={
        "email": "bob@gmail.com",
        "password": "Password123!",
        "full_name": "Bob Real",
        "claim_uuid": placeholder_id,
    })
    claim_id = signup_res.json()["claim_id"]
    claimant_id = signup_res.json()["id"]

    # Bob decides to abandon claim and create a clean independent account instead
    abandon_res = client.post(f"/api/v1/claims/{claim_id}/abandon", json={"user_id": claimant_id})
    assert abandon_res.status_code == 200
    assert abandon_res.json()["status"] == "abandoned"

    # Verify Bob still exists as an independent user
    bob_user = db_session.get(User, uuid.UUID(claimant_id))
    assert bob_user is not None
    assert bob_user.email == "bob@gmail.com"

    # Verify placeholder is still managed by Manager Two
    placeholder_user = db_session.get(User, uuid.UUID(placeholder_id))
    assert placeholder_user.is_placeholder is True
    assert placeholder_user.managed_by_user_id == manager.id


def test_claim_flow_reject(client, db_session):
    manager = User(
        email="manager_rej@test.com",
        password_hash="fakehash",
        full_name="Manager Rejector",
    )
    db_session.add(manager)
    db_session.commit()
    db_session.refresh(manager)

    create_res = client.post("/api/v1/family/placeholder", json={
        "manager_user_id": str(manager.id),
        "full_name": "Sister Sarah Placeholder",
        "relationship_type": "sister",
    })
    placeholder_id = create_res.json()["relative_id"]

    # Imposter/Wrong user attempts to claim
    signup_res = client.post("/api/v1/auth/signup", json={
        "email": "imposter@gmail.com",
        "password": "Password123!",
        "full_name": "Imposter Sarah",
        "claim_uuid": placeholder_id,
    })
    claim_id = signup_res.json()["claim_id"]

    # Manager rejects claim
    reject_res = client.post(f"/api/v1/claims/{claim_id}/reject", json={"user_id": str(manager.id)})
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"

    # Verify placeholder is still intact and managed by Manager
    placeholder_user = db_session.get(User, uuid.UUID(placeholder_id))
    assert placeholder_user.is_placeholder is True
    assert placeholder_user.managed_by_user_id == manager.id
    assert placeholder_user.email != "imposter@gmail.com"

    # Verify claimant has no active pending claims and remains locked out of placeholder
    claimant_id = signup_res.json()["id"]
    claimant_claims = client.get(f"/api/v1/claims/pending/{claimant_id}").json()
    assert len(claimant_claims) == 0  # No longer pending

    # Verify claimant login returns their own claimant ID, NOT the placeholder ID
    login_res = client.post("/api/v1/auth/login", json={
        "email": "imposter@gmail.com",
        "password": "Password123!",
    })
    assert login_res.status_code == 200
    assert login_res.json()["id"] == claimant_id
    assert login_res.json()["id"] != placeholder_id


def test_cannot_edit_independent_linked_relative(client, db_session):
    # Two independent accounts linked as father and daughter
    father = User(
        email="indep_father@test.com",
        password_hash="fakehash",
        full_name="Independent Father",
        is_placeholder=False,
    )
    daughter = User(
        email="indep_daughter@test.com",
        password_hash="fakehash",
        full_name="Independent Daughter",
        is_placeholder=False,
    )
    db_session.add_all([father, daughter])
    db_session.commit()
    db_session.refresh(father)
    db_session.refresh(daughter)

    # Link them
    client.post("/api/v1/family/link", json={
        "user_id": str(father.id),
        "relative_user_id": str(daughter.id),
        "relationship_type": "daughter",
    })

    # Father attempts to edit daughter's profile/avatar -> MUST receive 403 Forbidden
    hack_res = client.patch(f"/api/v1/family/member/{daughter.id}", json={
        "manager_user_id": str(father.id),
        "full_name": "Overwritten Daughter Name",
        "avatar_url": "https://example.com/hacked.png",
    })
    assert hack_res.status_code == 403
    assert "You do not have permission to edit this profile" in hack_res.json()["detail"]

    # Verify daughter's name was NOT modified in the database
    daughter_in_db = db_session.get(User, daughter.id)
    assert daughter_in_db.full_name == "Independent Daughter"

