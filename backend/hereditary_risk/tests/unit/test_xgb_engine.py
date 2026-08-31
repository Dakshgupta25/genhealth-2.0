"""
Unit tests for Layer 3 XGBoost ML Inference Engine.
"""

import pytest
from hereditary_risk.app.ml.xgb_engine import predict_disease_ml, load_disease_model


class TestXGBEngine:
    """Test suite for Layer 3 ML prediction logic."""

    @pytest.mark.parametrize(
        "disease_key",
        [
            "type_2_diabetes",
            "dyslipidemia",
            "hypothyroidism",
            "ckd",
            "anemia",
            "liver_disease",
        ]
    )
    def test_ml_prediction_all_diseases(self, disease_key: str):
        self_biomarkers = {
            "hba1c": 6.8,
            "fasting_glucose": 130.0,
            "total_cholesterol": 240.0,
            "ldl": 160.0,
            "hdl": 35.0,
            "triglycerides": 210.0,
            "tsh": 8.5,
            "creatinine": 1.5,
            "egfr": 55.0,
            "hemoglobin": 10.2,
            "alt": 75.0,
            "ast": 68.0,
        }

        res = predict_disease_ml(
            disease_key=disease_key,
            self_biomarkers=self_biomarkers,
            self_rule_score=0.8,
            family_weighted_risk=0.5,
            combined_hereditary_score=0.68,
        )

        assert res["disease_key"] == disease_key
        assert res["ml_available"] is True
        assert 0.0 <= res["probability"] <= 1.0
        assert len(res["feature_names"]) > 0
        assert len(res["feature_values"]) == len(res["feature_names"])

    def test_missing_feature_imputation(self):
        # Provide empty biomarkers map
        res = predict_disease_ml(
            disease_key="type_2_diabetes",
            self_biomarkers={},
            self_rule_score=0.0,
            family_weighted_risk=0.0,
            combined_hereditary_score=0.0,
        )

        assert res["ml_available"] is True
        # Verify fasting_glucose imputed with population median (95.0)
        assert "fasting_glucose" in res["feature_values"]
        assert res["feature_values"]["fasting_glucose"] == 95.0

    def test_fallback_on_invalid_disease(self):
        res = predict_disease_ml(
            disease_key="non_existent_disease",
            self_biomarkers={},
            self_rule_score=0.5,
            family_weighted_risk=0.5,
            combined_hereditary_score=0.5,
        )

        assert res["ml_available"] is False
        assert res["probability"] is None
