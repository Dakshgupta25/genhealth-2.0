"""
API Integration Tests for Hereditary Risk Engine Router.
Uses FastAPI TestClient against standalone app instance in main.py.
"""

import pytest
from fastapi.testclient import TestClient

from hereditary_risk.main import app
from hereditary_risk.app.config.settings import settings

client = TestClient(app)
TEST_API_KEY = "test-standalone-api-key-12345"
AUTH_HEADERS = {"X-API-Key": TEST_API_KEY}


@pytest.fixture(autouse=True)
def configure_test_api_key(monkeypatch):
    """Ensure standalone API key is configured by default for route integration tests."""
    monkeypatch.setattr(settings, "HEREDITARY_RISK_API_KEY", TEST_API_KEY)


class TestHereditaryRiskAPIRoutes:
    def test_root_and_health_check(self):
        r1 = client.get("/")
        assert r1.status_code == 200
        assert r1.json()["service"] == "Hereditary Risk Engine"

        r2 = client.get("/health")
        assert r2.status_code == 200
        assert r2.json()["status"] == "ok"

    def test_fail_closed_when_api_key_not_configured(self, monkeypatch):
        """SEC-FAIL-CLOSED: Unconfigured API key must reject requests with HTTP 503 Service Unavailable."""
        monkeypatch.setattr(settings, "HEREDITARY_RISK_API_KEY", None)
        payload = {"raw_name": "Hb A1c", "value": "5.8", "unit": "%"}

        res = client.post("/api/v1/hereditary-risk/normalize", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 503
        assert "fail-closed mode" in res.json()["detail"]

    def test_normalize_endpoint_matched(self):
        payload = {
            "raw_name": "Hb A1c",
            "value": "5.8",
            "unit": "%"
        }
        res = client.post("/api/v1/hereditary-risk/normalize", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "matched"
        assert data["canonical_key"] == "hba1c"
        assert data["numeric_value"] == 5.8
        assert data["unit_match"] is True

    def test_normalize_endpoint_unknown(self):
        payload = {
            "raw_name": "Unknown Laboratory Test 99",
            "value": "100"
        }
        res = client.post("/api/v1/hereditary-risk/normalize", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "unknown"
        assert data["canonical_key"] is None

    def test_predict_endpoint_valid_full_family(self):
        payload = {
            "user_id": "patient-123",
            "patient_name": "Priyanshu",
            "self_biomarkers": [
                {"raw_name": "HbA1c", "value": "5.8", "unit": "%"},
                {"raw_name": "Fasting Blood Sugar", "value": "102", "unit": "mg/dL"}
            ],
            "family_members": [
                {
                    "member_id": "father-1",
                    "relationship": "father",
                    "biomarkers": [
                        {"raw_name": "hb a1c", "value": "7.2", "unit": "%"},
                        {"raw_name": "FBS", "value": "145", "unit": "mg/dL"}
                    ]
                },
                {
                    "member_id": "mother-1",
                    "relationship": "mother",
                    "biomarkers": [
                        {"raw_name": "HbA1c", "value": "5.2", "unit": "%"}
                    ]
                },
                {
                    "member_id": "spouse-1",
                    "relationship": "spouse",
                    "biomarkers": [
                        {"raw_name": "HbA1c", "value": "8.0", "unit": "%"}
                    ]
                }
            ],
            "target_diseases": ["type_2_diabetes", "dyslipidemia"]
        }

        res = client.post("/api/v1/hereditary-risk/predict", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()

        assert data["user_id"] == "patient-123"
        assert "type_2_diabetes" in data["diseases"]
        assert "dyslipidemia" in data["diseases"]

        t2d = data["diseases"]["type_2_diabetes"]
        assert t2d["risk_score"] > 0.0
        assert t2d["risk_label"] in ("MODERATE", "HIGH")
        assert len(t2d["family_breakdown"]) == 3
        assert "Your lab results score:" in t2d["transparent_formula"]
        assert t2d["is_sufficient_data"] is True
        assert t2d["data_sufficiency_status"] == "SUFFICIENT"
        assert len(t2d["primary_clinical_biomarkers"]) > 0
        assert len(t2d["ml_feature_biomarkers"]) > 0

        dq = data["data_quality"]
        assert dq["total_biomarkers_provided"] == 6
        assert dq["family_members_count"] == 3

    def test_predict_endpoint_invalid_target_disease(self):
        payload = {
            "user_id": "patient-123",
            "self_biomarkers": [{"raw_name": "HbA1c", "value": "5.8"}],
            "target_diseases": ["non_existent_disease_xyz"]
        }
        res = client.post("/api/v1/hereditary-risk/predict", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 400
        assert "None of the provided target_diseases are supported" in res.json()["detail"]

    def test_data_sufficiency_gating(self):
        """
        Verify that missing mandatory anchor biomarkers flags INSUFFICIENT_DATA status
        with actionable guidance message.
        """
        # Hypothyroidism missing TSH (only secondary T3 provided)
        payload = {
            "user_id": "patient-insuff-1",
            "self_biomarkers": [{"raw_name": "Triiodothyronine", "value": "110", "unit": "ng/dL"}],
            "target_diseases": ["hypothyroidism", "type_2_diabetes"]
        }
        res = client.post("/api/v1/hereditary-risk/predict", json=payload, headers=AUTH_HEADERS)
        assert res.status_code == 200
        data = res.json()

        hypo = data["diseases"]["hypothyroidism"]
        assert hypo["is_sufficient_data"] is False
        assert hypo["data_sufficiency_status"] == "INSUFFICIENT_DATA"
        assert "tsh" in hypo["missing_mandatory_biomarkers"]
        assert "add tsh" in hypo["sufficiency_message"].lower()

        t2d = data["diseases"]["type_2_diabetes"]
        assert t2d["is_sufficient_data"] is False
        assert t2d["data_sufficiency_status"] == "INSUFFICIENT_DATA"
        assert "fasting_glucose or hba1c" in t2d["missing_mandatory_biomarkers"]

    def test_api_key_auth_enforcement_when_configured(self, monkeypatch):
        monkeypatch.setattr(settings, "HEREDITARY_RISK_API_KEY", "secret-test-key-999")

        payload = {"raw_name": "Hb A1c", "value": "5.8", "unit": "%"}

        # Missing header -> 401
        res_unauth = client.post("/api/v1/hereditary-risk/normalize", json=payload)
        assert res_unauth.status_code == 401
        assert "Invalid or missing X-API-Key" in res_unauth.json()["detail"]

        # Wrong header -> 401
        res_wrong = client.post(
            "/api/v1/hereditary-risk/normalize",
            json=payload,
            headers={"X-API-Key": "wrong-key"}
        )
        assert res_wrong.status_code == 401

        # Correct header -> 200
        res_ok = client.post(
            "/api/v1/hereditary-risk/normalize",
            json=payload,
            headers={"X-API-Key": "secret-test-key-999"}
        )
        assert res_ok.status_code == 200
        assert res_ok.json()["status"] == "matched"

