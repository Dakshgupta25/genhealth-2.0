"""
Unit tests for Extreme Value Validation, Out-of-Range Guardrails, and Invalid Inputs.
"""

import pytest
import math
from hereditary_risk.app.normalization.aliasing import (
    normalize_biomarker_input,
    parse_numeric_value,
)
from hereditary_risk.app.rules.clinical_rule_engine import (
    evaluate_biomarker_rule,
)


def test_parse_extreme_numeric_values():
    """Verify parsing behavior for extreme, zero, and negative numeric values."""
    # Extremely high physiological value (9999 mg/dL)
    assert parse_numeric_value(9999.0) == 9999.0
    assert parse_numeric_value("9999.0 mg/dL") == 9999.0

    # Negative value
    assert parse_numeric_value(-50.0) == -50.0

    # Zero value
    assert parse_numeric_value(0.0) == 0.0

    # Clean numeric string with commas
    assert parse_numeric_value("1,250 mg/dL") == 1250.0


def test_parse_invalid_and_malformed_inputs():
    """Verify that NaN, Infinity, and malformed strings return None."""
    assert parse_numeric_value(float("nan")) is None
    assert parse_numeric_value(float("inf")) is None
    assert parse_numeric_value(float("-inf")) is None
    assert parse_numeric_value("invalid_string_val") is None
    assert parse_numeric_value("95.5.4.3") is None
    assert parse_numeric_value(None) is None
    assert parse_numeric_value("") is None


def test_extreme_value_clinical_rule_evaluation():
    """Verify clinical rule evaluation under extreme laboratory inputs."""
    # Extreme glucose (9999 mg/dL) should trigger CRITICAL
    res_high = evaluate_biomarker_rule("fasting_glucose", 9999.0)
    assert res_high["status"] == "CRITICAL"
    assert res_high["severity_score"] == 1.0

    # Negative glucose (-50 mg/dL) should return MISSING_OR_INVALID or handle safely
    res_neg = evaluate_biomarker_rule("fasting_glucose", -50.0)
    assert res_neg["status"] == "MISSING_OR_INVALID"

    # NaN value should return MISSING_OR_INVALID
    res_nan = evaluate_biomarker_rule("fasting_glucose", None)
    assert res_nan["status"] == "MISSING_OR_INVALID"
    assert res_nan["severity_score"] == 0.0


def test_normalization_with_malformed_inputs():
    """Verify end-to-end normalization response for invalid inputs."""
    res = normalize_biomarker_input("Fasting Blood Sugar", "abc_invalid")
    assert res["status"] == "matched"
    assert res["canonical_key"] == "fasting_glucose"
    assert res["numeric_value"] is None
    assert res["is_valid_value"] is False
