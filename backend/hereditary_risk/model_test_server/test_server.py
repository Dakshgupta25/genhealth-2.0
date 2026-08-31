"""
Automated Test Suite for Standalone Model Testing Playground.

Tests server endpoints, model loading, schema validation, extreme values,
and direct Python vs. HTTP inference reproducibility.
"""

import pytest
from fastapi.testclient import TestClient
import numpy as np

from hereditary_risk.model_test_server.app import app
from hereditary_risk.model_test_server.model_loader import discover_and_load_all_models, get_model_artifact
from hereditary_risk.model_test_server.predictor import run_playground_prediction

client = TestClient(app)


class TestModelTestingPlayground:
    """Automated test suite for the isolated model testing server."""

    def test_health_endpoint(self):
        """Verify /health returns 200 and loads all 6 model artifacts."""
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["models_loaded"] >= 6
        assert "type_2_diabetes" in data["loaded_diseases"]

    def test_models_registry_endpoint(self):
        """Verify /api/models returns dynamic list of model schemas."""
        res = client.get("/api/models")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert data["models_count"] >= 6

        diseases = [m["disease_key"] for m in data["models"]]
        assert "type_2_diabetes" in diseases
        assert "ckd" in diseases
        assert "anemia" in diseases
        assert "liver_disease" in diseases

    def test_presets_endpoint(self):
        """Verify /api/presets returns synthetic preset test cases."""
        res = client.get("/api/presets")
        assert res.status_code == 200
        data = res.json()
        assert "presets" in data
        assert len(data["presets"]) >= 5

    def test_valid_prediction_type_2_diabetes(self):
        """Verify POST /api/predict executes inference for Type 2 Diabetes."""
        payload = {
            "disease": "type_2_diabetes",
            "features": {
                "fasting_glucose": 140.0,
                "fasting_insulin": 22.0,
                "bmi": 32.5,
                "resting_bp": 135.0,
                "age": 50.0,
            },
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["disease"] == "type_2_diabetes"
        assert data["prediction"] in [0, 1]
        assert 0.0 <= data["ml_probability_estimate"] <= 1.0
        assert data["explanation"]["explainer_type"] in ["shap_tree", "tree_importance_fallback", "rule_based_fallback"]
        assert len(data["explanation"]["all_feature_contributions"]) == 5

    def test_valid_prediction_ckd(self):
        """Verify POST /api/predict executes inference for CKD."""
        payload = {
            "disease": "ckd",
            "features": {
                "creatinine": 2.5,
                "bun": 40.0,
                "hemoglobin": 10.5,
                "fasting_glucose": 110.0,
            },
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["disease"] == "ckd"
        assert data["ml_probability_estimate"] > 0.50

    def test_unknown_disease_model(self):
        """Verify requesting inference for unknown disease returns 400."""
        payload = {
            "disease": "non_existent_disease",
            "features": {"fasting_glucose": 100.0},
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 400
        assert "not available" in res.json()["detail"]

    def test_missing_feature_imputation(self):
        """Verify missing features are safely imputed using population reference medians."""
        payload = {
            "disease": "type_2_diabetes",
            "features": {
                "fasting_glucose": 150.0,
                # Other features omitted intentionally
            },
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert "fasting_glucose" in data["observed_features"]
        assert "bmi" in data["imputed_features"]
        assert data["features"]["bmi"] == 24.5 or data["features"]["bmi"] > 0.0

    def test_extreme_unplausible_values_validation(self):
        """Verify unplausible extreme values trigger validation warnings/errors."""
        payload = {
            "disease": "type_2_diabetes",
            "features": {
                "fasting_glucose": 99999.0,  # Impossible value
                "bmi": -10.0,  # Negative BMI
            },
        }
        res = client.post("/api/predict", json=payload)
        assert res.status_code == 400
        assert "Validation Errors" in res.json()["detail"]

    def test_direct_python_vs_http_inference_reproducibility(self):
        """
        Direct Python vs. HTTP API Comparison Test:
        Verifies that calling python predictor directly returns identical probability
        estimate to the HTTP API within numerical tolerance (< 1e-6).
        """
        features = {
            "fasting_glucose": 125.0,
            "fasting_insulin": 14.0,
            "bmi": 28.0,
            "resting_bp": 120.0,
            "age": 45.0,
        }

        # 1. Direct Python Execution
        direct_py_res = run_playground_prediction("type_2_diabetes", features)

        # 2. HTTP API Execution
        http_res = client.post(
            "/api/predict",
            json={"disease": "type_2_diabetes", "features": features},
        )
        assert http_res.status_code == 200
        http_data = http_res.json()

        # Compare outputs
        assert direct_py_res.prediction == http_data["prediction"]
        assert abs(direct_py_res.ml_probability_estimate - http_data["ml_probability_estimate"]) < 1e-6
        assert direct_py_res.explanation.explainer_type == http_data["explanation"]["explainer_type"]
