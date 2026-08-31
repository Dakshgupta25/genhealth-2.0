"""
Unit tests for Layer 4 Clinical Narrative Generator.
"""

import pytest
from hereditary_risk.app.narrative.gemini_narrative import (
    generate_clinical_narrative,
    MANDATORY_DISCLAIMER,
)


class TestClinicalNarrativeGenerator:
    """Test suite for clinical narrative generation and anti-hallucination grounding."""

    def test_template_narrative_generation_and_disclaimer(self):
        evidence = [
            {
                "biomarker_key": "hba1c",
                "display_name": "HbA1c (Glycated Hemoglobin)",
                "numeric_value": 5.8,
                "unit": "%",
                "status": "WARNING",
                "threshold_crossed": 5.7,
                "description": "Prediabetes range >= 5.7%",
            }
        ]

        family_breakdown = [
            {
                "member_id": "father_1",
                "relationship": "father",
                "is_genetic": True,
                "kinship_weight": 0.5,
                "member_rule_score": 1.0,
                "critical_biomarkers": ["hba1c"],
            }
        ]

        formula = "Combined Risk = 0.60 * SelfScore(0.6) + 0.40 * FamilyWeightedRisk(0.5)"

        res = generate_clinical_narrative(
            patient_name="Priyanshu",
            disease_key="type_2_diabetes",
            disease_display_name="Type 2 Diabetes",
            risk_score=0.56,
            risk_label="MODERATE",
            self_rule_score=0.60,
            family_weighted_risk=0.50,
            evidence=evidence,
            family_breakdown=family_breakdown,
            transparent_formula=formula,
        )

        assert "narrative" in res
        assert res["generated_by"] in ("gemini_llm", "deterministic_template_fallback")
        narrative_text = res["narrative"]

        # Grounding checks
        assert "Priyanshu" in narrative_text
        assert "Type 2 Diabetes" in narrative_text
        assert "Father" in narrative_text or "father" in narrative_text
        assert "5.8" in narrative_text

        # Mandatory disclaimer check
        assert MANDATORY_DISCLAIMER in narrative_text or "CLINICAL DISCLAIMER" in narrative_text
