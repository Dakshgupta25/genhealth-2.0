"""
Unit tests for Multi-Generational Kinship Weighting and Family Risk Aggregation.
"""

import pytest
from hereditary_risk.app.rules.kinship import (
    KINSHIP_WEIGHTS,
    get_kinship_weight,
    is_genetic_relative,
)
from hereditary_risk.app.rules.family_risk import (
    evaluate_disease_hereditary_risk,
)


def test_kinship_weights_lookup():
    """Verify configured Wright's coefficient kinship weights."""
    # Self (1.0)
    assert get_kinship_weight("self") == 1.0

    # 1st Degree (0.50)
    assert get_kinship_weight("father") == 0.50
    assert get_kinship_weight("mother") == 0.50
    assert get_kinship_weight("brother") == 0.50
    assert get_kinship_weight("sister") == 0.50
    assert get_kinship_weight("son") == 0.50
    assert get_kinship_weight("daughter") == 0.50

    # 2nd Degree (0.25)
    assert get_kinship_weight("grandfather") == 0.25
    assert get_kinship_weight("grandmother") == 0.25
    assert get_kinship_weight("uncle") == 0.25
    assert get_kinship_weight("aunt") == 0.25

    # 3rd Degree (0.125)
    assert get_kinship_weight("cousin") == 0.125
    assert get_kinship_weight("first_cousin") == 0.125

    # Non-genetic Spouse (0.00)
    assert get_kinship_weight("spouse") == 0.00
    assert get_kinship_weight("husband") == 0.00
    assert get_kinship_weight("wife") == 0.00
    assert is_genetic_relative("spouse") is False


def test_multigen_family_tree_aggregation_math():
    """
    Verify exact multi-generational family weighted risk calculation.
    Family tree:
    - Father (1st degree, w=0.50): critical glucose (score 1.0)
    - Uncle (2nd degree, w=0.25): warning glucose (score 0.60)
    - Cousin (3rd degree, w=0.125): normal glucose (score 0.0)
    - Spouse (non-genetic, w=0.00): critical glucose (score 1.0, ignored)

    Expected numerator = (1.0 * 0.50) + (0.60 * 0.25) + (0.0 * 0.125) = 0.50 + 0.15 = 0.65
    Expected denominator = 0.50 + 0.25 + 0.125 = 0.875
    Expected family_weighted_risk = 0.65 / 0.875 = 0.7429
    """
    self_biomarkers = {"fasting_glucose": 90.0}  # Normal self (score 0.0)

    family_list = [
        {"member_id": "f1", "relationship": "father", "biomarkers": {"fasting_glucose": 130.0}},
        {"member_id": "u1", "relationship": "uncle", "biomarkers": {"fasting_glucose": 110.0}},
        {"member_id": "c1", "relationship": "cousin", "biomarkers": {"fasting_glucose": 85.0}},
        {"member_id": "sp1", "relationship": "spouse", "biomarkers": {"fasting_glucose": 150.0}},
    ]

    res = evaluate_disease_hereditary_risk("type_2_diabetes", self_biomarkers, family_list)

    assert res["self_score"] == 0.0
    f_risk = round(0.65 / 0.875, 4)
    assert round(res["family_weighted_risk"], 4) == f_risk

    # Combined formula = 0.60 * 0.0 + 0.40 * 0.7429 = 0.2972
    expected_combined = round(0.40 * f_risk, 4)
    assert round(res["combined_hereditary_score"], 4) == expected_combined
