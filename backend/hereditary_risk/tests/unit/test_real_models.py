"""
Unit tests for Real Public Dataset ML Models, Probability Calibration, and Fail-Safe Logic.
"""

import pytest
import numpy as np
from hereditary_risk.app.ml.xgb_engine import (
    load_disease_model,
    predict_disease_ml,
)
from hereditary_risk.app.ml.datasets.dataset_manifest import (
    DATASET_MANIFEST,
    load_disease_dataset,
)


def test_real_model_artifacts_exist_and_load():
    """Verify that all 6 disease model artifacts trained on real datasets exist and load."""
    diseases = ["type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"]
    for d_key in diseases:
        artifact = load_disease_model(d_key)
        assert artifact is not None, f"Artifact for {d_key} failed to load."
        assert "model" in artifact
        assert "feature_names" in artifact
        assert "calibration_method" in artifact
        assert "metrics" in artifact
        assert len(artifact["feature_names"]) > 0


def test_zero_data_leakage_in_model_features():
    """Verify that model input features contain ZERO target-derived features."""
    forbidden_features = {"self_score", "family_weighted_risk", "combined_risk", "combined_hereditary_score", "target"}
    diseases = ["type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"]
    for d_key in diseases:
        artifact = load_disease_model(d_key)
        feature_names = set(artifact["feature_names"])
        assert feature_names.isdisjoint(forbidden_features), f"Leakage feature found in {d_key}: {feature_names & forbidden_features}"


def test_calibrated_ml_probability_bounds():
    """Verify that ML probabilities are strictly calibrated between 0.0 and 1.0."""
    sample_biomarkers = {
        "fasting_glucose": 145.0,
        "fasting_insulin": 22.0,
        "tsh": 12.5,
        "creatinine": 2.1,
        "hemoglobin": 7.5,
        "alt": 95.0,
    }
    diseases = ["type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"]
    for d_key in diseases:
        res = predict_disease_ml(d_key, sample_biomarkers)
        assert res["ml_available"] is True
        assert res["probability"] is not None
        assert 0.0 <= res["probability"] <= 1.0


def test_fail_safe_missing_model_behavior():
    """Verify fail-safe state when an invalid or missing disease model is requested."""
    res = predict_disease_ml("non_existent_disease_xyz", {"fasting_glucose": 100.0})
    assert res["ml_available"] is False
    assert res["probability"] is None
    assert res["failure_reason"] is not None
    assert "missing or incompatible" in res["failure_reason"]


def test_dataset_manifest_integrity():
    """Verify dataset manifest metadata structure for all 6 target diseases."""
    for d_key in ["type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"]:
        assert d_key in DATASET_MANIFEST
        m = DATASET_MANIFEST[d_key]
        assert "dataset_name" in m
        assert "source" in m
        assert "retrieval_date" in m
        assert "license" in m
        assert "target_variable" in m
