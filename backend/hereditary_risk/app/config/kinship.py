"""
Kinship Weights and Relationship Definitions.

Based on Wright's Coefficient of Relationship (r).
Distinguishes genetic relationship weights from non-genetic (environmental/household) links.
"""

from typing import Dict, Set

# Genetic relatedness weights (proportion of shared genome based on Wright's coefficient r)
KINSHIP_WEIGHTS: Dict[str, float] = {
    # 1st Degree Relatives (r = 0.50)
    "self": 1.00,
    "father": 0.50,
    "mother": 0.50,
    "parent": 0.50,
    "brother": 0.50,
    "sister": 0.50,
    "sibling": 0.50,
    "full_sibling": 0.50,
    "full_brother": 0.50,
    "full_sister": 0.50,
    "son": 0.50,
    "daughter": 0.50,
    "child": 0.50,
    # 2nd Degree Relatives (r = 0.25)
    "half_sibling": 0.25,
    "half_brother": 0.25,
    "half_sister": 0.25,
    "grandfather": 0.25,
    "grandmother": 0.25,
    "grandparent": 0.25,
    "grandson": 0.25,
    "granddaughter": 0.25,
    "grandchild": 0.25,
    "uncle": 0.25,
    "aunt": 0.25,
    "nephew": 0.25,
    "niece": 0.25,
    # 3rd Degree Relatives (r = 0.125)
    "cousin": 0.125,
    "first_cousin": 0.125,
    "great_grandfather": 0.125,
    "great_grandmother": 0.125,
    "great_grandparent": 0.125,
    "great_grandson": 0.125,
    "great_granddaughter": 0.125,
    "great_grandchild": 0.125,
    # Non-genetic links have 0.00 genetic inheritance weight by default
    "spouse": 0.00,
    "husband": 0.00,
    "wife": 0.00,
    "partner": 0.00,
    "stepfather": 0.00,
    "stepmother": 0.00,
    "stepbrother": 0.00,
    "stepsister": 0.00,
    "stepchild": 0.00,
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
    "full_sibling",
    "full_brother",
    "full_sister",
    "son",
    "daughter",
    "child",
    "half_sibling",
    "half_brother",
    "half_sister",
    "grandfather",
    "grandmother",
    "grandparent",
    "grandson",
    "granddaughter",
    "grandchild",
    "uncle",
    "aunt",
    "nephew",
    "niece",
    "cousin",
    "first_cousin",
    "great_grandfather",
    "great_grandmother",
    "great_grandparent",
    "great_grandson",
    "great_granddaughter",
    "great_grandchild",
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
