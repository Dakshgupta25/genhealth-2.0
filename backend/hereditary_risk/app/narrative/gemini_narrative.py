"""
Layer 4: LLM-Driven Clinical Narrative Generator.

Converts structured clinical evidence, kinship family contributions, mathematical formulas,
and SHAP feature explanations into an empathetic, professional clinical summary.

Guarantees:
1. Strict Anti-Hallucination Grounding: Cites provided evidence only.
2. Mandatory Clinical Disclaimer included in all narratives.
3. High-Quality Deterministic Template Fallback if GEMINI_API_KEY is unset or API is unreachable.
"""

import os
from typing import Dict, List, Optional, TypedDict, Any, Union
from hereditary_risk.app.config.settings import settings

# Attempt Google Gemini SDK import
GENAI_SDK = None
try:
    import google.generativeai as genai
    api_key = (
        getattr(settings, "GEMINI_API_KEY", None)
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )
    if api_key:
        genai.configure(api_key=api_key)
        GENAI_SDK = "google.generativeai"
except Exception:
    GENAI_SDK = None


class ClinicalNarrativeResult(TypedDict):
    narrative: str
    generated_by: str                    # "gemini_llm" | "deterministic_template_fallback"
    disclaimer: str


MANDATORY_DISCLAIMER = (
    "CLINICAL DISCLAIMER: This hereditary risk assessment is for informational and risk-stratification "
    "purposes only. It is generated from reported laboratory measurements and family history data using "
    "clinical guideline thresholds and kinship weighting models. It does NOT constitute a formal diagnosis, "
    "medical prognosis, or therapeutic recommendation. Please review these findings with a licensed healthcare provider."
)


def _generate_template_narrative(
    patient_name: str,
    disease_display_name: str,
    risk_score: float,
    risk_label: str,
    self_rule_score: float,
    family_weighted_risk: float,
    evidence: List[Dict[str, Any]],
    family_breakdown: List[Dict[str, Any]],
    transparent_formula: str,
    shap_explanation: Optional[Dict[str, Any]],
) -> str:
    """Generate high-quality, structured deterministic narrative as fallback."""
    lines = []
    lines.append(f"### Hereditary Risk Summary: {disease_display_name}")
    lines.append(f"**Patient Name:** {patient_name}")
    lines.append(f"**Assessed Hereditary Risk Level:** {risk_label} (Combined Risk Score: {risk_score:.2f})")
    lines.append("")

    lines.append("#### 1. Patient Laboratory Biomarkers")
    if evidence:
        for ev in evidence:
            status = ev.get("status", "NORMAL")
            b_name = ev.get("display_name", ev.get("biomarker_key", "Biomarker"))
            val = ev.get("numeric_value")
            unit = ev.get("unit", "")
            thresh = ev.get("threshold_crossed")
            desc = ev.get("description", "")

            if val is not None:
                lines.append(f"- **{b_name}:** {val} {unit} `[{status}]` (Crossed Threshold: {thresh} {unit})")
                if desc:
                    lines.append(f"  *Guideline Note:* {desc}")
            else:
                lines.append(f"- **{b_name}:** Not provided `[MISSING]`")
    else:
        lines.append("- No patient laboratory biomarkers were provided for this disease category.")
    lines.append("")

    lines.append("#### 2. Family Kinship Evidence")
    genetic_members = [m for m in family_breakdown if m.get("is_genetic", False)]
    if genetic_members:
        for m in genetic_members:
            rel = m.get("relationship", "relative").title()
            w = m.get("kinship_weight", 0.0)
            score = m.get("member_rule_score", 0.0)
            crit = m.get("critical_biomarkers", [])

            crit_str = f" (Elevated Markers: {', '.join(crit)})" if crit else " (Normal ranges)"
            lines.append(f"- **{rel}** (Genetic Kinship Weight: {w:.2f}): Clinical Score {score:.2f}{crit_str}")
    else:
        lines.append("- No genetic family member history was reported for evaluation.")
    lines.append("")

    lines.append("#### 3. Mathematical Formula")
    lines.append(f"```text\n{transparent_formula}\n```")
    lines.append("")

    if shap_explanation and shap_explanation.get("top_positive_features"):
        lines.append("#### 4. Primary Risk Factors (Feature Impact)")
        for feat in shap_explanation["top_positive_features"]:
            f_name = feat.get("feature", "Biomarker")
            f_val = feat.get("feature_value", 0.0)
            s_val = feat.get("shap_value", 0.0)
            lines.append(f"- **{f_name}** (Value: {f_val}): +{s_val:.3f} risk contribution")
        lines.append("")

    lines.append("---")
    lines.append(MANDATORY_DISCLAIMER)

    return "\n".join(lines)


