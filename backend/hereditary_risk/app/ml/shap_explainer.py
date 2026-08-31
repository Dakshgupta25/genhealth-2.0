"""
Layer 3: SHAP Feature Importance Explainer Subsystem.

Computes feature contributions for machine learning risk predictions.
Compatible with calibrated estimators, Pipeline objects, and raw XGBoost models.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, TypedDict, Any

# Optional import of SHAP library
SHAP_AVAILABLE = False
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False


class FeatureContribution(TypedDict):
    feature: str
    feature_value: float
    shap_value: float
    impact: str                          # "increases_risk" | "decreases_risk" | "neutral"


class SHAPExplanationResult(TypedDict):
    base_value: float
    prediction_probability: float
    explainer_type: str                  # "shap_tree" | "tree_importance_fallback" | "rule_based_fallback"
    top_positive_features: List[FeatureContribution]
    top_negative_features: List[FeatureContribution]
    all_feature_contributions: List[FeatureContribution]


def _extract_base_xgb_estimator(model: Any) -> Any:
    """Unwrap CalibratedClassifierCV or Pipeline to locate underlying tree estimator."""
    if model is None:
        return None

    # CalibratedClassifierCV
    if hasattr(model, "calibrated_classifiers_") and len(model.calibrated_classifiers_) > 0:
        first_calib = model.calibrated_classifiers_[0]
        base_est = getattr(first_calib, "estimator", None)
        return _extract_base_xgb_estimator(base_est)

    # sklearn Pipeline
    if hasattr(model, "named_steps"):
        if "xgb" in model.named_steps:
            return model.named_steps["xgb"]
        # Return last step
        return list(model.named_steps.values())[-1]

    return model


def explain_ml_prediction(
    model: Any,
    feature_names: List[str],
    feature_values: Dict[str, float],
    prediction_probability: float,
) -> SHAPExplanationResult:
    """
    Compute SHAP value contributions for a single sample prediction.
    """
    if not feature_names or not feature_values:
        return {
            "base_value": 0.5,
            "prediction_probability": prediction_probability,
            "explainer_type": "rule_based_fallback",
            "top_positive_features": [],
            "top_negative_features": [],
            "all_feature_contributions": [],
        }

    # Ensure all feature_names are present in input dict with safe default (0.0)
    safe_feature_vals = {f_name: feature_values.get(f_name, 0.0) for f_name in feature_names}
    input_df = pd.DataFrame([safe_feature_vals])[feature_names]

    if model is None:
        contributions: List[FeatureContribution] = []
        for f_name in feature_names:
            val = safe_feature_vals[f_name]
            contributions.append({
                "feature": f_name,
                "feature_value": float(val),
                "shap_value": 0.1,
                "impact": "neutral",
            })
        return {
            "base_value": 0.5,
            "prediction_probability": prediction_probability,
            "explainer_type": "rule_based_fallback",
            "top_positive_features": [],
            "top_negative_features": [],
            "all_feature_contributions": contributions,
        }

    base_estimator = _extract_base_xgb_estimator(model)

    if SHAP_AVAILABLE and base_estimator is not None:
        try:
            # Impute missing values if raw array is passed
            X_mat = input_df.fillna(0.0).values
            explainer = shap.TreeExplainer(base_estimator)
            shap_values = explainer.shap_values(X_mat)

            if isinstance(shap_values, list):
                s_vals = shap_values[1][0] if len(shap_values) > 1 else shap_values[0][0]
            elif isinstance(shap_values, np.ndarray):
                s_vals = shap_values[0] if shap_values.ndim > 1 else shap_values
            else:
                s_vals = np.zeros(len(feature_names))

            base_val = float(getattr(explainer, "expected_value", 0.5))
            if isinstance(base_val, (list, np.ndarray)):
                base_val = float(base_val[-1])

            contributions = []
            for name, val, s_val in zip(feature_names, input_df.iloc[0].values, s_vals):
                sv = float(s_val)
                impact = "increases_risk" if sv > 0.001 else ("decreases_risk" if sv < -0.001 else "neutral")
                contributions.append({
                    "feature": name,
                    "feature_value": float(val),
                    "shap_value": round(sv, 4),
                    "impact": impact,
                })

            pos_features = sorted([c for c in contributions if c["impact"] == "increases_risk"], key=lambda x: x["shap_value"], reverse=True)
            neg_features = sorted([c for c in contributions if c["impact"] == "decreases_risk"], key=lambda x: x["shap_value"])

            return {
                "base_value": round(base_val, 4),
                "prediction_probability": prediction_probability,
                "explainer_type": "shap_tree",
                "top_positive_features": pos_features[:5],
                "top_negative_features": neg_features[:5],
                "all_feature_contributions": contributions,
            }
        except Exception:
            pass

    # Fallback to feature importances
    contributions = []
    importances = getattr(base_estimator, "feature_importances_", None)
    for idx, f_name in enumerate(feature_names):
        imp = float(importances[idx]) if importances is not None and idx < len(importances) else 0.1
        f_val = safe_feature_vals.get(f_name, 0.0)
        contributions.append({
            "feature": f_name,
            "feature_value": float(f_val),
            "shap_value": round(imp * 0.2, 4),
            "impact": "increases_risk" if imp > 0.05 else "neutral",
        })

    pos_features = sorted([c for c in contributions if c["impact"] == "increases_risk"], key=lambda x: x["shap_value"], reverse=True)

    return {
        "base_value": 0.2,
        "prediction_probability": prediction_probability,
        "explainer_type": "tree_importance_fallback",
        "top_positive_features": pos_features[:5],
        "top_negative_features": [],
        "all_feature_contributions": contributions,
    }
