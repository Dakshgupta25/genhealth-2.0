"""
Unit tests for Disease Registry Metadata and Heritability Citations.
"""

import pytest
from hereditary_risk.app.config.diseases import (
    DISEASE_REGISTRY,
    get_disease_metadata,
    get_disease_heritability_reference,
)


class TestDiseaseMetadataAndCitations:

    @pytest.mark.parametrize(
        "disease_key",
        [
            "type_2_diabetes",
            "dyslipidemia",
            "hypothyroidism",
            "ckd",
            "anemia",
            "liver_disease",
        ],
    )
    def test_all_diseases_have_defensible_citations_and_guidelines(self, disease_key: str):
        meta = get_disease_metadata(disease_key)
        assert meta["disease_key"] == disease_key
        assert meta["display_name"] is not None
        assert meta["category"] is not None

        # Verify heritability estimate is bounded
        h2 = meta["heritability_estimate"]
        assert 0.0 < h2 < 1.0
        assert get_disease_heritability_reference(disease_key) == h2

        # Verify heritability range text exists and reflects literature variance
        assert "%" in meta["heritability_range_text"]

        # Verify defensible clinical guideline and citation exist
        assert "clinical_guideline" in meta and len(meta["clinical_guideline"]) > 10
        assert "citation" in meta and len(meta["citation"]) > 15
        assert len(meta["primary_biomarkers"]) > 0

    def test_unknown_disease_raises(self):
        with pytest.raises(ValueError):
            get_disease_metadata("unsupported_disease_123")
