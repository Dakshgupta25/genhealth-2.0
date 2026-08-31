"""
Host Integration Tests for Hereditary Risk Module into GenHealth Application.

Validates end-to-end integration between host SQLite database models,
adapters, API routes, security authentication/authorization, and the hereditary risk engine.
"""

import uuid
import pytest
from fastapi.testclient import TestClient

from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.family_relationship import FamilyRelationship
from app.dependencies.auth import create_access_token


class TestHereditaryIntegration:
    """Suite of integration tests for the mounted hereditary risk engine."""

    def test_get_hereditary_disease_registry(self, client: TestClient):
        """Verify registry endpoint returns supported disease categories."""
        response = client.get("/api/v1/hereditary-risk/diseases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 6
        disease_keys = [d["disease_key"] for d in data]
        assert "type_2_diabetes" in disease_keys
        assert "hypothyroidism" in disease_keys
        assert "ckd" in disease_keys

    def test_unauthenticated_assessment_returns_401(self, client: TestClient):
        """SEC-1 Verification: Unauthenticated request to patient assessment must return 401."""
        random_uuid = uuid.uuid4()
        response = client.get(f"/api/v1/hereditary-risk/patient/{random_uuid}/assessment")
        assert response.status_code == 401
        assert "Authentication required" in response.json()["detail"]

    def test_idor_unauthorized_patient_access_returns_403(self, client: TestClient, db_session):
        """SEC-1 IDOR Verification: User A requesting User B's assessment without authorization must return 403."""
        user_a = User(id=uuid.uuid4(), email="usera@genhealth.ai", password_hash="pw", full_name="User A")
        user_b = User(id=uuid.uuid4(), email="userb@genhealth.ai", password_hash="pw", full_name="User B")
        db_session.add_all([user_a, user_b])
        db_session.commit()

        token_a = create_access_token(user_a.id)
        response = client.get(
            f"/api/v1/hereditary-risk/patient/{user_b.id}/assessment",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert response.status_code == 403
        assert "not authorized" in response.json()["detail"]

    def test_patient_hereditary_assessment_end_to_end(self, client: TestClient, db_session):
        """Verify full assessment execution for patient with lab results and family tree."""
        # 1. Create Patient
        patient = User(
            id=uuid.uuid4(),
            email="patient.test@genhealth.ai",
            password_hash="hashed_pw",
            full_name="Jane Test Patient",
            gender="female",
        )

        # 2. Create Father
        father = User(
            id=uuid.uuid4(),
            email="father.test@genhealth.ai",
            password_hash="hashed_pw",
            full_name="John Test Father",
            gender="male",
        )

        db_session.add_all([patient, father])
        db_session.commit()

        # 3. Create Patient Report & Results (Elevated Fasting Glucose & Hemoglobin)
        p_report = Report(
            id=uuid.uuid4(),
            user_id=patient.id,
            original_filename="patient_lab.pdf",
            file_mime_type="application/pdf",
        )
        db_session.add(p_report)
        db_session.flush()

        r1 = ReportResult(
            report_id=p_report.id,
            raw_test_name="Fasting Blood Glucose",
            canonical_test_name="fasting_glucose",
            value="145.0",
            numeric_value=145.0,
            unit="mg/dL",
            abnormality_flag="high",
        )
        r2 = ReportResult(
            report_id=p_report.id,
            raw_test_name="Hemoglobin",
            canonical_test_name="hemoglobin",
            value="14.2",
            numeric_value=14.2,
            unit="g/dL",
            abnormality_flag="normal",
        )
        db_session.add_all([r1, r2])

        # 4. Create Father Report & Results (High Fasting Glucose)
        f_report = Report(
            id=uuid.uuid4(),
            user_id=father.id,
            original_filename="father_lab.pdf",
            file_mime_type="application/pdf",
        )
        db_session.add(f_report)
        db_session.flush()

        fr1 = ReportResult(
            report_id=f_report.id,
            raw_test_name="Fasting Glucose",
            canonical_test_name="fasting_glucose",
            value="150.0",
            numeric_value=150.0,
            unit="mg/dL",
            abnormality_flag="high",
        )
        db_session.add(fr1)

        # 5. Link Father to Patient
        rel = FamilyRelationship(
            user_id=patient.id,
            relative_user_id=father.id,
            relationship_type="father",
            share_clinical_data=True,
        )
        db_session.add(rel)
        db_session.commit()

        token = create_access_token(patient.id)

        # 6. Call Integrated API Endpoint with Auth Header
        response = client.get(
            f"/api/v1/hereditary-risk/patient/{patient.id}/assessment",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200, response.text
        data = response.json()

        assert "diseases" in data
        assert "data_quality" in data
        assert data["user_id"] == str(patient.id)

        t2d_res = data["diseases"]["type_2_diabetes"]
        assert t2d_res["disease_key"] == "type_2_diabetes"
        assert t2d_res["model_version"] == "2.0.0-real-calibrated"
        assert t2d_res["rule_based_risk_score"] > 0.0
        assert t2d_res["family_weighted_risk"] > 0.0
        assert t2d_res["heuristic_combined_risk_signal"] > 0.0
        assert t2d_res["ml_available"] is True
        assert t2d_res["ml_probability_estimate"] is not None
        assert "fasting_glucose" in t2d_res["observed_features"]

    def test_nonexistent_patient_id_returns_404(self, client: TestClient, db_session):
        """Verify requesting assessment for a non-existent UUID returns 404 when authenticated as existing user."""
        admin = User(id=uuid.uuid4(), email="admin.test@genhealth.ai", password_hash="hashed_pw", full_name="Admin")
        db_session.add(admin)
        db_session.commit()

        token = create_access_token(admin.id)
        random_uuid = uuid.uuid4()

        response = client.get(
            f"/api/v1/hereditary-risk/patient/{random_uuid}/assessment",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 404
        assert "does not exist" in response.json()["detail"]

    def test_missing_family_data_fallback(self, client: TestClient, db_session):
        """Verify risk computation works cleanly when patient has zero linked family members."""
        patient = User(
            id=uuid.uuid4(),
            email="solo.patient@genhealth.ai",
            password_hash="hashed_pw",
            full_name="Solo Patient",
            gender="male",
        )
        db_session.add(patient)
        db_session.commit()

        token = create_access_token(patient.id)
        response = client.get(
            f"/api/v1/hereditary-risk/patient/{patient.id}/assessment",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        data = response.json()
        t2d_res = data["diseases"]["type_2_diabetes"]
        assert t2d_res["family_weighted_risk"] == 0.0
        assert t2d_res["heuristic_combined_risk_signal"] >= 0.0

    def test_existing_genhealth_routes_remain_functional(self, client: TestClient):
        """Verify host application existing routes are unaffected by integration."""
        assert client.get("/health").status_code == 200
        assert client.get("/").status_code == 200
        assert client.get("/api/v1/clinical/diseases").status_code == 200
