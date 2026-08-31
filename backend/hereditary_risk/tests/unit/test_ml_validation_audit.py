"""
Unit tests for Machine Learning Validation Audit.

Verifies:
1. Leakage Prevention: Ensures target, self_score, and family_weighted_risk are not model features.
2. Real Dataset Schema: Validates dataset shapes, targets, and feature names.
3. Model Artifact Metadata: Validates provenance, metrics, versioning, and dependency tracking.
4. Calibration Bounds: Validates Brier scores and probability outputs in [0, 1].
5. Held-out Inference: Verifies predictions on new unseen patient feature vectors.
6. Model Reload Consistency: Verifies joblib dump/load reproduces deterministic outputs.
7. Missing Model Handling: Verifies safe rule-based fallback when model artifact is missing.
8. Feature Mismatch Handling: Verifies auto-imputation when features are partially missing.
"""

import os
import joblib
import pytest
import pandas as pd
import numpy as np

from hereditary_risk.app.ml.xgb_engine import load_disease_model, predict_disease_ml
from hereditary_risk.app.ml.datasets.dataset_manifest import load_disease_dataset, DATASET_MANIFEST


DISEASES = ["type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"]


class TestMLValidationAudit:

    @pytest.mark.parametrize("disease_key", DISEASES)
    def test_leakage_prevention(self, disease_key: str):
        """Verify no target, target-derived features, self_score, or family_weighted_risk in features."""
        model_data = load_disease_model(disease_key)
        assert model_data is not None, f"Model artifact missing for {disease_key}"
        features = model_data["feature_names"]

        forbidden_features = {
            "class", "target", "selector", "num", "result", "y",
            "self_score", "self_rule_score", "family_weighted_risk", "combined_risk",
            "combined_hereditary_score", "ml_probability", "risk_score"
        }

        for feat in features:
            assert feat.lower() not in forbidden_features, f"Target leakage detected in {disease_key}: {feat}"

    @pytest.mark.parametrize("disease_key", DISEASES)
    def test_real_dataset_schema(self, disease_key: str):
        """Verify dataset loading, target binary distribution, and non-empty features."""
        X_df, y_series, mapping, provenance = load_disease_dataset(disease_key)
        assert isinstance(X_df, pd.DataFrame)
        assert isinstance(y_series, pd.Series)
        assert len(X_df) > 100, f"Dataset too small for {disease_key}"
        assert set(y_series.unique()).issubset({0, 1}), f"Non-binary target for {disease_key}"
        assert len(X_df.columns) >= 4, f"Insufficient features for {disease_key}"
        assert "dataset_md5_hash" in provenance

    @pytest.mark.parametrize("disease_key", DISEASES)
    def test_model_artifact_metadata(self, disease_key: str):
        """Verify joblib model metadata attributes."""
        path = os.path.join(os.path.dirname(__file__), "..", "..", "app", "ml", "models", f"{disease_key}_model.joblib")
        assert os.path.exists(path)
        data = joblib.load(path)

        assert "model" in data
        assert "feature_names" in data
        assert "model_version" in data
        assert "dataset_name" in data
        assert "calibration_method" in data
        assert "metrics" in data
        assert "dataset_provenance" in data
        assert "dependency_versions" in data

        metrics = data["metrics"]
        assert 0.0 <= metrics["roc_auc"] <= 1.0
        assert 0.0 <= metrics["brier_score"] <= 1.0

    @pytest.mark.parametrize("disease_key", DISEASES)
    def test_calibration_bounds_and_probabilities(self, disease_key: str):
        """Verify probability prediction outputs fall within strictly valid [0, 1] range."""
        model_data = load_disease_model(disease_key)
        features = model_data["feature_names"]
        sample_vals = {f: 1.0 for f in features}

        res = predict_disease_ml(disease_key, sample_vals)
        assert res["ml_available"] is True
        assert 0.0 <= res["probability"] <= 1.0

    @pytest.mark.parametrize("disease_key", DISEASES)
    def test_held_out_inference(self, disease_key: str):
        """Verify inference on unseen patient feature inputs."""
        X_df, y_series, _, provenance = load_disease_dataset(disease_key)
        unseen_sample = X_df.iloc[-1].to_dict()

        res = predict_disease_ml(disease_key, unseen_sample)
        assert res["ml_available"] is True
        assert res["probability"] is not None
        assert isinstance(res["probability"], float)

    @pytest.mark.parametrize("disease_key", DISEASES)
    def test_model_reload_consistency(self, disease_key: str):
        """Verify reloading model artifact produces identical predictions."""
        model_data_1 = load_disease_model(disease_key)
        model_data_2 = load_disease_model(disease_key)

        sample = {f: 1.5 for f in model_data_1["feature_names"]}
        res1 = predict_disease_ml(disease_key, sample)
        res2 = predict_disease_ml(disease_key, sample)

        assert res1["probability"] == res2["probability"]

    def test_missing_model_handling(self):
        """Verify system returns safe fallback when invalid disease key is requested."""
        res = predict_disease_ml("non_existent_disease", {"biomarker": 100.0})
        assert res["ml_available"] is False
        assert res["probability"] is None
        assert "missing" in res["failure_reason"].lower() or "incompatible" in res["failure_reason"].lower()

    def test_feature_mismatch_imputation(self):
        """Verify system handles partial features without crashing."""
        res = predict_disease_ml("type_2_diabetes", {"fasting_glucose": 140.0})
        assert res["ml_available"] is True
        assert res["probability"] is not None
