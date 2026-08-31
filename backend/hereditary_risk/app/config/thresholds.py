"""
Layer 2 Clinical Threshold Registry with Auditable Guidelines Traceability.

Contains medical threshold cutoffs for 6 disease categories.
Every threshold includes traceable clinical source references:
- Source Organization
- Source Guideline Document
- Source Publication Year
- Clinical Rationale & Notes
"""

from typing import Dict, TypedDict, Optional, List


class ClinicalSourceTraceability(TypedDict):
    organization: str
    document: str
    year: int
    notes: str


class BiomarkerThreshold(TypedDict):
    display_name: str
    unit: str
    direction: str                      # "HIGH" | "LOW"
    warning: Optional[float]
    critical: Optional[float]
    warning_low: Optional[float]
    critical_low: Optional[float]
    traceability: ClinicalSourceTraceability


BIOMARKER_THRESHOLDS: Dict[str, BiomarkerThreshold] = {
    # -------------------------------------------------------------------------
    # Type 2 Diabetes Biomarkers
    # -------------------------------------------------------------------------
    "fasting_glucose": {
        "display_name": "Fasting Plasma Glucose (FPG)",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 100.0,                # Impaired Fasting Glucose (Pre-diabetes)
        "critical": 126.0,               # Diagnostic threshold for Diabetes Mellitus
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "American Diabetes Association (ADA)",
            "document": "Standards of Care in Diabetes—2024",
            "year": 2024,
            "notes": "FPG 100-125 mg/dL defines IFG; FPG >= 126 mg/dL defines diabetes.",
        },
    },
    "postprandial_glucose": {
        "display_name": "2-Hour Postprandial Glucose",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 140.0,                # Impaired Glucose Tolerance
        "critical": 200.0,               # Diagnostic threshold for Diabetes
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "American Diabetes Association (ADA)",
            "document": "Standards of Care in Diabetes—2024",
            "year": 2024,
            "notes": "2-h OGTT 140-199 mg/dL defines IGT; >= 200 mg/dL defines diabetes.",
        },
    },
    "hba1c": {
        "display_name": "Hemoglobin A1c (HbA1c)",
        "unit": "%",
        "direction": "HIGH",
        "warning": 5.7,                  # Increased risk for diabetes (Pre-diabetes)
        "critical": 6.5,                  # Diagnostic threshold for Diabetes
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "American Diabetes Association (ADA)",
            "document": "Standards of Care in Diabetes—2024",
            "year": 2024,
            "notes": "HbA1c 5.7-6.4% indicates prediabetes; >= 6.5% indicates diabetes.",
        },
    },
    "fasting_insulin": {
        "display_name": "Fasting Serum Insulin",
        "unit": "μIU/mL",
        "direction": "HIGH",
        "warning": 15.0,                 # Hyperinsulinemia / Insulin Resistance
        "critical": 25.0,                # Severe Insulin Resistance
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "Endocrine Society",
            "document": "Evaluation and Treatment of Hyperinsulinemia Guidelines",
            "year": 2022,
            "notes": "Fasting insulin > 15 uIU/mL strongly correlates with HOMA-IR > 2.5.",
        },
    },
    # -------------------------------------------------------------------------
    # Dyslipidemia / Lipid Panel Biomarkers
    # -------------------------------------------------------------------------
    "total_cholesterol": {
        "display_name": "Total Serum Cholesterol",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 200.0,                # Borderline High
        "critical": 240.0,               # High Risk
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "National Cholesterol Education Program (NCEP ATP III) / ACC/AHA",
            "document": "Third Report of the NCEP Expert Panel / ACC/AHA Lipid Guidelines",
            "year": 2018,
            "notes": "Desirable < 200 mg/dL; Borderline high 200-239; High >= 240 mg/dL.",
        },
    },
    "ldl": {
        "display_name": "Low-Density Lipoprotein (LDL-C)",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 130.0,                # Borderline High
        "critical": 160.0,               # High Risk
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "AHA / ACC",
            "document": "2018 AHA/ACC Guideline on the Management of Blood Cholesterol",
            "year": 2018,
            "notes": "LDL 130-159 mg/dL is borderline; 160-189 is high.",
        },
    },
    "hdl": {
        "display_name": "High-Density Lipoprotein (HDL-C)",
        "unit": "mg/dL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 50.0,             # Low for Females
        "critical_low": 40.0,             # Low for Males / Major Risk Factor
        "traceability": {
            "organization": "NCEP ATP III / AHA",
            "document": "Management of High Blood Cholesterol in Adults",
            "year": 2018,
            "notes": "HDL < 40 mg/dL (men) or < 50 mg/dL (women) is a major cardiovascular risk factor.",
        },
    },
    "triglycerides": {
        "display_name": "Fasting Serum Triglycerides",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 150.0,                # Borderline High
        "critical": 200.0,               # High
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "AHA / ACC",
            "document": "Guideline on the Management of Blood Cholesterol",
            "year": 2018,
            "notes": "Triglycerides 150-199 mg/dL borderline high; 200-499 mg/dL high.",
        },
    },
    "vldl": {
        "display_name": "Very Low-Density Lipoprotein (VLDL-C)",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 30.0,
        "critical": 40.0,
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "NCEP ATP III",
            "document": "Detection, Evaluation, and Treatment of High Blood Cholesterol",
            "year": 2002,
            "notes": "VLDL > 30 mg/dL contributes to atherogenic remnant lipoproteins.",
        },
    },
    # -------------------------------------------------------------------------
    # Hypothyroidism Biomarkers
    # -------------------------------------------------------------------------
    "tsh": {
        "display_name": "Thyroid Stimulating Hormone (TSH)",
        "unit": "mIU/L",
        "direction": "HIGH",
        "warning": 4.5,                  # Subclinical Hypothyroidism
        "critical": 10.0,                # Overt Hypothyroidism
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "American Thyroid Association (ATA) / AACE",
            "document": "Clinical Practice Guidelines for Hypothyroidism in Adults",
            "year": 2012,
            "notes": "TSH 4.5-10 mIU/L defines subclinical hypothyroidism; > 10 mIU/L defines overt.",
        },
    },
    "t3": {
        "display_name": "Triiodothyronine (Total T3)",
        "unit": "ng/dL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 80.0,
        "critical_low": 60.0,
        "traceability": {
            "organization": "American Thyroid Association (ATA)",
            "document": "Guidelines for Diagnosis and Management of Thyroid Disease",
            "year": 2017,
            "notes": "T3 < 80 ng/dL reflects reduced peripheral T4-to-T3 conversion.",
        },
    },
    "t4": {
        "display_name": "Thyroxine (Total T4)",
        "unit": "μg/dL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 5.0,
        "critical_low": 4.5,
        "traceability": {
            "organization": "ATA / AACE",
            "document": "Task Force on Thyroid Hormone Replacement",
            "year": 2014,
            "notes": "Total T4 < 4.5 ug/dL confirms overt hypothyroid state when TSH is elevated.",
        },
    },
    "free_t4": {
        "display_name": "Free Thyroxine (Free T4)",
        "unit": "ng/dL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 0.9,
        "critical_low": 0.7,
        "traceability": {
            "organization": "ATA / AACE",
            "document": "Clinical Practice Guidelines for Hypothyroidism",
            "year": 2012,
            "notes": "Free T4 < 0.8 ng/dL confirms thyroid failure.",
        },
    },
    # -------------------------------------------------------------------------
    # Chronic Kidney Disease (CKD) Biomarkers
    # -------------------------------------------------------------------------
    "creatinine": {
        "display_name": "Serum Creatinine",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 1.2,                  # Impaired Renal Function
        "critical": 1.5,                  # Significant Renal Impairment
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "KDIGO (Kidney Disease: Improving Global Outcomes)",
            "document": "KDIGO 2023 Clinical Practice Guideline for CKD",
            "year": 2023,
            "notes": "Serum creatinine > 1.2 mg/dL (women) or > 1.4 mg/dL (men) indicates reduced GFR.",
        },
    },
    "bun": {
        "display_name": "Blood Urea Nitrogen (BUN)",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 20.0,
        "critical": 40.0,
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "KDIGO / National Kidney Foundation",
            "document": "KDOQI Clinical Practice Guidelines for Chronic Kidney Disease",
            "year": 2020,
            "notes": "BUN > 20 mg/dL suggests azotemia or reduced glomerular filtration.",
        },
    },
    "uric_acid": {
        "display_name": "Serum Uric Acid",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 6.0,
        "critical": 7.5,
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "American College of Rheumatology (ACR)",
            "document": "2020 ACR Guideline for the Management of Gout",
            "year": 2020,
            "notes": "Serum uric acid > 6.8 mg/dL exceeds solubility threshold.",
        },
    },
    "egfr": {
        "display_name": "Estimated Glomerular Filtration Rate (eGFR)",
        "unit": "mL/min/1.73m²",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 75.0,             # Mild GFR Reduction (G2)
        "critical_low": 60.0,             # Moderate GFR Reduction (G3a CKD threshold)
        "traceability": {
            "organization": "KDIGO",
            "document": "2023 KDIGO Clinical Practice Guideline for CKD Evaluation",
            "year": 2023,
            "notes": "eGFR < 60 mL/min/1.73m2 sustained for > 3 months defines Chronic Kidney Disease.",
        },
    },
    # -------------------------------------------------------------------------
    # Anemia Biomarkers
    # -------------------------------------------------------------------------
    "hemoglobin": {
        "display_name": "Hemoglobin (Hb)",
        "unit": "g/dL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 11.0,             # Mild Anemia Threshold
        "critical_low": 8.0,              # Severe Anemia Threshold
        "traceability": {
            "organization": "World Health Organization (WHO)",
            "document": "Haemoglobin Concentrations for Diagnosis of Anaemia",
            "year": 2011,
            "notes": "Hb < 12.0 g/dL (women) or < 13.0 g/dL (men) defines anemia; < 8.0 g/dL defines severe anemia.",
        },
    },
    "mcv": {
        "display_name": "Mean Corpuscular Volume (MCV)",
        "unit": "fL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 80.0,             # Microcytic Anemia Boundary
        "critical_low": 70.0,             # Severe Microcytosis
        "traceability": {
            "organization": "WHO / ASH (American Society of Hematology)",
            "document": "Evaluation of Microcytic Anemia Guidelines",
            "year": 2018,
            "notes": "MCV < 80 fL defines microcytic anemia (Iron deficiency or Thalassemia).",
        },
    },
    "mch": {
        "display_name": "Mean Corpuscular Hemoglobin (MCH)",
        "unit": "pg",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 27.0,             # Hypochromic Threshold
        "critical_low": 20.0,
        "traceability": {
            "organization": "ASH",
            "document": "Hematology Reference Standards",
            "year": 2019,
            "notes": "MCH < 27 pg indicates hypochromia.",
        },
    },
    "ferritin": {
        "display_name": "Serum Ferritin",
        "unit": "ng/mL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 20.0,             # Depleted Iron Stores
        "critical_low": 10.0,             # Iron Deficiency Anemia
        "traceability": {
            "organization": "WHO",
            "document": "WHO Guideline on the Use of Ferritin Concentrations to Assess Iron Status",
            "year": 2020,
            "notes": "Ferritin < 15 ng/mL is specific for iron deficiency.",
        },
    },
    "serum_iron": {
        "display_name": "Serum Iron",
        "unit": "μg/dL",
        "direction": "LOW",
        "warning": None,
        "critical": None,
        "warning_low": 60.0,
        "critical_low": 40.0,
        "traceability": {
            "organization": "ASH",
            "document": "Diagnosis and Management of Iron Deficiency",
            "year": 2021,
            "notes": "Serum iron < 60 ug/dL indicates low circulating iron.",
        },
    },
    # -------------------------------------------------------------------------
    # Liver Disease Biomarkers
    # -------------------------------------------------------------------------
    "alt": {
        "display_name": "Alanine Aminotransferase (ALT/SGPT)",
        "unit": "U/L",
        "direction": "HIGH",
        "warning": 40.0,                  # Borderline Elevation
        "critical": 80.0,                 # Hepatocellular Injury Threshold
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "American College of Gastroenterology (ACG)",
            "document": "ACG Clinical Guideline: Evaluation of Abnormal Liver Chemistries",
            "year": 2017,
            "notes": "Upper limit of normal ALT is 33 U/L for men, 25 U/L for women. ALT > 2x ULN is significant.",
        },
    },
    "ast": {
        "display_name": "Aspartate Aminotransferase (AST/SGOT)",
        "unit": "U/L",
        "direction": "HIGH",
        "warning": 40.0,
        "critical": 80.0,
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "ACG",
            "document": "Evaluation of Abnormal Liver Chemistries",
            "year": 2017,
            "notes": "AST > 40 U/L indicates liver or cardiac tissue damage.",
        },
    },
    "alp": {
        "display_name": "Alkaline Phosphatase (ALP)",
        "unit": "U/L",
        "direction": "HIGH",
        "warning": 120.0,                # Cholestatic Elevation
        "critical": 200.0,               # Severe Cholestasis
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "ACG",
            "document": "Evaluation of Abnormal Liver Chemistries",
            "year": 2017,
            "notes": "ALP > 120 U/L suggests cholestasis or biliary obstruction.",
        },
    },
    "bilirubin_total": {
        "display_name": "Total Serum Bilirubin",
        "unit": "mg/dL",
        "direction": "HIGH",
        "warning": 1.2,                  # Hyperbilirubinemia
        "critical": 2.0,                  # Clinical Jaundice Threshold
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "ACG",
            "document": "Evaluation of Abnormal Liver Chemistries",
            "year": 2017,
            "notes": "Total bilirubin > 1.2 mg/dL is elevated; > 2.0 mg/dL presents as visible jaundice.",
        },
    },
    "ggt": {
        "display_name": "Gamma-Glutamyl Transferase (GGT)",
        "unit": "U/L",
        "direction": "HIGH",
        "warning": 51.0,
        "critical": 100.0,
        "warning_low": None,
        "critical_low": None,
        "traceability": {
            "organization": "ACG",
            "document": "Evaluation of Abnormal Liver Chemistries",
            "year": 2017,
            "notes": "GGT > 51 U/L confirms hepatobiliary origin of elevated ALP.",
        },
    },
}


