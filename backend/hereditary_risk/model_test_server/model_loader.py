"""
Model Loader for Model Testing Playground.

Safely loads and caches trained `.joblib` model artifacts strictly from the local
`backend/hereditary_risk/app/ml/models/` directory.

Security Controls:
- Disallows arbitrary user filesystem paths.
- Restricts loaded files to known `.joblib` files in the models directory.
- Caches model artifacts safely in memory.
"""

import os
import joblib
from typing import Dict, List, Optional, Any

# Path to local model artifacts directory
MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "app", "ml", "models")
)

_MODEL_CACHE: Dict[str, Dict[str, Any]] = {}


def discover_and_load_all_models() -> Dict[str, Dict[str, Any]]:
    """
    Discover all `.joblib` model artifacts in MODEL_DIR and cache them in memory.
    Returns dictionary mapping disease_key -> model_artifact_dict.
    """
    if _MODEL_CACHE:
        return _MODEL_CACHE

    if not os.path.exists(MODEL_DIR):
        raise FileNotFoundError(f"Model directory not found at path: {MODEL_DIR}")

    for filename in sorted(os.listdir(MODEL_DIR)):
        if filename.endswith("_model.joblib"):
            file_path = os.path.join(MODEL_DIR, filename)
            try:
                artifact = joblib.load(file_path)
                if isinstance(artifact, dict) and "model" in artifact and "feature_names" in artifact:
                    disease_key = artifact.get("disease_key") or filename.replace("_model.joblib", "")
                    artifact["filename"] = filename
                    _MODEL_CACHE[disease_key] = artifact
            except Exception as exc:
                print(f"[ModelLoader] Error loading artifact {filename}: {exc}")

    return _MODEL_CACHE


def get_model_artifact(disease_key: str) -> Optional[Dict[str, Any]]:
    """Retrieve cached model artifact for a target disease key."""
    all_models = discover_and_load_all_models()
    return all_models.get(disease_key)


def get_all_model_metadata() -> List[Dict[str, Any]]:
    """Return structured metadata list for all discovered models."""
    all_models = discover_and_load_all_models()
    meta_list = []
    for d_key, artifact in all_models.items():
        calib_method = artifact.get("calibration_method", "uncalibrated")
        meta_list.append({
            "disease_key": d_key,
            "filename": artifact.get("filename", f"{d_key}_model.joblib"),
            "model_version": artifact.get("model_version", "1.0.0"),
            "calibration_method": calib_method,
            "is_calibrated": calib_method in ["isotonic", "sigmoid"],
            "dataset_name": artifact.get("dataset_name"),
            "dataset_source": artifact.get("dataset_source"),
            "feature_names": artifact.get("feature_names", []),
            "metrics": artifact.get("metrics"),
            "trained_at": str(artifact.get("trained_at")) if artifact.get("trained_at") else None,
        })
    return meta_list
