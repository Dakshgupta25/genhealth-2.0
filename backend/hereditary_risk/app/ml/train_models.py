"""
Production ML Training and Calibration Pipeline.

Remediates ML flaws:
1. Zero Data Leakage: Trains ONLY on genuine laboratory features (no target-derived features).
2. Real Public Datasets: Loads benchmark clinical datasets via dataset_manifest.
3. 3-Way Train/Val/Test Split (Strict Calibration Selection on Val, Evaluation on Untouched Test).
4. Probability Calibration: Compares Platt (sigmoid) vs Isotonic regression calibration on Val.
5. Versioned Artifact Metadata: Saves complete provenance, MD5 hash, metrics, and schema metadata.
"""

import os
import sys
import datetime
import importlib.metadata
from typing import Dict, Any, Tuple

import numpy as np
import pandas as pd
import joblib

import xgboost as xgb
from sklearn.model_selection import train_test_split, StratifiedKFold
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    brier_score_loss,
    confusion_matrix,
)

from hereditary_risk.app.ml.datasets.dataset_manifest import (
    DATASET_MANIFEST,
    load_disease_dataset,
)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)


def calculate_metrics(y_true: np.ndarray, y_pred_prob: np.ndarray) -> Dict[str, float]:
    """Calculate comprehensive classification and calibration metrics."""
    y_true_arr = np.asarray(y_true)
    y_pred_bin = (y_pred_prob >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true_arr, y_pred_bin, labels=[0, 1]).ravel()

    sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    specificity = tn / (tn + fp) if (tn + fp) > 0 else 0.0

    return {
        "roc_auc": round(float(roc_auc_score(y_true_arr, y_pred_prob)), 4),
        "pr_auc": round(float(average_precision_score(y_true_arr, y_pred_prob)), 4),
        "accuracy": round(float(accuracy_score(y_true_arr, y_pred_bin)), 4),
        "precision": round(float(precision_score(y_true_arr, y_pred_bin, zero_division=0)), 4),
        "recall_sensitivity": round(float(sensitivity), 4),
        "specificity": round(float(specificity), 4),
        "f1_score": round(float(f1_score(y_true_arr, y_pred_bin, zero_division=0)), 4),
        "brier_score": round(float(brier_score_loss(y_true_arr, y_pred_prob)), 4),
    }


