"""
API Integration Tests for Hereditary Risk Engine Router.
Uses FastAPI TestClient against standalone app instance in main.py.
"""

import pytest
from fastapi.testclient import TestClient

from hereditary_risk.main import app

client = TestClient(app)


class TestHereditaryRiskAPIRoutes:
    def test_root_and_health_check(self):
        r1 = client.get("/")
        assert r1.status_code == 200
        assert r1.json()["service"] == "Hereditary Risk Engine"

        r2 = client.get("/health")
        assert r2.status_code == 200
        assert r2.json()["status"] == "ok"

    def test_normalize_endpoint_matched(self):
        payload = {
            "raw_name": "Hb A1c",
            "value": "5.8",
            "unit": "%"
        }
        res = client.post("/api/v1/hereditary-risk/normalize", json=payload)
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
        res = client.post("/api/v1/hereditary-risk/normalize", json=payload)
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

        res = client.post("/api/v1/hereditary-risk/predict", json=payload)
        assert res.status_code == 200
        data = res.json()

        assert data["user_id"] == "patient-123"
        assert "type_2_diabetes" in data["diseases"]
        assert "dyslipidemia" in data["diseases"]

        t2d = data["diseases"]["type_2_diabetes"]
        assert t2d["risk_score"] > 0.0
        assert t2d["risk_label"] in ("MODERATE", "HIGH")
        assert len(t2d["family_breakdown"]) == 3
        assert "Combined Risk =" in t2d["transparent_formula"]

        dq = data["data_quality"]
        assert dq["total_biomarkers_provided"] == 6
        assert dq["family_members_count"] == 3

    def test_predict_endpoint_invalid_target_disease(self):
        payload = {
            "user_id": "patient-123",
            "self_biomarkers": [{"raw_name": "HbA1c", "value": "5.8"}],
            "target_diseases": ["non_existent_disease_xyz"]
        }
        res = client.post("/api/v1/hereditary-risk/predict", json=payload)
        assert res.status_code == 400
        assert "None of the provided target_diseases are supported" in res.json()["detail"]
