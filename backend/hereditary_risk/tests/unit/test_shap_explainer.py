"""
Unit tests for Layer 3 SHAP Explainer Subsystem.
"""

import pytest
from hereditary_risk.app.ml.shap_explainer import explain_ml_prediction
from hereditary_risk.app.ml.xgb_engine import load_disease_model


class TestSHAPExplainer:
    """Test suite for SHAP feature importance explanation generation."""

    def test_explain_ml_prediction_with_trained_model(self):
        artifact = load_disease_model("type_2_diabetes")
        assert artifact is not None
        model = artifact["model"]
        feature_names = artifact["feature_names"]

        feature_values = {
            "hba1c": 7.5,
            "fasting_glucose": 140.0,
            "postprandial_glucose": 180.0,
            "triglycerides": 220.0,
            "self_rule_score": 1.0,
            "family_weighted_risk": 0.5,
            "combined_hereditary_score": 0.8,
        }

        res = explain_ml_prediction(
            model=model,
            feature_names=feature_names,
            feature_values=feature_values,
            prediction_probability=0.82,
        )

        assert res["prediction_probability"] == 0.82
        assert res["explainer_type"] in ("shap_tree", "tree_importance_fallback", "rule_based_fallback")
        assert len(res["all_feature_contributions"]) == len(feature_names)
        assert isinstance(res["top_positive_features"], list)
        assert isinstance(res["top_negative_features"], list)

    def test_explain_ml_prediction_fallback_without_model(self):
        res = explain_ml_prediction(
            model=None,
            feature_names=["hba1c", "fasting_glucose"],
            feature_values={"hba1c": 7.0, "fasting_glucose": 130.0},
            prediction_probability=0.75,
        )

        assert res["explainer_type"] == "rule_based_fallback"
        assert res["prediction_probability"] == 0.75
        assert len(res["all_feature_contributions"]) == 2