def generate_clinical_narrative(
    patient_name: str = "Patient",
    disease_key: str = "",
    disease_display_name: str = "",
    risk_score: float = 0.0,
    risk_label: str = "LOW",
    self_rule_score: float = 0.0,
    family_weighted_risk: float = 0.0,
    evidence: Optional[List[Dict[str, Any]]] = None,
    rule_evidence: Optional[List[Dict[str, Any]]] = None,
    family_breakdown: Optional[List[Dict[str, Any]]] = None,
    transparent_formula: str = "",
    shap_explanation: Optional[Dict[str, Any]] = None,
    enable_llm: bool = True,
    *args,
    **kwargs,
) -> ClinicalNarrativeResult:
    """
    Generate a grounded clinical narrative.
    Tries Gemini LLM if configured and enabled; otherwise uses deterministic template fallback.
    Returns ClinicalNarrativeResult dictionary.
    """
    ev_list = rule_evidence if rule_evidence is not None else (evidence or [])
    fb_list = family_breakdown or []

    # 1. Try Gemini LLM if available and API key present and LLM enabled
    api_key = (
        getattr(settings, "GEMINI_API_KEY", None)
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )
    if enable_llm and GENAI_SDK and api_key:
        try:
            prompt_context = f"""
You are an expert clinical geneticist and medical communicator.
Generate a professional, clear, and empathetic clinical narrative for a patient's hereditary risk report.

STRICT RULES:
1. Do NOT invent non-existent laboratory values, symptoms, or diagnoses not present in the input.
2. Ground all statements strictly in the provided data.
3. Highlight patient biomarkers, family contributions, and the transparent combined risk formula.
4. You MUST end your report with the exact mandatory disclaimer provided below.

INPUT DATA:
- Patient Name: {patient_name}
- Disease Evaluated: {disease_display_name}
- Computed Risk Level: {risk_label} (Score: {risk_score:.2f})
- Patient Self Clinical Score: {self_rule_score:.2f}
- Family Kinship Weighted Risk: {family_weighted_risk:.2f}
- Transparent Formula: {transparent_formula}
- Patient Biomarkers: {ev_list}
- Family Breakdown: {fb_list}
- Feature Impact (SHAP): {shap_explanation}

MANDATORY DISCLAIMER TO INCLUDE AT THE END:
"{MANDATORY_DISCLAIMER}"
"""
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt_context)
            if response and response.text:
                return {
                    "narrative": response.text.strip(),
                    "generated_by": "gemini_llm",
                    "disclaimer": MANDATORY_DISCLAIMER,
                }
        except Exception:
            pass

    # 2. Deterministic Template Fallback
    template_text = _generate_template_narrative(
        patient_name=patient_name,
        disease_display_name=disease_display_name,
        risk_score=risk_score,
        risk_label=risk_label,
        self_rule_score=self_rule_score,
        family_weighted_risk=family_weighted_risk,
        evidence=ev_list,
        family_breakdown=fb_list,
        transparent_formula=transparent_formula,
        shap_explanation=shap_explanation,
    )

    return {
        "narrative": template_text,
        "generated_by": "deterministic_template_fallback",
        "disclaimer": MANDATORY_DISCLAIMER,
    }
