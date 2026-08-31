"""
Pydantic schemas for the Standalone Model Testing Playground.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class ModelMetadataResponse(BaseModel):
    disease_key: str = Field(..., description="Disease identifier key")
    filename: str = Field(..., description="Model artifact filename")
    model_version: str = Field(..., description="Version tag of trained model")
    calibration_method: str = Field(..., description="Calibration method (isotonic, sigmoid, uncalibrated)")
    is_calibrated: bool = Field(..., description="Whether model outputs calibrated probability")
    dataset_name: Optional[str] = Field(None, description="Training dataset name")
    dataset_source: Optional[str] = Field(None, description="Dataset source or URL")
    feature_names: List[str] = Field(..., description="Exact ordered list of required features")
    metrics: Optional[Dict[str, float]] = Field(None, description="Evaluation metrics (ROC-AUC, Brier score)")
    trained_at: Optional[str] = Field(None, description="Training timestamp")


class ModelListResponse(BaseModel):
    status: str = "ok"
    models_count: int
    models: List[ModelMetadataResponse]


class PredictRequest(BaseModel):
    disease: str = Field(..., description="Target disease key (e.g. 'type_2_diabetes')")
    features: Dict[str, Optional[float]] = Field(..., description="Key-value dictionary of biomarker feature values")


class FeatureContributionSchema(BaseModel):
    feature: str
    feature_value: float
    shap_value: float
    impact: str  # "increases_risk" | "decreases_risk" | "neutral"


class ExplanationSchema(BaseModel):
    base_value: float
    prediction_probability: float
    explainer_type: str  # "shap_tree" | "tree_importance_fallback" | "rule_based_fallback"
    top_positive_features: List[FeatureContributionSchema]
    top_negative_features: List[FeatureContributionSchema]
    all_feature_contributions: List[FeatureContributionSchema]


class PredictResponse(BaseModel):
    status: str = "success"
    disease: str
    prediction: int  # 0 or 1
    prediction_label: str  # "Negative / Normal Risk" | "Positive / Elevated Risk"
    ml_probability_estimate: float
    is_calibrated: bool
    calibration_method: str
    model_version: str
    dataset_name: Optional[str]
    features: Dict[str, float]
    observed_features: List[str]
    imputed_features: List[str]
    explanation: ExplanationSchema


class ModelCompareRequest(BaseModel):
    disease_a: str
    disease_b: str
    features: Dict[str, Optional[float]]


class ModelCompareResponse(BaseModel):
    disease_a: PredictResponse
    disease_b: PredictResponse
    comparable_features: List[str]


class PresetCaseSchema(BaseModel):
    name: str
    description: str
    disease_key: str
    features: Dict[str, float]


class PresetsListResponse(BaseModel):
    presets: List[PresetCaseSchema]


class HealthResponse(BaseModel):
    status: str = "ok"
    models_loaded: int
    loaded_diseases: List[str]
