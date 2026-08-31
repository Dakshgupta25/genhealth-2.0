"""
Disease Registry and Epidemiological Heritability Metadata Definitions.
"""

from typing import Dict, TypedDict, List, Optional


class DiseaseMetadata(TypedDict):
    disease_key: str
    display_name: str
    category: str
    heritability_estimate: float         # Narrow-sense epidemiological population heritability (h^2) reference
    heritability_range_text: str
    primary_biomarkers: List[str]
    description: str


DISEASE_REGISTRY: Dict[str, DiseaseMetadata] = {
    "type_2_diabetes": {
        "disease_key": "type_2_diabetes",
        "display_name": "Type 2 Diabetes",
        "category": "Endocrine & Metabolic",
        "heritability_estimate": 0.50,
        "heritability_range_text": "40-60%",
        "primary_biomarkers": ["hba1c", "fasting_glucose", "postprandial_glucose", "triglycerides"],
        "description": "Chronic condition affecting glucose metabolism and insulin sensitivity.",
    },
    "dyslipidemia": {
        "disease_key": "dyslipidemia",
        "display_name": "Dyslipidemia / Hyperlipidemia",
        "category": "Cardiovascular & Lipid",
        "heritability_estimate": 0.55,
        "heritability_range_text": "50-60%",
        "primary_biomarkers": ["total_cholesterol", "ldl", "hdl", "triglycerides"],
        "description": "Abnormal levels of lipids (fats) in the blood.",
    },
    "hypothyroidism": {
        "disease_key": "hypothyroidism",
        "display_name": "Hypothyroidism",
        "category": "Thyroid",
        "heritability_estimate": 0.63,
        "heritability_range_text": "60-67%",
        "primary_biomarkers": ["tsh", "t3", "t4", "free_t4"],
        "description": "Underactive thyroid gland producing insufficient thyroid hormones.",
    },
    "ckd": {
        "disease_key": "ckd",
        "display_name": "Chronic Kidney Disease (CKD)",
        "category": "Renal",
        "heritability_estimate": 0.35,
        "heritability_range_text": "30-40%",
        "primary_biomarkers": ["creatinine", "bun", "egfr", "uric_acid"],
        "description": "Gradual loss of kidney function over time.",
    },
    "anemia": {
        "disease_key": "anemia",
        "display_name": "Anemia (Iron Deficiency / Microcytic)",
        "category": "Hematology",
        "heritability_estimate": 0.55,
        "heritability_range_text": "40-70%",
        "primary_biomarkers": ["hemoglobin", "mcv", "mch", "ferritin", "serum_iron"],
        "description": "Lack of healthy red blood cells or hemoglobin.",
    },
    "liver_disease": {
        "disease_key": "liver_disease",
        "display_name": "Hepatic Dysfunction / NAFLD Risk",
        "category": "Hepatic",
        "heritability_estimate": 0.40,
        "heritability_range_text": "30-50%",
        "primary_biomarkers": ["alt", "ast", "alp", "bilirubin_total", "ggt"],
        "description": "Liver cell injury, inflammation, or cholestatic dysfunction.",
    },
}


def get_disease_metadata(disease_key: str) -> DiseaseMetadata:
    """Retrieve metadata dict for a disease key."""
    if disease_key not in DISEASE_REGISTRY:
        raise ValueError(f"Unknown disease key '{disease_key}'.")
    return DISEASE_REGISTRY[disease_key]


def get_disease_heritability_reference(disease_key: str) -> Optional[float]:
    """Retrieve population narrow-sense heritability (h^2) reference estimate."""
    meta = DISEASE_REGISTRY.get(disease_key)
    return meta["heritability_estimate"] if meta else None