def train_and_calibrate_disease_model(disease_key: str) -> Dict[str, Any]:
    """
    Train, calibrate, evaluate, and save model artifact for a single disease.
    Guarantees no calibration selection leakage by using internal validation split.
    """
    print(f"\n=======================================================")
    print(f"Training & Calibrating Real Model: {disease_key}")
    print(f"=======================================================")

    # 1. Load real dataset and provenance
    X_df, y_series, feature_mapping, provenance = load_disease_dataset(disease_key)
    feature_names = list(X_df.columns)

    print(f"Dataset Loaded: {X_df.shape[0]} samples, {len(feature_names)} features.")
    print(f"Features: {feature_names}")
    print(f"Dataset MD5: {provenance['dataset_md5_hash']}")
    print(f"Target distribution (positive rate): {y_series.mean():.2%}")

    # 2. Split into Train_Val (80%) and Untouched Final Test Set (20%)
    X_train_val, X_test, y_train_val, y_test = train_test_split(
        X_df, y_series, test_size=0.20, stratify=y_series, random_state=42
    )

    # 3. Split Train_Val into Internal Train (60% total) and Calibration Validation (20% total)
    X_tr, X_val, y_tr, y_val = train_test_split(
        X_train_val, y_train_val, test_size=0.25, stratify=y_train_val, random_state=42
    )

    # 4. Define Base Estimator Pipeline (Imputer + XGBoost)
    base_xgb = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.03,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric="logloss",
        random_state=42,
    )

    pipeline = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("xgb", base_xgb),
    ])

    # 5. Evaluate Calibration Strategies ON INTERNAL VALIDATION SET (X_val) ONLY
    skf_inner = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)

    # Sigmoid / Platt Scaling evaluated on X_val
    calibrated_sigmoid = CalibratedClassifierCV(
        estimator=pipeline, method="sigmoid", cv=skf_inner
    )
    calibrated_sigmoid.fit(X_tr, y_tr)
    sig_val_probs = calibrated_sigmoid.predict_proba(X_val)[:, 1]
    sig_val_brier = brier_score_loss(y_val, sig_val_probs)

    # Isotonic Regression evaluated on X_val
    calibrated_isotonic = CalibratedClassifierCV(
        estimator=pipeline, method="isotonic", cv=skf_inner
    )
    calibrated_isotonic.fit(X_tr, y_tr)
    iso_val_probs = calibrated_isotonic.predict_proba(X_val)[:, 1]
    iso_val_brier = brier_score_loss(y_val, iso_val_probs)

    # Uncalibrated baseline evaluated on X_val
    pipeline.fit(X_tr, y_tr)
    raw_val_probs = pipeline.predict_proba(X_val)[:, 1]
    raw_val_brier = brier_score_loss(y_val, raw_val_probs)

    print(f"Validation Brier Loss -> Raw: {raw_val_brier:.4f} | Sigmoid: {sig_val_brier:.4f} | Isotonic: {iso_val_brier:.4f}")

    # Select best calibration strategy based on validation set Brier score
    if sig_val_brier <= iso_val_brier and sig_val_brier <= raw_val_brier:
        best_calib_method = "sigmoid"
    elif iso_val_brier <= sig_val_brier and iso_val_brier <= raw_val_brier:
        best_calib_method = "isotonic"
    else:
        best_calib_method = "uncalibrated"

    print(f"Selected Calibration Strategy: {best_calib_method.upper()}")

    # 6. Fit final selected model on full Train_Val set (X_train_val)
    skf_full = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    if best_calib_method == "sigmoid":
        final_model = CalibratedClassifierCV(estimator=pipeline, method="sigmoid", cv=skf_full)
        final_model.fit(X_train_val, y_train_val)
    elif best_calib_method == "isotonic":
        final_model = CalibratedClassifierCV(estimator=pipeline, method="isotonic", cv=skf_full)
        final_model.fit(X_train_val, y_train_val)
    else:
        final_model = pipeline
        final_model.fit(X_train_val, y_train_val)

    # 7. Evaluate final metrics on UNTOUCHED Holdout Test Set (X_test)
    final_test_probs = final_model.predict_proba(X_test)[:, 1]
    y_test_arr = y_test.values if hasattr(y_test, "values") else np.asarray(y_test)
    test_metrics = calculate_metrics(y_test_arr, final_test_probs)

    print(f"Holdout Test Performance metrics:")
    for k, v in test_metrics.items():
        print(f"  - {k}: {v}")

    # 8. Build Versioned Artifact Package
    artifact = {
        "model": final_model,
        "base_pipeline": pipeline if best_calib_method == "uncalibrated" else getattr(final_model, "estimator", pipeline),
        "feature_names": feature_names,
        "disease_key": disease_key,
        "model_version": "2.0.0-real-calibrated",
        "dataset_name": provenance["dataset_name"],
        "dataset_source": provenance["source"],
        "calibration_method": best_calib_method,
        "metrics": test_metrics,
        "dataset_provenance": provenance,
        "trained_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "random_seed": 42,
        "dependency_versions": {
            "xgboost": xgb.__version__,
            "scikit_learn": importlib.metadata.version("scikit-learn"),
            "numpy": np.__version__,
            "joblib": joblib.__version__,
        },
    }

    # 9. Save artifact as joblib file
    out_path = os.path.join(MODEL_DIR, f"{disease_key}_model.joblib")
    joblib.dump(artifact, out_path)
    print(f"Saved calibrated model artifact to: {out_path}")

    return artifact


def train_and_save_all_models():
    """Train real datasets and calibrate all 6 disease models."""
    target_diseases = [
        "type_2_diabetes",
        "dyslipidemia",
        "hypothyroidism",
        "ckd",
        "anemia",
        "liver_disease",
    ]

    summary = {}
    for d_key in target_diseases:
        res = train_and_calibrate_disease_model(d_key)
        summary[d_key] = {
            "dataset": res["dataset_name"],
            "calibration": res["calibration_method"],
            "roc_auc": res["metrics"]["roc_auc"],
            "brier_score": res["metrics"]["brier_score"],
            "md5": res["dataset_provenance"]["dataset_md5_hash"][:8],
        }

    print("\n=======================================================")
    print("ALL REAL DISEASE MODELS TRAINED & CALIBRATED SUCCESSFULLY")
    print("=======================================================")
    print(pd.DataFrame(summary).T)


if __name__ == "__main__":
    train_and_save_all_models()
