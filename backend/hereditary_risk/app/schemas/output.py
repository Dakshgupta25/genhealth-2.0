"""
Pydantic Response Schemas for Standalone Hereditary Risk Engine.

Strictly separates distinct medical and mathematical quantities:
1. rule_based_risk_score (Layer 2 heuristic clinical threshold score)
2. family_weighted_risk (Wright's kinship-weighted family risk contribution)
3. heuristic_combined_risk_signal (Documented transparent combined heuristic score)
4. ml_probability_estimate (Layer 3 XGBoost statistical probability estimate)
5. population_heritability_reference (Epidemiological population heritability h^2 estimate)
6. rule_ml_disagreement (Explicit disagreement flag when rule/family score and ML estimate diverge)
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class BiomarkerNormalizationResponse(BaseModel):
    """Result of normalizing a single raw biomarker input."""
    status: str                         # "matched" | "unknown"
    raw_name: str
    cleaned_name: str
    canonical_key: Optional[str] = None
    display_name: Optional[str] = None
    standard_unit: Optional[str] = None
    category: Optional[str] = None
    numeric_value: Optional[float] = None
    unit_match: bool = True
    is_valid_value: bool = True
    parsing_notes: Optional[str] = None


class BiomarkerRuleEvidenceSchema(BaseModel):
    """Supporting rule evidence for a specific biomarker."""
    biomarker_key: str
    display_name: str
    numeric_value: Optional[float]
    unit: str
    status: str                         # "CRITICAL" | "WARNING" | "NORMAL" | "CRITICAL_LOW" | "WARNING_LOW" | "MISSING_OR_INVALID"
    threshold_crossed: Optional[float]
    description: str


class FamilyMemberBreakdownSchema(BaseModel):
    """Breakdown of an individual family member's genetic risk contribution."""
    member_id: str
    relationship: str
    is_genetic: bool
    kinship_weight: float
    member_rule_score: float
    weighted_contribution: float
    biomarkers_provided: List[str]
    critical_biomarkers: List[str]
    supporting_evidence: List[BiomarkerRuleEvidenceSchema]


class FeatureContributionSchema(BaseModel):
    """SHAP feature importance impact schema."""
    feature: str
    feature_value: float
    shap_value: float
    impact: str                         # "increases_risk" | "decreases_risk" | "neutral"


class SHAPExplanationSchema(BaseModel):
    """SHAP explainer output schema."""
    base_value: float
    prediction_probability: float
    explainer_type: str                 # "shap_tree" | "tree_importance_fallback" | "rule_based_fallback"
    top_positive_features: List[FeatureContributionSchema]
    top_negative_features: List[FeatureContributionSchema]
    all_feature_contributions: List[FeatureContributionSchema]


class DiseaseRiskResultSchema(BaseModel):
    """Risk evaluation output for a single disease category."""
    model_config = {"protected_namespaces": ()}

    disease_key: str = Field(..., description="Canonical disease identifier")
    display_name: str = Field(..., description="Human-readable disease title")
    category: str = Field(..., description="Medical category")
    model_version: str = Field("1.0.0", description="Model engine version tag")
    population_heritability_reference: Optional[float] = Field(
        None, description="Epidemiological population narrow-sense heritability (h^2) reference from literature"
    )
    rule_based_risk_score: float = Field(
        ..., description="Layer 2 deterministic clinical rule threshold score (0.0 to 1.0)"
    )
    family_weighted_risk: float = Field(
        ..., description="Layer 2 Wright's kinship weighted family biomarker risk score (0.0 to 1.0)"
    )
    heuristic_combined_risk_signal: float = Field(
        ..., description="Documented transparent combined heuristic score (0.60 * self_rule + 0.40 * family_weighted). NEVER a probability."
    )
    combined_risk_signal: float = Field(
        ..., description="Backwards-compatible alias for heuristic_combined_risk_signal (0.0 to 1.0)"
    )
    risk_score: float = Field(
        ..., description="Backwards-compatible alias for heuristic_combined_risk_signal (0.0 to 1.0)"
    )
    ml_available: bool = Field(
        ..., description="True if machine learning inference model was executed"
    )
    ml_probability_estimate: Optional[float] = Field(
        None, description="Layer 3 XGBoost statistical probability estimate (0.0 to 1.0) or None. Termed estimate when uncalibrated."
    )
    ml_probability: Optional[float] = Field(
        None, description="Backwards-compatible alias for ml_probability_estimate"
    )
    is_calibrated: bool = Field(
        False, description="True ONLY if the model uses a cross-validated probability calibration method (e.g. Platt Sigmoid or Isotonic)"
    )
    ml_is_calibrated: bool = Field(
        False, description="Alias for is_calibrated"
    )
    calibration_method: Optional[str] = Field(
        None, description="Calibration technique used: 'sigmoid' | 'isotonic' | 'uncalibrated'"
    )
    observed_features: List[str] = Field(
        default_factory=list, description="Model input features provided directly by patient measurements"
    )
    imputed_features: List[str] = Field(
        default_factory=list, description="Model input features missing and filled with population reference medians"
    )
    rule_ml_disagreement: bool = Field(
        False, description="True if clinical rule/family score and ML probability estimate disagree significantly"
    )
    disagreement_explanation: Optional[str] = Field(
        None, description="Human-readable explanation of discrepancy between rule/family assessment and ML probability estimate"
    )
    risk_label: str = Field(..., description="'HIGH' | 'MODERATE' | 'LOW'")
    highest_severity: str = Field(..., description="'HIGH' | 'NORMAL'")
    rule_evidence: List[BiomarkerRuleEvidenceSchema] = Field(default_factory=list)
    family_breakdown: List[FamilyMemberBreakdownSchema] = Field(default_factory=list)
    transparent_formula: str = Field(..., description="Explicit mathematical calculation formula")
    explanation: Dict[str, Any] = Field(default_factory=dict, description="SHAP feature importance details")
    narrative: Optional[str] = Field(None, description="Layer 4 LLM generated clinical summary")


class DataQualitySummarySchema(BaseModel):
    """Data completeness and quality summary."""
    status: str                         # "COMPLETE" | "PARTIAL" | "INSUFFICIENT"
    total_biomarkers_provided: int
    matched_biomarkers_count: int
    unknown_biomarkers_count: int
    family_members_count: int
    genetic_members_with_data: int


class HereditaryRiskAssessmentResponse(BaseModel):
    """Top-level API response for POST /api/v1/hereditary-risk/predict."""
    request_id: str
    user_id: str
    patient_name: str
    computed_at: str
    diseases: Dict[str, DiseaseRiskResultSchema]
    data_quality: DataQualitySummarySchema
    warnings: List[str] = Field(default_factory=list)
    processing_time_ms: float
