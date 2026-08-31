"""
Unit tests for Kinship-Weighted Family Risk Aggregation.
"""

import pytest
from hereditary_risk.app.rules.family_risk import (
    aggregate_family_disease_risk,
    calculate_risk_label,
)


class TestFamilyRiskAggregation:
    def test_diabetic_family_aggregation(self):
        self_biomarkers = {"hba1c": 5.8, "fasting_glucose": 102.0}

        family_members = [
            {
                "member_id": "father_1",
                "relationship": "father",
                "biomarkers": {"hba1c": 7.2, "fasting_glucose": 140.0},
            },
            {
                "member_id": "mother_1",
                "relationship": "mother",
                "biomarkers": {"hba1c": 5.2, "fasting_glucose": 88.0},
            },
            {
                "member_id": "spouse_1",
                "relationship": "spouse",
                "biomarkers": {"hba1c": 7.5, "fasting_glucose": 150.0},
            },
        ]

        res = aggregate_family_disease_risk("type_2_diabetes", self_biomarkers, family_members)

        assert res["disease_key"] == "type_2_diabetes"
        assert res["self_rule_score"] > 0.0
        assert res["total_family_members_evaluated"] == 3
        assert res["genetic_members_count"] == 2
        assert res["non_genetic_members_count"] == 1

        assert res["family_weighted_risk"] == 0.5
        assert res["combined_hereditary_score"] > 0.0
        assert res["risk_label"] in ("MODERATE", "HIGH")
        assert "Combined Risk =" in res["transparent_formula"]

    def test_spouse_zero_genetic_weight(self):
        self_biomarkers = {"hba1c": 5.2}
        family_members = [
            {
                "member_id": "spouse_1",
                "relationship": "spouse",
                "biomarkers": {"hba1c": 8.0},
            }
        ]

        res = aggregate_family_disease_risk("type_2_diabetes", self_biomarkers, family_members)

        assert res["family_weighted_risk"] == 0.0
        assert res["combined_hereditary_score"] == res["self_rule_score"]

    @pytest.mark.parametrize(
        "score, expected_label",
        [
            (0.10, "LOW"),
            (0.32, "LOW"),
            (0.33, "MODERATE"),
            (0.50, "MODERATE"),
            (0.65, "MODERATE"),
            (0.66, "HIGH"),
            (0.95, "HIGH"),
        ]
    )
    def test_risk_label_classification(self, score: float, expected_label: str):
        assert calculate_risk_label(score) == expected_label
