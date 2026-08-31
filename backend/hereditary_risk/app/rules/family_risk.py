"""
Layer 2 Subsystem: Kinship-Weighted Family Risk Aggregation.
"""

from typing import Dict, List, Optional, TypedDict, Any
from hereditary_risk.app.config.kinship import KINSHIP_WEIGHTS, get_kinship_weight, is_genetic_relationship
from hereditary_risk.app.config.diseases import get_disease_heritability_reference
from hereditary_risk.app.rules.clinical_rule_engine import evaluate_disease_rules, DiseaseRuleEvaluationResult, BiomarkerRuleEvidence


class FamilyMemberBiomarkerInput(TypedDict):
    member_id: str
    relationship: str
    biomarkers: Dict[str, Optional[float]]


class FamilyMemberRiskContribution(TypedDict):
    member_id: str
    relationship: str
    is_genetic: bool
    kinship_weight: float
    member_rule_score: float
    weighted_contribution: float
    biomarkers_provided: List[str]
    critical_biomarkers: List[str]
    supporting_evidence: List[BiomarkerRuleEvidence]


class FamilyDiseaseAggregationResult(TypedDict):
    disease_key: str
    self_score: float
    self_rule_score: float
    family_weighted_risk: float
    heritability_estimate: float
    genetic_bump: float
    combined_hereditary_score: float
    risk_label: str
    highest_severity: str
    total_family_members_evaluated: int
    genetic_members_count: int
    non_genetic_members_count: int
    self_rule_evidence: List[BiomarkerRuleEvidence]
    family_breakdown: List[FamilyMemberRiskContribution]
    member_breakdown: List[FamilyMemberRiskContribution]
    formula_breakdown: Dict[str, Any]
    transparent_formula: str


def calculate_risk_label(score: float) -> str:
    if score >= 0.66:
        return "HIGH"
    elif score >= 0.33:
        return "MODERATE"
    return "LOW"


def aggregate_family_disease_risk(
    disease_key: str,
    self_biomarkers: Dict[str, Optional[float]],
    family_members: List[FamilyMemberBiomarkerInput],
) -> FamilyDiseaseAggregationResult:
    self_eval: DiseaseRuleEvaluationResult = evaluate_disease_rules(disease_key, self_biomarkers)
    self_score = self_eval["rule_score"]

    member_breakdown: List[FamilyMemberRiskContribution] = []
    total_family_weight = 0.0
    weighted_score_sum = 0.0
    genetic_count = 0
    non_genetic_count = 0

    for fm in family_members:
        rel = fm.get("relationship", "unknown")
        member_id = fm.get("member_id", f"member_{len(member_breakdown)+1}")
        biomarkers = fm.get("biomarkers", {})

        weight = get_kinship_weight(rel)
        genetic_flag = is_genetic_relationship(rel)

        if genetic_flag:
            genetic_count += 1
        else:
            non_genetic_count += 1

        fm_eval = evaluate_disease_rules(disease_key, biomarkers)
        fm_score = fm_eval["rule_score"]

        weighted_contrib = round(fm_score * weight, 4)

        crit_markers = [
            e["biomarker_key"]
            for e in fm_eval["evidence"]
            if e["status"] in ("CRITICAL", "CRITICAL_LOW", "WARNING", "WARNING_LOW")
        ]

        member_breakdown.append({
            "member_id": member_id,
            "relationship": rel,
            "is_genetic": genetic_flag,
            "kinship_weight": weight,
            "member_rule_score": fm_score,
            "weighted_contribution": weighted_contrib,
            "biomarkers_provided": list(biomarkers.keys()),
            "critical_biomarkers": crit_markers,
            "supporting_evidence": fm_eval["evidence"],
        })

        has_member_data = bool(biomarkers) or (
            fm_eval["critical_count"] + fm_eval["warning_count"] + fm_eval["normal_count"] > 0
        )

        if genetic_flag and weight > 0.0 and has_member_data:
            total_family_weight += weight
            weighted_score_sum += (fm_score * weight)

    if total_family_weight > 0.0:
        family_weighted_risk = round(weighted_score_sum / total_family_weight, 4)
    else:
        family_weighted_risk = 0.0

    # Retrieve disease-specific heritability consensus reference
    h2 = get_disease_heritability_reference(disease_key)
    if h2 is None:
        h2 = 0.50

    # Option C: Bayesian Asymmetric Floor Formula
    # Combined Score = max(S_self, S_self + (1.0 - S_self) * (0.5 * h^2 * R_fam))
    # This guarantees abnormal personal labs are NEVER diluted by good family history,
    # while normal personal labs receive an additive bump scaled by disease heritability and family risk.
    if genetic_count > 0 and total_family_weight > 0.0 and family_weighted_risk > 0.0:
        genetic_bump = round((1.0 - self_score) * (0.5 * h2 * family_weighted_risk), 4)
        combined_score = round(max(self_score, self_score + genetic_bump), 4)

        formula_breakdown = {
            "personal_score": self_score,
            "family_weighted_risk": family_weighted_risk,
            "heritability_estimate": h2,
            "genetic_bump": genetic_bump,
            "combined_score": combined_score,
            "mode": "asymmetric_bayesian_floor",
        }

        formula_str = (
            f"Your lab results score: {self_score*100:.1f}%. "
            f"Family history adds an additional +{genetic_bump*100:.1f}% based on your linked relatives' "
            f"disease history and this condition's {h2*100:.0f}% heritability (h²). "
            f"Combined estimate: {combined_score*100:.1f}%."
        )
    elif self_score > 0.0:
        genetic_bump = 0.0
        combined_score = self_score
        formula_breakdown = {
            "personal_score": self_score,
            "family_weighted_risk": 0.0,
            "heritability_estimate": h2,
            "genetic_bump": 0.0,
            "combined_score": self_score,
            "mode": "personal_labs_only",
        }
        formula_str = (
            f"Your lab results score: {self_score*100:.1f}%. "
            f"No genetic family risk detected or linked. Combined estimate: {combined_score*100:.1f}%."
        )
    else:
        genetic_bump = 0.0
        combined_score = 0.0
        formula_breakdown = {
            "personal_score": 0.0,
            "family_weighted_risk": 0.0,
            "heritability_estimate": h2,
            "genetic_bump": 0.0,
            "combined_score": 0.0,
            "mode": "baseline_normal",
        }
        formula_str = "Personal lab biomarkers and linked family risk are in optimal ranges (0.0%)."

    risk_label = calculate_risk_label(combined_score)

    return {
        "disease_key": disease_key,
        "self_score": self_score,
        "self_rule_score": self_score,
        "family_weighted_risk": family_weighted_risk,
        "heritability_estimate": h2,
        "genetic_bump": genetic_bump,
        "combined_hereditary_score": combined_score,
        "risk_label": risk_label,
        "highest_severity": self_eval["highest_severity"],
        "total_family_members_evaluated": len(family_members),
        "genetic_members_count": genetic_count,
        "non_genetic_members_count": non_genetic_count,
        "self_rule_evidence": self_eval["evidence"],
        "family_breakdown": member_breakdown,
        "member_breakdown": member_breakdown,
        "formula_breakdown": formula_breakdown,
        "transparent_formula": formula_str,
    }


# Function alias for backwards compatibility
evaluate_disease_hereditary_risk = aggregate_family_disease_risk
