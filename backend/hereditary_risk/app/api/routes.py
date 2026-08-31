"""
FastAPI Router for Standalone Hereditary Risk Engine.

Endpoints:
- POST /api/v1/hereditary-risk/normalize: Layer 1 lab normalization
- POST /api/v1/hereditary-risk/predict: Full 4-Layer predictive pipeline
"""

import time
import uuid
import datetime
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, HTTPException, status, Header, Depends

from hereditary_risk.app.config.settings import settings
from hereditary_risk.app.schemas.input import (
    NormalizeBiomarkerRequest,
    HereditaryRiskAssessmentRequest,
    RawBiomarkerItem,
)
from hereditary_risk.app.schemas.output import (
    BiomarkerNormalizationResponse,
    HereditaryRiskAssessmentResponse,
    DiseaseRiskResultSchema,
    BiomarkerRuleEvidenceSchema,
    FamilyMemberBreakdownSchema,
    DataQualitySummarySchema,
)

from hereditary_risk.app.normalization.aliasing import (
    normalize_biomarker_input,
)
from hereditary_risk.app.rules.family_risk import (
    evaluate_disease_hereditary_risk,
)
from hereditary_risk.app.config.diseases import (
    DISEASE_REGISTRY,
    get_disease_metadata,
)
from hereditary_risk.app.ml.xgb_engine import (
    predict_disease_ml,
)
from hereditary_risk.app.ml.shap_explainer import (
    explain_ml_prediction,
)
from hereditary_risk.app.narrative.gemini_narrative import (
    generate_clinical_narrative,
)


def verify_api_key(x_api_key: Optional[str] = Header(None, alias="X-API-Key")):
    """
    Fail-closed API Key verification for standalone Hereditary Risk service.
    - If HEREDITARY_RISK_API_KEY is not configured: reject with HTTP 503 Service Unavailable.
    - If HEREDITARY_RISK_API_KEY is configured: require matching X-API-Key header (HTTP 401 if missing/invalid).
    """
    if not settings.HEREDITARY_RISK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Hereditary Risk Engine standalone API is unavailable: HEREDITARY_RISK_API_KEY is not configured (fail-closed mode).",
        )
    if not x_api_key or x_api_key != settings.HEREDITARY_RISK_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-API-Key header for Hereditary Risk Engine.",
        )
    return True


router = APIRouter(
    prefix="/api/v1/hereditary-risk",
    tags=["Hereditary Risk Engine"],
    dependencies=[Depends(verify_api_key)],
)


def _extract_biomarkers_dict(raw_input: Any) -> Dict[str, Any]:
    """Helper to convert list of RawBiomarkerItem or dict into a standard key-value map."""
    result: Dict[str, Any] = {}
    if isinstance(raw_input, dict):
        return raw_input
    elif isinstance(raw_input, list):
        for item in raw_input:
            if hasattr(item, "raw_name"):
                result[item.raw_name] = item.value
            elif isinstance(item, dict):
                r_name = item.get("raw_name") or item.get("name")
                val = item.get("value") or item.get("val")
                if r_name:
                    result[r_name] = val
    return result


@router.post("/normalize", response_model=BiomarkerNormalizationResponse)
def normalize_single_biomarker(payload: NormalizeBiomarkerRequest):
    """Layer 1: Standalone Biomarker Normalization Endpoint."""
    val = payload.value if payload.value is not None else payload.raw_value
    res = normalize_biomarker_input(payload.raw_name, val, payload.unit)
    return BiomarkerNormalizationResponse(
        status=res["status"],
        raw_name=payload.raw_name,
        cleaned_name=res["cleaned_name"],
        canonical_key=res["canonical_key"],
        display_name=res["display_name"],
        standard_unit=res["standard_unit"],
        category=res["category"],
        numeric_value=res["numeric_value"],
        unit_match=res["unit_match"],
        is_valid_value=res["is_valid_value"],
        parsing_notes=res["parsing_notes"],
    )


