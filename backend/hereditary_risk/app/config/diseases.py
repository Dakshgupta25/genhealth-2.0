"""
Disease Registry and Epidemiological Heritability Metadata Definitions.
"""

from typing import Dict, TypedDict, List, Optional


class DiseaseMetadata(TypedDict):
    disease_key: str
    display_name: str
    category: str
    heritability_estimate: float         # Narrow-sense epidemiological population heritability (h^2) consensus reference
    heritability_range_text: str        # Documented literature variance range across cohorts
    clinical_guideline: str             # Leading diagnostic & management clinical guideline
    citation: str                       # Defensible literature source / meta-analysis citation
    primary_biomarkers: List[str]       # Biomarkers evaluated by Layer 2 Clinical Rule Engine
    ml_feature_biomarkers: List[str]    # Biomarkers consumed by Layer 3 XGBoost ML Model
    mandatory_anchors: List[List[str]]  # Sets of mandatory anchor biomarkers (at least one from each sublist required)
    min_required_biomarkers: int        # Minimum genuine un-imputed biomarkers required
    description: str


# Note on Heritability (h^2):
# These values represent narrow-sense / twin-study consensus midpoints (proportion of phenotypic variance
# attributable to additive genetic factors in epidemiological cohorts). Published estimates vary across
# populations (e.g. Type 2 Diabetes ranges 20-80%, CKD ranges 30-75%). They represent population-level
# reference priors and should be communicated as "estimated hereditary contributions", not exact individual figures.
DISEASE_REGISTRY: Dict[str, DiseaseMetadata] = {
    "type_2_diabetes": {
        "disease_key": "type_2_diabetes",
        "display_name": "Type 2 Diabetes",
        "category": "Endocrine & Metabolic",
        "heritability_estimate": 0.50,
        "heritability_range_text": "40-60%",
        "clinical_guideline": "American Diabetes Association (ADA) Standards of Care in Diabetes (2024)",
        "citation": "Ali O. Genetics of type 2 diabetes. World J Diabetes. 2013; Willemsen G et al. Heritability of diabetes. Twin Res Hum Genet. 2015",
        "primary_biomarkers": ["hba1c", "fasting_glucose", "postprandial_glucose", "triglycerides"],
        "ml_feature_biomarkers": ["fasting_glucose", "fasting_insulin", "bmi", "resting_bp", "age"],
        "mandatory_anchors": [["fasting_glucose", "hba1c"]],
        "min_required_biomarkers": 1,
        "description": "Chronic condition affecting glucose metabolism and insulin sensitivity.",
    },
    "dyslipidemia": {
        "disease_key": "dyslipidemia",
        "display_name": "Cardiovascular & Coronary Disease Risk (ASCVD)",
        "category": "Cardiovascular & Lipid",
        "heritability_estimate": 0.55,
        "heritability_range_text": "49-57%",
        "clinical_guideline": "AHA/ACC Guideline on Primary Prevention of Cardiovascular Disease & Cholesterol Management",
        "citation": "Kathiresan S et al. Six new loci associated with blood low-density lipoprotein cholesterol, high-density lipoprotein cholesterol or triglycerides in humans. Nat Genet. 2008; Framingham Heart Study Offspring Cohort CAD Heritability",
        "primary_biomarkers": ["total_cholesterol", "ldl", "hdl", "triglycerides", "fasting_glucose"],
        "ml_feature_biomarkers": ["total_cholesterol", "fasting_glucose", "resting_bp", "age"],
        "mandatory_anchors": [["total_cholesterol", "ldl"]],
        "min_required_biomarkers": 2,
        "description": "Atherosclerotic cardiovascular and coronary disease risk associated with lipid fractions, glycemic regulation, and vascular stress.",
    },
    "hypothyroidism": {
        "disease_key": "hypothyroidism",
        "display_name": "Hypothyroidism",
        "category": "Thyroid",
        "heritability_estimate": 0.63,
        "heritability_range_text": "60-67%",
        "clinical_guideline": "American Thyroid Association (ATA) & AACE Guidelines for Hypothyroidism in Adults (2012)",
        "citation": "Hansen PS et al. The genetic contribution to thyroid function: a Danish twin study. J Clin Endocrinol Metab. 2004; Panicker V et al. Heritability of thyroid function. J Clin Endocrinol Metab. 2011",
        "primary_biomarkers": ["tsh", "t3", "t4", "free_t4"],
        "ml_feature_biomarkers": ["tsh", "t3", "t4", "free_t4"],
        "mandatory_anchors": [["tsh"]],
        "min_required_biomarkers": 1,
        "description": "Underactive thyroid gland producing insufficient thyroid hormones.",
    },
    "ckd": {
        "disease_key": "ckd",
        "display_name": "Chronic Kidney Disease (CKD)",
        "category": "Renal",
        "heritability_estimate": 0.35,
        "heritability_range_text": "30-40%",
        "clinical_guideline": "KDIGO 2023 Clinical Practice Guideline for the Evaluation and Management of CKD",
        "citation": "Fox CS et al. Genome-wide association scan for renal function: the Framingham Heart Study. J Am Soc Nephrol. 2007; Kottgen A et al. Multiple loci associated with indices of renal function and chronic kidney disease. Nat Genet. 2009",
        "primary_biomarkers": ["creatinine", "bun", "egfr", "uric_acid"],
        "ml_feature_biomarkers": ["creatinine", "bun", "hemoglobin", "fasting_glucose"],
        "mandatory_anchors": [["creatinine", "egfr"]],
        "min_required_biomarkers": 2,
        "description": "Gradual loss of kidney function over time.",
    },
    "anemia": {
        "disease_key": "anemia",
        "display_name": "Anemia (Iron Deficiency / Microcytic)",
        "category": "Hematology",
        "heritability_estimate": 0.55,
        "heritability_range_text": "40-70%",
        "clinical_guideline": "World Health Organization (WHO) Guideline on Haemoglobin & Ferritin Concentrations (2011/2020)",
        "citation": "Whitfield JB et al. Effects of genetic and environmental factors on iron status: a twin study. Br J Haematol. 2003; Garner C et al. Genetic influences on F cells and other hematologic parameters. Blood. 2000",
        "primary_biomarkers": ["hemoglobin", "mcv", "mch", "ferritin", "serum_iron"],
        "ml_feature_biomarkers": ["hemoglobin", "mcv", "mch", "mchc"],
        "mandatory_anchors": [["hemoglobin"]],
        "min_required_biomarkers": 2,
        "description": "Lack of healthy red blood cells or hemoglobin.",
    },
    "liver_disease": {
        "disease_key": "liver_disease",
        "display_name": "Hepatic Dysfunction / NAFLD Risk",
        "category": "Hepatic",
        "heritability_estimate": 0.40,
        "heritability_range_text": "30-50%",
        "clinical_guideline": "American College of Gastroenterology (ACG) Clinical Guideline: Evaluation of Abnormal Liver Chemistries (2017)",
        "citation": "Loomba R et al. Heritability of hepatic fibrosis and steatosis based on independent imaging and laboratory markers in twins. Gastroenterology. 2015; Schwimmer JB et al. Heritability of nonalcoholic fatty liver disease. Gastroenterology. 2009",
        "primary_biomarkers": ["alt", "ast", "alp", "bilirubin_total", "ggt"],
        "ml_feature_biomarkers": ["alt", "ast", "alp", "bilirubin_total", "albumin"],
        "mandatory_anchors": [["alt", "ast"]],
        "min_required_biomarkers": 2,
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
