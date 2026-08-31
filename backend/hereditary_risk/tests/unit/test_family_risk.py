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
        assert res["combined_hereditary_score"] >= res["self_rule_score"]
        assert res["risk_label"] in ("MODERATE", "HIGH")
        assert "Your lab results score:" in res["transparent_formula"]
        assert "formula_breakdown" in res

    def test_abnormal_personal_labs_never_diluted_by_good_family_history(self):
        """
        Proof of Option C Asymmetric Floor Property:
        Abnormal personal lab results (e.g. self_score = 0.85) must NEVER be diluted
        by healthy/optimal family history (family_risk = 0.0).
        """
        # Critical personal HbA1c (7.8%) -> self_score ~ 0.80+
        self_biomarkers = {"hba1c": 7.8, "fasting_glucose": 160.0}

        # Healthy genetic relatives
        family_members = [
            {"member_id": "f1", "relationship": "father", "biomarkers": {"hba1c": 5.0, "fasting_glucose": 85.0}},
            {"member_id": "m1", "relationship": "mother", "biomarkers": {"hba1c": 4.9, "fasting_glucose": 82.0}},
        ]

        res = aggregate_family_disease_risk("type_2_diabetes", self_biomarkers, family_members)

        assert res["self_score"] > 0.70
        assert res["family_weighted_risk"] == 0.0
        # Combined score MUST equal self_score, not be diluted down to 0.60 * 0.85 = 0.51
        assert res["combined_hereditary_score"] == res["self_score"]
        assert res["combined_hereditary_score"] >= 0.70

    def test_normal_personal_labs_get_additive_bump_from_bad_family_history(self):
        """
        Proof of Option C Additive Genetic Prior Property:
        Normal personal labs (self_score = 0.0) receive a bounded additive bump
        scaled by disease heritability (h^2) and kinship-weighted family risk.
        For Type 2 Diabetes (h^2 = 0.50), family_risk = 0.80:
        genetic_bump = (1.0 - 0.0) * (0.5 * 0.50 * 0.80) = 0.20
        combined_score = 0.20
        """
        # Normal personal glucose
        self_biomarkers = {"hba1c": 5.2, "fasting_glucose": 88.0}

        # High risk father (score = 1.0)
        family_members = [
            {"member_id": "f1", "relationship": "father", "biomarkers": {"hba1c": 8.5, "fasting_glucose": 190.0}},
        ]

        res = aggregate_family_disease_risk("type_2_diabetes", self_biomarkers, family_members)

        assert res["self_score"] == 0.0
        assert res["family_weighted_risk"] > 0.70
        # Combined score must reflect additive bump from family history
        assert res["combined_hereditary_score"] > 0.0
        assert res["genetic_bump"] > 0.0
        assert res["combined_hereditary_score"] == pytest.approx(res["genetic_bump"], abs=0.01)

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
        assert res["combined_hereditary_score"] == res["self_score"]

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