@router.post("/predict", response_model=HereditaryRiskAssessmentResponse)
def predict_hereditary_risk(payload: HereditaryRiskAssessmentRequest):
    """
    Layer 1-4 Complete Standalone Hereditary Risk Assessment Pipeline.
    """
    start_time = time.time()
    req_id = str(uuid.uuid4())
    warnings: List[str] = []

    self_biomarker_map = _extract_biomarkers_dict(payload.self_biomarkers)

    # 1. Layer 1: Normalize Self Biomarkers
    self_canonical_biomarkers: Dict[str, Optional[float]] = {}
    matched_self_count = 0
    unknown_self_count = 0

    for raw_name, val in self_biomarker_map.items():
        norm = normalize_biomarker_input(raw_name, val)
        if norm["status"] == "matched" and norm["canonical_key"] is not None:
            self_canonical_biomarkers[norm["canonical_key"]] = norm["numeric_value"]
            matched_self_count += 1
        else:
            unknown_self_count += 1
            warnings.append(f"Unrecognized self biomarker '{raw_name}' excluded from rule scoring.")

    # 2. Layer 1: Normalize Family Biomarkers
    normalized_family_list: List[Dict[str, Any]] = []

    for idx, f_member in enumerate(payload.family_members):
        member_id = f_member.member_id or f"rel_{idx+1}"
        f_map = _extract_biomarkers_dict(f_member.biomarkers)
        m_biomarkers: Dict[str, Optional[float]] = {}

        for r_name, r_val in f_map.items():
            r_norm = normalize_biomarker_input(r_name, r_val)
            if r_norm["status"] == "matched" and r_norm["canonical_key"] is not None:
                m_biomarkers[r_norm["canonical_key"]] = r_norm["numeric_value"]

        normalized_family_list.append({
            "member_id": member_id,
            "relationship": f_member.relationship,
            "biomarkers": m_biomarkers,
            "known_conditions": getattr(f_member, "known_conditions", []),
        })

    # Determine requested target diseases
    target_diseases = payload.disease_keys or payload.target_diseases or list(DISEASE_REGISTRY.keys())
    for d_key in target_diseases:
        if d_key not in DISEASE_REGISTRY:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"None of the provided target_diseases are supported or valid. Unsupported disease key: '{d_key}'. Supported keys: {list(DISEASE_REGISTRY.keys())}",
            )

    # 3. Process each disease through 4-layer pipeline
    disease_results: Dict[str, DiseaseRiskResultSchema] = {}

    for d_key in target_diseases:
        d_meta = get_disease_metadata(d_key)

        # Layer 2: Rule Engine & Kinship Calculation
        agg_res = evaluate_disease_hereditary_risk(
            d_key,
            self_canonical_biomarkers,
            normalized_family_list,
        )

        # Layer 3: Calibrated ML Inference Engine
        ml_res = predict_disease_ml(d_key, self_canonical_biomarkers)
        ml_prob = ml_res["probability"] if ml_res["ml_available"] else None

        # Layer 3: SHAP Feature Explainer
        shap_res = explain_ml_prediction(
            model=ml_res["model"],
            feature_names=ml_res["feature_names"],
            feature_values=ml_res["feature_values"],
            prediction_probability=ml_prob if ml_prob is not None else agg_res["combined_hereditary_score"],
        )

        # Determine Risk Label from combined heuristic risk signal
        combined_signal = agg_res["combined_hereditary_score"]

        if combined_signal >= 0.60:
            risk_label = "HIGH"
        elif combined_signal >= 0.30:
            risk_label = "MODERATE"
        else:
            risk_label = "LOW"

        # Explicit Disagreement Detection Logic
        rule_ml_disagreement = False
        disagreement_explanation = None

        if ml_res["ml_available"] and ml_prob is not None:
            rule_score = agg_res["self_score"]
            family_risk = agg_res["family_weighted_risk"]
            
            rule_high = (combined_signal >= 0.50) or (rule_score >= 0.60) or (family_risk >= 0.60)
            rule_low = (combined_signal < 0.30) and (rule_score < 0.40) and (family_risk < 0.40)
            
            ml_high = (ml_prob >= 0.50)
            ml_low = (ml_prob < 0.30)

            if rule_high and ml_low:
                rule_ml_disagreement = True
                disagreement_explanation = (
                    f"Discrepancy detected: Deterministic clinical rule/family history assessment indicates HIGH risk "
                    f"(rule score: {rule_score:.2f}, family risk: {family_risk:.2f}, combined heuristic: {combined_signal:.2f}), "
                    f"whereas ML probability estimate is LOW ({ml_prob:.2f}). This may occur when specific biomarker "
                    f"diagnostic thresholds or kinship risks are crossed, but overall population statistical pattern predicts low likelihood."
                )
            elif rule_low and ml_high:
                rule_ml_disagreement = True
                disagreement_explanation = (
                    f"Discrepancy detected: Population ML probability estimate is HIGH ({ml_prob:.2f}) based on statistical biomarker pattern, "
                    f"whereas deterministic clinical rule score ({rule_score:.2f}) and family risk score ({family_risk:.2f}) are LOW."
                )
            else:
                rule_ml_disagreement = False
                disagreement_explanation = "No significant disagreement between clinical rule engine and ML probability estimate."
        else:
            rule_ml_disagreement = False
            disagreement_explanation = "ML inference model not available for this disease; disagreement evaluation skipped."

        # Layer 4: Gemini / Deterministic Clinical Narrative
        narrative_res = generate_clinical_narrative(
            patient_name=payload.patient_name or "Patient",
            disease_key=d_key,
            disease_display_name=d_meta["display_name"],
            risk_score=combined_signal,
            risk_label=risk_label,
            self_rule_score=agg_res["self_score"],
            family_weighted_risk=agg_res["family_weighted_risk"],
            rule_evidence=agg_res["self_rule_evidence"],
            family_breakdown=agg_res["family_breakdown"],
            transparent_formula=agg_res["transparent_formula"],
            shap_explanation=shap_res,
            enable_llm=payload.enable_llm_narrative,
        )

        # Format Evidence & Breakdown Schemas
        rule_evidence_schemas = [
            BiomarkerRuleEvidenceSchema(
                biomarker_key=ev["biomarker_key"],
                display_name=ev["display_name"],
                numeric_value=ev["numeric_value"],
                unit=ev["unit"],
                status=ev["status"],
                threshold_crossed=ev["threshold_crossed"],
                description=ev["description"],
            )
            for ev in agg_res["self_rule_evidence"]
        ]

        family_breakdown_schemas = [
            FamilyMemberBreakdownSchema(
                member_id=fb["member_id"],
                relationship=fb["relationship"],
                is_genetic=fb["is_genetic"],
                kinship_weight=fb["kinship_weight"],
                member_rule_score=fb["member_rule_score"],
                weighted_contribution=fb["weighted_contribution"],
                biomarkers_provided=fb["biomarkers_provided"],
                critical_biomarkers=fb["critical_biomarkers"],
                supporting_evidence=[
                    BiomarkerRuleEvidenceSchema(
                        biomarker_key=e["biomarker_key"],
                        display_name=e["display_name"],
                        numeric_value=e["numeric_value"],
                        unit=e["unit"],
                        status=e["status"],
                        threshold_crossed=e["threshold_crossed"],
                        description=e["description"],
                    )
                    for e in fb["supporting_evidence"]
                ],
            )
            for fb in agg_res["family_breakdown"]
        ]

        # Data Sufficiency & Missing Biomarker Gating Evaluation
        primary_markers = d_meta.get("primary_biomarkers", [])
        ml_features = d_meta.get("ml_feature_biomarkers", [])
        mandatory_anchors = d_meta.get("mandatory_anchors", [])
        min_required = d_meta.get("min_required_biomarkers", 1)

        provided_primary_keys = [
            k for k in primary_markers
            if k in self_canonical_biomarkers and self_canonical_biomarkers[k] is not None
        ]

        missing_mandatory: List[str] = []
        for anchor_group in mandatory_anchors:
            has_anchor = any(
                k in self_canonical_biomarkers and self_canonical_biomarkers[k] is not None
                for k in anchor_group
            )
            if not has_anchor:
                missing_mandatory.append(" or ".join(anchor_group))

        has_personal_primary = (len(provided_primary_keys) >= min_required) and (len(missing_mandatory) == 0)
        has_family_evidence = agg_res["family_weighted_risk"] > 0 or agg_res["genetic_bump"] > 0

        if has_personal_primary:
            is_sufficient = True
            data_sufficiency_status = "SUFFICIENT"
            sufficiency_msg = None
        elif has_family_evidence:
            is_sufficient = True
            data_sufficiency_status = "FAMILY_PEDIGREE_ONLY"
            missing_text = f" (add {' and '.join(missing_mandatory)})" if missing_mandatory else ""
            sufficiency_msg = (
                f"Inherited predisposition computed from linked family records (+{agg_res['genetic_bump']*100:.1f}%). "
                f"Personal lab confirmation pending{missing_text}."
            )
        else:
            is_sufficient = False
            data_sufficiency_status = "INSUFFICIENT_DATA"
            if missing_mandatory:
                sufficiency_msg = f"Insufficient data — add {' and '.join(missing_mandatory)} to enable {d_meta['display_name']} assessment."
            else:
                sufficiency_msg = f"Insufficient data — at least {min_required} biomarkers required (currently provided: {len(provided_primary_keys)})."

        pop_heritability = d_meta.get("heritability_estimate")
        is_cal = ml_res.get("is_calibrated", False)

        disease_results[d_key] = DiseaseRiskResultSchema(
            disease_key=d_key,
            display_name=d_meta["display_name"],
            category=d_meta["category"],
            model_version=ml_res.get("model_version", "2.0.0-real-calibrated"),
            population_heritability_reference=pop_heritability,
            rule_based_risk_score=agg_res["self_score"],
            family_weighted_risk=agg_res["family_weighted_risk"],
            heuristic_combined_risk_signal=combined_signal,
            combined_risk_signal=combined_signal,
            risk_score=combined_signal,
            ml_available=ml_res["ml_available"],
            ml_probability_estimate=ml_prob,
            ml_probability=ml_prob,
            is_calibrated=is_cal,
            ml_is_calibrated=is_cal,
            calibration_method=ml_res.get("calibration_method", "uncalibrated"),
            observed_features=ml_res.get("observed_features", []),
            imputed_features=ml_res.get("imputed_features", []),
            rule_ml_disagreement=rule_ml_disagreement,
            disagreement_explanation=disagreement_explanation,
            data_sufficiency_status=data_sufficiency_status,
            is_sufficient_data=is_sufficient,
            missing_mandatory_biomarkers=missing_mandatory,
            sufficiency_message=sufficiency_msg,
            primary_clinical_biomarkers=primary_markers,
            ml_feature_biomarkers=ml_features,
            formula_breakdown=agg_res.get("formula_breakdown", {}),
            risk_label=risk_label,
            highest_severity=agg_res["highest_severity"],
            rule_evidence=rule_evidence_schemas,
            family_breakdown=family_breakdown_schemas,
            transparent_formula=agg_res["transparent_formula"],
            explanation=shap_res,
            narrative=narrative_res["narrative"] if isinstance(narrative_res, dict) else narrative_res,
        )

    data_quality_status = "COMPLETE"
    if matched_self_count == 0:
        data_quality_status = "INSUFFICIENT"
    elif unknown_self_count > 0 or len(payload.family_members) == 0:
        data_quality_status = "PARTIAL"

    total_provided_all = len(self_biomarker_map) + sum(
        len(_extract_biomarkers_dict(f.biomarkers)) for f in payload.family_members
    )

    quality_summary = DataQualitySummarySchema(
        status=data_quality_status,
        total_biomarkers_provided=total_provided_all,
        matched_biomarkers_count=matched_self_count,
        unknown_biomarkers_count=unknown_self_count,
        family_members_count=len(payload.family_members),
        genetic_members_with_data=sum(1 for f in normalized_family_list if f["biomarkers"]),
    )

    elapsed_ms = round((time.time() - start_time) * 1000, 2)

    return HereditaryRiskAssessmentResponse(
        request_id=req_id,
        user_id=payload.user_id,
        patient_name=payload.patient_name or "Patient",
        computed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        diseases=disease_results,
        data_quality=quality_summary,
        warnings=warnings,
        processing_time_ms=elapsed_ms,
    )
