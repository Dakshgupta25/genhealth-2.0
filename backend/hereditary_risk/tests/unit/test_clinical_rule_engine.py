"""
Unit tests for Layer 2 Clinical Threshold Rule Engine.
"""

import pytest
from hereditary_risk.app.rules.clinical_rule_engine import (
    evaluate_biomarker_rule,
    evaluate_disease_rules,
    compute_rule_score,
)
from hereditary_risk.app.config.thresholds import CLINICAL_THRESHOLDS


class TestClinicalRuleEngine:
    def test_t2d_biomarker_thresholds(self):
        t2d_config = CLINICAL_THRESHOLDS["type_2_diabetes"]["hba1c"]

        ev_normal = evaluate_biomarker_rule("hba1c", 5.4, t2d_config)
        assert ev_normal["status"] == "NORMAL"
        assert ev_normal["direction"] == "NORMAL"
        assert ev_normal["threshold_crossed"] is None

        ev_warn = evaluate_biomarker_rule("hba1c", 5.8, t2d_config)
        assert ev_warn["status"] == "WARNING"
        assert ev_warn["direction"] == "HIGH"
        assert ev_warn["threshold_crossed"] == 5.7

        ev_crit = evaluate_biomarker_rule("hba1c", 7.2, t2d_config)
        assert ev_crit["status"] == "CRITICAL"
        assert ev_crit["direction"] == "HIGH"
        assert ev_crit["threshold_crossed"] == 6.5

    def test_low_threshold_direction(self):
        hdl_config = CLINICAL_THRESHOLDS["dyslipidemia"]["hdl"]

        ev_normal = evaluate_biomarker_rule("hdl", 60.0, hdl_config)
        assert ev_normal["status"] == "NORMAL"

        ev_warn_low = evaluate_biomarker_rule("hdl", 45.0, hdl_config)
        assert ev_warn_low["status"] == "WARNING_LOW"
        assert ev_warn_low["direction"] == "LOW"
        assert ev_warn_low["threshold_crossed"] == 50.0

        ev_crit_low = evaluate_biomarker_rule("hdl", 35.0, hdl_config)
        assert ev_crit_low["status"] == "CRITICAL_LOW"
        assert ev_crit_low["direction"] == "LOW"
        assert ev_crit_low["threshold_crossed"] == 40.0

    def test_missing_biomarker_handling(self):
        t2d_config = CLINICAL_THRESHOLDS["type_2_diabetes"]["hba1c"]
        ev_missing = evaluate_biomarker_rule("hba1c", None, t2d_config)
        assert ev_missing["status"] == "MISSING_OR_INVALID"
        assert ev_missing["numeric_value"] is None
        assert ev_missing["threshold_crossed"] is None

    @pytest.mark.parametrize(
        "disease_key",
        [
            "type_2_diabetes",
            "dyslipidemia",
            "hypothyroidism",
            "ckd",
            "anemia",
            "liver_disease",
        ]
    )
    def test_disease_level_evaluation_all_diseases(self, disease_key: str):
        biomarker_sample = {
            "hba1c": 6.8,
            "fasting_glucose": 130.0,
            "total_cholesterol": 250.0,
            "ldl": 170.0,
            "hdl": 35.0,
            "triglycerides": 210.0,
            "tsh": 11.0,
            "creatinine": 1.6,
            "egfr": 50.0,
            "hemoglobin": 9.5,
            "alt": 95.0,
            "ast": 88.0,
        }

        res = evaluate_disease_rules(disease_key, biomarker_sample)
        assert res["disease_key"] == disease_key
        assert res["total_biomarkers_evaluated"] > 0
        assert res["highest_severity"] in ("CRITICAL", "WARNING", "NORMAL", "UNKNOWN")
        assert 0.0 <= res["rule_score"] <= 1.0
        assert len(res["evidence"]) == res["total_biomarkers_evaluated"]

    def test_rule_score_calculation(self):
        evidence_list = [
            {"status": "CRITICAL"},
            {"status": "WARNING"},
            {"status": "NORMAL"},
            {"status": "MISSING_OR_INVALID"},
        ]
        score = compute_rule_score(evidence_list)
        assert score == 0.533
