"""
Inference & SHAP Explanation Engine for Model Testing Playground.

Executes predictions directly using loaded `.joblib` models and computes feature
explanations via SHAP or tree feature importance fallbacks.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Any

from hereditary_risk.app.ml.xgb_engine import POPULATION_MEDIANS as ENGINE_MEDIANS
from hereditary_risk.app.ml.shap_explainer import explain_ml_prediction
from hereditary_risk.model_test_server.model_loader import get_model_artifact
from hereditary_risk.model_test_server.schemas import PredictResponse, ExplanationSchema, FeatureContributionSchema

POPULATION_MEDIANS = {
    **ENGINE_MEDIANS,
    "bmi": 24.5,
    "fasting_glucose": 95.0,
    "fasting_insulin": 8.0,
    "resting_bp": 120.0,
    "age": 45.0,
}

# Physiologically plausible limits for medical value validation
FEATURE_VALIDATION_LIMITS: Dict[str, Dict[str, float]] = {
    "fasting_glucose": {"min": 20.0, "max": 800.0},
    "fasting_insulin": {"min": 0.1, "max": 300.0},
    "bmi": {"min": 8.0, "max": 100.0},
    "resting_bp": {"min": 40.0, "max": 260.0},
    "age": {"min": 0.0, "max": 120.0},
    "hemoglobin": {"min": 2.0, "max": 25.0},
    "mcv": {"min": 40.0, "max": 150.0},
    "mch": {"min": 10.0, "max": 50.0},
    "mchc": {"min": 15.0, "max": 45.0},
    "creatinine": {"min": 0.1, "max": 35.0},
    "bun": {"min": 1.0, "max": 200.0},
    "total_cholesterol": {"min": 50.0, "max": 1000.0},
    "tsh": {"min": 0.01, "max": 200.0},
    "t3": {"min": 10.0, "max": 1000.0},
    "t4": {"min": 0.1, "max": 40.0},
    "free_t4": {"min": 0.05, "max": 10.0},
    "alt": {"min": 1.0, "max": 5000.0},
    "ast": {"min": 1.0, "max": 5000.0},
    "alp": {"min": 5.0, "max": 3000.0},
    "bilirubin_total": {"min": 0.05, "max": 50.0},
    "albumin": {"min": 0.5, "max": 8.0},
}


def validate_feature_values(features: Dict[str, Optional[float]]) -> List[str]:
    """
    Validate input feature values against medical plausibility bounds.
    Returns list of validation warning/error strings.
    """
    errors = []
    for feat_name, raw_val in features.items():
        if raw_val is None:
            continue
        try:
            val = float(raw_val)
        except (ValueError, TypeError):
            errors.append(f"Feature '{feat_name}' has non-numeric value: '{raw_val}'")
            continue

        if np.isnan(val) or np.isinf(val):
            errors.append(f"Feature '{feat_name}' contains NaN or Infinity value.")
            continue

        if feat_name in FEATURE_VALIDATION_LIMITS:
            limits = FEATURE_VALIDATION_LIMITS[feat_name]
            if val < limits["min"] or val > limits["max"]:
                errors.append(
                    f"Feature '{feat_name}' value {val} is outside plausible medical bounds [{limits['min']}, {limits['max']}]"
                )

    return errors


def run_playground_prediction(
    disease_key: str,
    user_features: Dict[str, Optional[float]],
) -> PredictResponse:
    """
    Execute direct model prediction for the testing playground.
    """
    artifact = get_model_artifact(disease_key)
    if not artifact:
        raise ValueError(f"Model for disease '{disease_key}' is not available or not loaded.")

    model = artifact["model"]
    feature_names: List[str] = artifact["feature_names"]
    calib_method = artifact.get("calibration_method", "uncalibrated")
    is_calibrated = calib_method in ["isotonic", "sigmoid"]
    model_version = artifact.get("model_version", "1.0.0")
    dataset_name = artifact.get("dataset_name")

    # Validate feature values
    val_errors = validate_feature_values(user_features)
    if val_errors:
        raise ValueError(f"Input Validation Errors: {'; '.join(val_errors)}")

    # Impute missing features with population reference medians while preserving order
    feature_vals: Dict[str, float] = {}
    observed_features: List[str] = []
    imputed_features: List[str] = []

    for f_name in feature_names:
        raw_val = user_features.get(f_name)
        if raw_val is not None and not np.isnan(float(raw_val)):
            feature_vals[f_name] = float(raw_val)
            observed_features.append(f_name)
        else:
            feature_vals[f_name] = POPULATION_MEDIANS.get(f_name, 0.0)
            imputed_features.append(f_name)

    # DataFrame with exact feature ordering
    input_df = pd.DataFrame([feature_vals])[feature_names]

    # Model inference
    prob_array = model.predict_proba(input_df)
    prob_raw = float(prob_array[0, 1])
    probability = max(0.0, min(1.0, prob_raw))
    prob_rounded = round(probability, 4)

    # Binary prediction decision threshold (0.50)
    prediction_class = 1 if prob_rounded >= 0.50 else 0
    prediction_label = "Positive / Elevated Risk" if prediction_class == 1 else "Negative / Normal Risk"

    # SHAP / Explanation
    shap_res = explain_ml_prediction(model, feature_names, feature_vals, prob_rounded)

    explanation_schema = ExplanationSchema(
        base_value=shap_res["base_value"],
        prediction_probability=shap_res["prediction_probability"],
        explainer_type=shap_res["explainer_type"],
        top_positive_features=[
            FeatureContributionSchema(**item) for item in shap_res["top_positive_features"]
        ],
        top_negative_features=[
            FeatureContributionSchema(**item) for item in shap_res["top_negative_features"]
        ],
        all_feature_contributions=[
            FeatureContributionSchema(**item) for item in shap_res["all_feature_contributions"]
        ],
    )

    return PredictResponse(
        status="success",
        disease=disease_key,
        prediction=prediction_class,
        prediction_label=prediction_label,
        ml_probability_estimate=prob_rounded,
        is_calibrated=is_calibrated,
        calibration_method=calib_method,
        model_version=model_version,
        dataset_name=dataset_name,
        features=feature_vals,
        observed_features=observed_features,
        imputed_features=imputed_features,
        explanation=explanation_schema,
    )
