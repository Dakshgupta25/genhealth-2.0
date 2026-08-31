"""
Unit tests for Layer 1 Biomarker Name Normalizer.
"""

import pytest
from hereditary_risk.app.normalization.biomarker_normalizer import normalize_biomarker_name


class TestBiomarkerNameNormalizer:
    @pytest.mark.parametrize(
        "raw_input, expected_canonical",
        [
            ("hba1c", "hba1c"),
            ("hb a1c", "hba1c"),
            ("hb-a1c", "hba1c"),
            ("glycated haemoglobin", "hba1c"),
            ("glycated hemoglobin", "hba1c"),
            ("glycosylated hemoglobin", "hba1c"),
            ("hemoglobin a1c", "hba1c"),
            ("A1C", "hba1c"),
            ("blood sugar fasting", "fasting_glucose"),
            ("fasting blood glucose", "fasting_glucose"),
            ("fasting blood sugar", "fasting_glucose"),
            ("FBS", "fasting_glucose"),
            ("fasting glucose", "fasting_glucose"),
            ("PPBS", "postprandial_glucose"),
            ("post prandial blood sugar", "postprandial_glucose"),
            ("total cholesterol", "total_cholesterol"),
            ("serum cholesterol", "total_cholesterol"),
            ("LDL cholesterol", "ldl"),
            ("LDL-C", "ldl"),
            ("low density lipoprotein", "ldl"),
            ("HDL-C", "hdl"),
            ("high density lipoprotein", "hdl"),
            ("triglycerides", "triglycerides"),
            ("serum triglycerides", "triglycerides"),
            ("serum creatinine", "creatinine"),
            ("creatinine", "creatinine"),
            ("blood urea nitrogen", "bun"),
            ("BUN", "bun"),
            ("uric acid", "uric_acid"),
            ("serum uric acid", "uric_acid"),
            ("eGFR", "egfr"),
            ("estimated gfr", "egfr"),
            ("SGPT", "alt"),
            ("ALT", "alt"),
            ("alanine aminotransferase", "alt"),
            ("SGOT", "ast"),
            ("AST", "ast"),
            ("ALP", "alp"),
            ("alkaline phosphatase", "alp"),
            ("total bilirubin", "bilirubin_total"),
            ("bilirubin total", "bilirubin_total"),
            ("GGT", "ggt"),
            ("TSH", "tsh"),
            ("thyroid stimulating hormone", "tsh"),
            ("T3", "t3"),
            ("T4", "t4"),
            ("free T4", "free_t4"),
            ("FT4", "free_t4"),
            ("haemoglobin", "hemoglobin"),
            ("Hemoglobin", "hemoglobin"),
            ("Hb", "hemoglobin"),
            ("MCV", "mcv"),
            ("MCH", "mch"),
            ("ferritin", "ferritin"),
            ("serum iron", "serum_iron"),
        ]
    )
    def test_known_aliases_normalization(self, raw_input: str, expected_canonical: str):
        result = normalize_biomarker_name(raw_input)
        assert result["status"] == "matched"
        assert result["canonical_key"] == expected_canonical
        assert result["raw_name"] == raw_input
        assert result["display_name"] is not None

    @pytest.mark.parametrize(
        "unknown_input",
        [
            "Unknown Bio Test 99",
            "Random Chemical Index",
            "Custom Lab Measurement X",
            "12345",
            "",
            None,
        ]
    )
    def test_unknown_biomarker_handling(self, unknown_input):
        result = normalize_biomarker_name(unknown_input)
        assert result["status"] == "unknown"
        assert result["canonical_key"] is None
        assert result["display_name"] is None
        assert result["raw_name"] == (str(unknown_input) if unknown_input is not None else "")
