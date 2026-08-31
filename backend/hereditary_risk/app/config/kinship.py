"""
Kinship Weights and Relationship Definitions.

Based on Wright's Coefficient of Relationship (r).
Distinguishes genetic relationship weights from non-genetic (environmental/household) links.
"""

from typing import Dict, Set

# Genetic relatedness weights (proportion of shared genome)
KINSHIP_WEIGHTS: Dict[str, float] = {
    "self": 1.00,
    "father": 0.50,
    "mother": 0.50,
    "parent": 0.50,
    "brother": 0.50,
    "sister": 0.50,
    "sibling": 0.50,
    "son": 0.50,
    "daughter": 0.50,
    "child": 0.50,
    "grandfather": 0.25,
    "grandmother": 0.25,
    "grandparent": 0.25,
    "uncle": 0.25,
    "aunt": 0.25,
    "cousin": 0.125,
    "first_cousin": 0.125,
    # Non-genetic links have 0.00 genetic inheritance weight by default
    "spouse": 0.00,
    "husband": 0.00,
    "wife": 0.00,
    "partner": 0.00,
    "stepfather": 0.00,
    "stepmother": 0.00,
    "guardian": 0.00,
    "unknown": 0.00,
}

# Explicit set of confirmed genetic relationships
GENETIC_RELATIONSHIPS: Set[str] = {
    "self",
    "father",
    "mother",
    "parent",
    "brother",
    "sister",
    "sibling",
    "son",
    "daughter",
    "child",
    "grandfather",
    "grandmother",
    "grandparent",
    "uncle",
    "aunt",
    "cousin",
    "first_cousin",
}


def get_kinship_weight(relationship: str) -> float:
    """
    Retrieve genetic kinship weight for a given relationship type string.
    Returns 0.00 for unknown or non-genetic relationships.
    """
    rel_clean = relationship.strip().lower().replace(" ", "_")
    return KINSHIP_WEIGHTS.get(rel_clean, 0.00)


def is_genetic_relationship(relationship: str) -> bool:
    """
    Check if relationship is a biological/genetic link.
    """
    rel_clean = relationship.strip().lower().replace(" ", "_")
    return rel_clean in GENETIC_RELATIONSHIPS


# Function aliases for compatibility
is_genetic_relative = is_genetic_relationship
