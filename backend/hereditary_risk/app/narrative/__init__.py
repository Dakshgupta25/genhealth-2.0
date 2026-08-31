"""Narrative Generation Package Init."""

from hereditary_risk.app.narrative.gemini_narrative import (
    generate_clinical_narrative,
    ClinicalNarrativeResult,
)

__all__ = [
    "generate_clinical_narrative",
    "ClinicalNarrativeResult",
]
