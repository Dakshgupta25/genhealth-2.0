"""
Layer 2: Clinical Threshold Rule Engine.
"""

from typing import Dict, List, Optional, TypedDict, Any
from hereditary_risk.app.config.thresholds import CLINICAL_THRESHOLDS, BiomarkerThreshold
from hereditary_risk.app.config.biomarkers import CANONICAL_BIOMARKERS
from hereditary_risk.app.config.diseases import DISEASE_REGISTRY


class BiomarkerRuleEvidence(TypedDict):
    biomarker_key: str
    display_name: str
    numeric_value: Optional[float]
    unit: str
    status: str
    direction: str
    severity_score: float
    threshold_crossed: Optional[float]
    description: str


class DiseaseRuleEvaluationResult(TypedDict):
    disease_key: str
    total_biomarkers_evaluated: int
    critical_count: int
    warning_count: int
    normal_count: int
    missing_count: int
    highest_severity: str
    rule_score: float
    evidence: List[BiomarkerRuleEvidence]


def evaluate_biomarker_rule(
    biomarker_key: str,
    numeric_value: Optional[float],
    threshold_config: Optional[BiomarkerThreshold] = None,
) -> BiomarkerRuleEvidence:
    if threshold_config is None:
        threshold_config = CLINICAL_THRESHOLDS.get(biomarker_key, {})

    meta = CANONICAL_BIOMARKERS.get(biomarker_key, {})
    display_name = meta.get("display_name", biomarker_key)
    standard_unit = threshold_config.get("unit", meta.get("standard_unit", ""))
    
    traceability = threshold_config.get("traceability", {})
    description = traceability.get("notes", threshold_config.get("description", ""))

    if numeric_value is None:
        return {
            "biomarker_key": biomarker_key,
            "display_name": display_name,
            "numeric_value": None,
            "unit": standard_unit,
            "status": "MISSING_OR_INVALID",
            "direction": "NONE",
            "severity_score": 0.0,
            "threshold_crossed": None,
            "description": description,
        }

    try:
        val = float(numeric_value)
        if val < 0:
            return {
                "biomarker_key": biomarker_key,
                "display_name": display_name,
                "numeric_value": None,
                "unit": standard_unit,
                "status": "MISSING_OR_INVALID",
                "direction": "NONE",
                "severity_score": 0.0,
                "threshold_crossed": None,
                "description": description,
            }
    except (ValueError, TypeError):
        return {
            "biomarker_key": biomarker_key,
            "display_name": display_name,
            "numeric_value": None,
            "unit": standard_unit,
            "status": "MISSING_OR_INVALID",
            "direction": "NONE",
            "severity_score": 0.0,
            "threshold_crossed": None,
            "description": description,
        }

    # High direction evaluation
    crit_high = threshold_config.get("critical")
    if crit_high is not None and val >= crit_high:
        return {
            "biomarker_key": biomarker_key,
            "display_name": display_name,
            "numeric_value": val,
            "unit": standard_unit,
            "status": "CRITICAL",
            "direction": "HIGH",
            "severity_score": 1.0,
            "threshold_crossed": crit_high,
            "description": description,
        }

    warn_high = threshold_config.get("warning")
    if warn_high is not None and val >= warn_high:
        return {
            "biomarker_key": biomarker_key,
            "display_name": display_name,
            "numeric_value": val,
            "unit": standard_unit,
            "status": "WARNING",
            "direction": "HIGH",
            "severity_score": 0.6,
            "threshold_crossed": warn_high,
            "description": description,
        }

    # Low direction evaluation
    crit_low = threshold_config.get("critical_low")
    if crit_low is not None and val <= crit_low:
        return {
            "biomarker_key": biomarker_key,
            "display_name": display_name,
            "numeric_value": val,
            "unit": standard_unit,
            "status": "CRITICAL_LOW",
            "direction": "LOW",
            "severity_score": 1.0,
            "threshold_crossed": crit_low,
            "description": description,
        }

    warn_low = threshold_config.get("warning_low")
    if warn_low is not None and val <= warn_low:
        return {
            "biomarker_key": biomarker_key,
            "display_name": display_name,
            "numeric_value": val,
            "unit": standard_unit,
            "status": "WARNING_LOW",
            "direction": "LOW",
            "severity_score": 0.6,
            "threshold_crossed": warn_low,
            "description": description,
        }

    return {
        "biomarker_key": biomarker_key,
        "display_name": display_name,
        "numeric_value": val,
        "unit": standard_unit,
        "status": "NORMAL",
        "direction": "NORMAL",
        "severity_score": 0.0,
        "threshold_crossed": None,
        "description": description,
    }


def compute_rule_score(evidence_list: List[BiomarkerRuleEvidence]) -> float:
    valid_evidence = [e for e in evidence_list if e["status"] != "MISSING_OR_INVALID"]
    if not valid_evidence:
        return 0.0

    total_weight = 0.0
    for item in valid_evidence:
        status = item["status"]
        if status in ("CRITICAL", "CRITICAL_LOW"):
            total_weight += 1.0
        elif status in ("WARNING", "WARNING_LOW"):
            total_weight += 0.6

    return min(1.0, round(total_weight / len(valid_evidence), 3))


def evaluate_disease_rules(
    disease_key: str,
    biomarkers: Dict[str, Optional[float]],
) -> DiseaseRuleEvaluationResult:
    # Resolve disease primary biomarkers from DISEASE_REGISTRY or fallback
    d_meta = DISEASE_REGISTRY.get(disease_key)
    disease_thresholds: Dict[str, BiomarkerThreshold] = {}

    if d_meta and "primary_biomarkers" in d_meta:
        for b_key in d_meta["primary_biomarkers"]:
            if b_key in CLINICAL_THRESHOLDS:
                disease_thresholds[b_key] = CLINICAL_THRESHOLDS[b_key]

    if not disease_thresholds:
        # Direct lookup fallback
        disease_thresholds = CLINICAL_THRESHOLDS.get(disease_key, {})

    if not disease_thresholds:
        return {
            "disease_key": disease_key,
            "total_biomarkers_evaluated": 0,
            "critical_count": 0,
            "warning_count": 0,
            "normal_count": 0,
            "missing_count": 0,
            "highest_severity": "UNKNOWN",
            "rule_score": 0.0,
            "evidence": [],
        }

    evidence_list: List[BiomarkerRuleEvidence] = []
    critical_count = 0
    warning_count = 0
    normal_count = 0
    missing_count = 0

    for biomarker_key, threshold_config in disease_thresholds.items():
        numeric_val = biomarkers.get(biomarker_key)
        ev = evaluate_biomarker_rule(biomarker_key, numeric_val, threshold_config)
        evidence_list.append(ev)

        status = ev["status"]
        if status in ("CRITICAL", "CRITICAL_LOW"):
            critical_count += 1
        elif status in ("WARNING", "WARNING_LOW"):
            warning_count += 1
        elif status == "NORMAL":
            normal_count += 1
        else:
            missing_count += 1

    if critical_count > 0:
        highest_severity = "CRITICAL"
    elif warning_count > 0:
        highest_severity = "WARNING"
    elif normal_count > 0:
        highest_severity = "NORMAL"
    else:
        highest_severity = "UNKNOWN"

    rule_score = compute_rule_score(evidence_list)

    return {
        "disease_key": disease_key,
        "total_biomarkers_evaluated": len(disease_thresholds),
        "critical_count": critical_count,
        "warning_count": warning_count,
        "normal_count": normal_count,
        "missing_count": missing_count,
        "highest_severity": highest_severity,
        "rule_score": rule_score,
        "evidence": evidence_list,
    }