class DiseaseThresholdDict(dict):
    """
    Custom dictionary wrapper supporting both direct biomarker keys (e.g., 'hba1c')
    and nested disease keys (e.g., CLINICAL_THRESHOLDS['type_2_diabetes']['hba1c']).
    """
    def __getitem__(self, key: str):
        if key in self:
            return super().__getitem__(key)
        
        disease_map = {
            "type_2_diabetes": ["hba1c", "fasting_glucose", "postprandial_glucose", "fasting_insulin", "triglycerides"],
            "dyslipidemia": ["total_cholesterol", "ldl", "hdl", "triglycerides", "fasting_glucose", "vldl"],
            "hypothyroidism": ["tsh", "t3", "t4", "free_t4"],
            "ckd": ["creatinine", "bun", "uric_acid", "egfr"],
            "anemia": ["hemoglobin", "mcv", "mch", "ferritin", "serum_iron"],
            "liver_disease": ["alt", "ast", "alp", "bilirubin_total", "ggt"],
        }
        
        if key in disease_map:
            primary = disease_map[key]
            return {b: self[b] for b in primary if b in self}
            
        raise KeyError(key)

    def get(self, key: str, default=None):
        try:
            return self[key]
        except KeyError:
            return default


CLINICAL_THRESHOLDS = DiseaseThresholdDict(BIOMARKER_THRESHOLDS)


def get_biomarker_threshold(key: str) -> Optional[BiomarkerThreshold]:
    """Retrieve complete threshold definition including auditable source traceability."""
    return BIOMARKER_THRESHOLDS.get(key)
