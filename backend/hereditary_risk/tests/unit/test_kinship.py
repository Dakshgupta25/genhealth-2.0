"""
Unit tests for Kinship Weights and Relationship Classification.
"""

import pytest
from hereditary_risk.app.config.kinship import (
    KINSHIP_WEIGHTS,
    get_kinship_weight,
    is_genetic_relationship,
)


class TestKinshipConfig:
    @pytest.mark.parametrize(
        "relationship, expected_weight, expected_genetic",
        [
            ("self", 1.00, True),
            ("father", 0.50, True),
            ("mother", 0.50, True),
            ("brother", 0.50, True),
            ("sister", 0.50, True),
            ("son", 0.50, True),
            ("daughter", 0.50, True),
            ("grandfather", 0.25, True),
            ("grandmother", 0.25, True),
            ("uncle", 0.25, True),
            ("aunt", 0.25, True),
            ("cousin", 0.125, True),
            ("spouse", 0.00, False),
            ("husband", 0.00, False),
            ("wife", 0.00, False),
            ("partner", 0.00, False),
            ("stepfather", 0.00, False),
            ("unknown_link", 0.00, False),
        ]
    )
    def test_kinship_weights_and_classification(
        self, relationship: str, expected_weight: float, expected_genetic: bool
    ):
        weight = get_kinship_weight(relationship)
        genetic_flag = is_genetic_relationship(relationship)

        assert weight == expected_weight
        assert genetic_flag == expected_genetic
