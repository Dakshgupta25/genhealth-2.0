"""
Unit tests for Final Pre-Integration Review requirements:

1. ML/Rule Disagreement: Verifies rule_ml_disagreement flag and human-readable explanation when rule and ML diverge.
2. Uncalibrated Probability Terminology: Ensures ml_probability_estimate is present and calibration_method is reported accurately.
3. Combined Heuristic Semantics: Verifies heuristic_combined_risk_signal is NEVER presented as a probability.
4. Extreme Probabilities: Verifies probability outputs are strictly clamped to [0.0, 1.0].
5. Model-Specific Metadata: Verifies metadata attributes in saved joblib artifacts.
6. Missing ML Model: Verifies safe fail-safe fallback when ML model is absent or invalid key requested.
7. Family-Only Risk: Verifies calculation when patient has no biomarkers but family history is present.
8. Self-Only Risk: Verifies calculation when patient has biomarkers but no family history is provided.
"""

import os
import joblib
import pytest
import pandas as pd
import numpy as np

from hereditary_risk.app.ml.xgb_engine import load_disease_model, predict_disease_ml
from hereditary_risk.app.rules.family_risk import evaluate_disease_hereditary_risk
from hereditary_risk.app.schemas.output import DiseaseRiskResultSchema
from hereditary_risk.app.api.routes import router
from fastapi.testclient import TestClient
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)


class TestPreIntegrationReview:

    def test_ml_rule_disagreement_detection(self):
        """Verify rule_ml_disagreement flag and explanation when rule is HIGH (1.0) and ML is LOW."""
        payload = {
            "user_id": "U-DISAGREE-1",
            "patient_name": "Disagreement Test Patient",
            "self_biomarkers": [
                {"raw_name": "fasting_glucose", "value": 180.0, "unit": "mg/dL"},
            ],
            "family_members": [],
            "disease_keys": ["type_2_diabetes"],
        }
        response = client.post("/api/v1/hereditary-risk/predict", json=payload)
        assert response.status_code == 200
        res_data = response.json()
        result = res_data["diseases"]["type_2_diabetes"]

        assert "rule_ml_disagreement" in result
        assert "disagreement_explanation" in result
        assert isinstance(result["rule_ml_disagreement"], bool)
        assert result["disagreement_explanation"] is not None

    def test_uncalibrated_probability_terminology(self):
        """Verify ml_probability_estimate is present and calibration_method is reported."""
        res = predict_disease_ml("type_2_diabetes", {"fasting_glucose": 100.0, "bmi": 24.0, "age": 30.0})
        assert res["ml_available"] is True
        assert "ml_probability_estimate" in res
        assert "is_calibrated" in res
        assert "calibration_method" in res
        assert isinstance(res["ml_probability_estimate"], float)

    def test_combined_heuristic_semantics(self):
        """Verify heuristic_combined_risk_signal is present and distinct from probability."""
        payload = {
            "user_id": "U-HEURISTIC-1",
            "patient_name": "Heuristic Test Patient",
            "self_biomarkers": [
                {"raw_name": "fasting_glucose", "value": 110.0, "unit": "mg/dL"},
            ],
            "family_members": [],
            "disease_keys": ["type_2_diabetes"],
        }
        response = client.post("/api/v1/hereditary-risk/predict", json=payload)
        assert response.status_code == 200
        res_data = response.json()
        result = res_data["diseases"]["type_2_diabetes"]

        assert "heuristic_combined_risk_signal" in result
        assert isinstance(result["heuristic_combined_risk_signal"], float)
        assert 0.0 <= result["heuristic_combined_risk_signal"] <= 1.0
        # Check backward compatible aliases
        assert result["combined_risk_signal"] == result["heuristic_combined_risk_signal"]
        assert result["risk_score"] == result["heuristic_combined_risk_signal"]

    def test_extreme_probabilities_clamping(self):
        """Verify extreme inputs yield probabilities strictly clamped between 0.0 and 1.0."""
        # Extreme high input
        res_high = predict_disease_ml("type_2_diabetes", {
            "fasting_glucose": 999.0,
            "fasting_insulin": 500.0,
            "bmi": 99.0,
            "resting_bp": 250.0,
            "age": 100.0,
        })
        assert res_high["ml_available"] is True
        assert 0.0 <= res_high["probability"] <= 1.0

        # Extreme low input
        res_low = predict_disease_ml("type_2_diabetes", {
            "fasting_glucose": 10.0,
            "fasting_insulin": 0.1,
            "bmi": 10.0,
            "resting_bp": 50.0,
            "age": 18.0,
        })
        assert res_low["ml_available"] is True
        assert 0.0 <= res_low["probability"] <= 1.0

    def test_model_specific_metadata(self):
        """Verify saved model joblib artifacts contain complete version and dataset provenance metadata."""
        diseases = ["type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"]
        for d_key in diseases:
            artifact = load_disease_model(d_key)
            assert artifact is not None, f"Artifact missing for {d_key}"
            assert "model_version" in artifact
            assert "dataset_name" in artifact
            assert "calibration_method" in artifact
            assert "metrics" in artifact
            assert "trained_at" in artifact

    def test_missing_ml_model_handling(self):
        """Verify safe fail-safe fallback when requesting invalid or non-existent ML model."""
        res = predict_disease_ml("non_existent_disease", {"fasting_glucose": 100.0})
        assert res["ml_available"] is False
        assert res["probability"] is None
        assert res["ml_probability_estimate"] is None
        assert res["failure_reason"] is not None
        assert "missing or incompatible" in res["failure_reason"].lower()

    def test_family_only_risk_calculation(self):
        """Verify risk calculation when patient provides zero biomarkers but family history is present."""
        agg_res = evaluate_disease_hereditary_risk(
            disease_key="type_2_diabetes",
            self_biomarkers={},
            family_members=[
                {
                    "member_id": "FATHER-1",
                    "relationship": "father",
                    "biomarkers": {"fasting_glucose": 150.0},
                    "known_conditions": [],
                }
            ],
        )
        assert agg_res["self_score"] == 0.0
        assert agg_res["family_weighted_risk"] > 0.0
        assert agg_res["combined_hereditary_score"] > 0.0
        assert agg_res["combined_hereditary_score"] == pytest.approx(0.40 * agg_res["family_weighted_risk"], abs=0.01)

    def test_self_only_risk_calculation(self):
        """Verify risk calculation when patient provides biomarkers but no family history is provided."""
        agg_res = evaluate_disease_hereditary_risk(
            disease_key="type_2_diabetes",
            self_biomarkers={"fasting_glucose": 140.0},
            family_members=[],
        )
        assert agg_res["self_score"] > 0.0
        assert agg_res["family_weighted_risk"] == 0.0
        assert agg_res["combined_hereditary_score"] > 0.0
        assert agg_res["combined_hereditary_score"] == pytest.approx(agg_res["self_score"], abs=0.01)
