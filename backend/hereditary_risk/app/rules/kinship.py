"""
Layer 2 Rules Kinship Wrapper.
Re-exports kinship configuration and helper functions.
"""

from hereditary_risk.app.config.kinship import (
    KINSHIP_WEIGHTS,
    GENETIC_RELATIONSHIPS,
    get_kinship_weight,
    is_genetic_relationship,
    is_genetic_relative,
)

__all__ = [
    "KINSHIP_WEIGHTS",
    "GENETIC_RELATIONSHIPS",
    "get_kinship_weight",
    "is_genetic_relationship",
    "is_genetic_relative",
]
