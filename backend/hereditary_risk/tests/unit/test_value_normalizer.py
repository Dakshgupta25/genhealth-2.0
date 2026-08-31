"""
Unit tests for Layer 1 Biomarker Value and Unit Normalizer.
"""

import pytest
from hereditary_risk.app.normalization.value_normalizer import (
    parse_numeric_value,
    clean_unit_string,
    normalize_biomarker_value,
)


class TestValueNormalizer:
    @pytest.mark.parametrize(
        "raw_val, expected_numeric",
        [
            (5.8, 5.8),
            (120, 120.0),
            ("5.8", 5.8),
            ("126.5", 126.5),
            ("> 126", 126.0),
            ("< 40", 40.0),
            ("~ 5.7", 5.7),
            ("1,250.50", 1250.5),
            ("100 mg/dL", 100.0),
        ]
    )
    def test_parse_numeric_value_success(self, raw_val, expected_numeric):
        result = parse_numeric_value(raw_val)
        assert result == expected_numeric

    @pytest.mark.parametrize(
        "invalid_val",
        [
            "NEGATIVE",
            "REACTIVE",
            "NOT DETECTED",
            "",
            None,
        ]
    )
    def test_parse_numeric_value_invalid(self, invalid_val):
        result = parse_numeric_value(invalid_val)
        assert result is None

    def test_unit_matching_and_provenance(self):
        res1 = normalize_biomarker_value(raw_value="5.8", raw_unit="%", expected_standard_unit="%")
        assert res1["is_valid"] is True
        assert res1["numeric_value"] == 5.8
        assert res1["original_value"] == "5.8"
        assert res1["original_unit"] == "%"
        assert res1["normalized_unit"] == "%"
        assert res1["unit_match"] is True
        assert res1["parsing_notes"] is None

        res2 = normalize_biomarker_value(raw_value="100", raw_unit="mmol/L", expected_standard_unit="mg/dL")
        assert res2["is_valid"] is True
        assert res2["numeric_value"] == 100.0
        assert res2["unit_match"] is False
        assert "Unit mismatch" in res2["parsing_notes"]
