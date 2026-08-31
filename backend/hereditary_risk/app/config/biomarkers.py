"""
Canonical Biomarker Dictionary and Alias Definitions.

This file serves as Layer 1's source of truth for standard biomarker keys,
human-readable display names, standard measurement units, and raw synonym mappings.
"""

from typing import Dict, TypedDict, List, Optional


class BiomarkerMetadata(TypedDict):
    canonical_key: str
    display_name: str
    standard_unit: str
    category: str
    description: str


# Canonical metadata definitions
CANONICAL_BIOMARKERS: Dict[str, BiomarkerMetadata] = {
    # --- DIABETES MARKERS ---
    "hba1c": {
        "canonical_key": "hba1c",
        "display_name": "HbA1c (Glycated Hemoglobin)",
        "standard_unit": "%",
        "category": "Diabetes",
        "description": "Average blood sugar levels over the past 2-3 months."
    },
    "fasting_glucose": {
        "canonical_key": "fasting_glucose",
        "display_name": "Fasting Blood Glucose",
        "standard_unit": "mg/dL",
        "category": "Diabetes",
        "description": "Blood sugar concentration after an overnight fast."
    },
    "postprandial_glucose": {
        "canonical_key": "postprandial_glucose",
        "display_name": "Postprandial Blood Glucose",
        "standard_unit": "mg/dL",
        "category": "Diabetes",
        "description": "Blood sugar concentration 2 hours after a meal."
    },
    "fasting_insulin": {
        "canonical_key": "fasting_insulin",
        "display_name": "Fasting Insulin",
        "standard_unit": "μIU/mL",
        "category": "Diabetes",
        "description": "Insulin concentration after fasting."
    },

    # --- LIPID PANEL ---
    "total_cholesterol": {
        "canonical_key": "total_cholesterol",
        "display_name": "Total Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "description": "Total amount of cholesterol in the blood."
    },
    "ldl": {
        "canonical_key": "ldl",
        "display_name": "LDL Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "description": "Low-density lipoprotein cholesterol ('bad' cholesterol)."
    },
    "hdl": {
        "canonical_key": "hdl",
        "display_name": "HDL Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "description": "High-density lipoprotein cholesterol ('good' cholesterol)."
    },
    "triglycerides": {
        "canonical_key": "triglycerides",
        "display_name": "Triglycerides",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "description": "Type of fat (lipid) found in blood."
    },
    "vldl": {
        "canonical_key": "vldl",
        "display_name": "VLDL Cholesterol",
        "standard_unit": "mg/dL",
        "category": "Lipid Profile",
        "description": "Very low-density lipoprotein cholesterol."
    },

    # --- KIDNEY MARKERS ---
    "creatinine": {
        "canonical_key": "creatinine",
        "display_name": "Serum Creatinine",
        "standard_unit": "mg/dL",
        "category": "Renal Function",
        "description": "Waste product filtered by kidneys."
    },
    "bun": {
        "canonical_key": "bun",
        "display_name": "Blood Urea Nitrogen (BUN)",
        "standard_unit": "mg/dL",
        "category": "Renal Function",
        "description": "Amount of nitrogen in blood from urea."
    },
    "uric_acid": {
        "canonical_key": "uric_acid",
        "display_name": "Serum Uric Acid",
        "standard_unit": "mg/dL",
        "category": "Renal Function",
        "description": "Chemical created when purines are broken down."
    },
    "egfr": {
        "canonical_key": "egfr",
        "display_name": "Estimated GFR (eGFR)",
        "standard_unit": "mL/min/1.73m2",
        "category": "Renal Function",
        "description": "Estimate of kidney filtering capacity."
    },

    # --- LIVER MARKERS ---
    "alt": {
        "canonical_key": "alt",
        "display_name": "ALT (SGPT)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "description": "Alanine aminotransferase liver enzyme."
    },
    "ast": {
        "canonical_key": "ast",
        "display_name": "AST (SGOT)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "description": "Aspartate aminotransferase liver enzyme."
    },
    "alp": {
        "canonical_key": "alp",
        "display_name": "Alkaline Phosphatase (ALP)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "description": "Enzyme related to bile ducts and bone."
    },
    "bilirubin_total": {
        "canonical_key": "bilirubin_total",
        "display_name": "Total Bilirubin",
        "standard_unit": "mg/dL",
        "category": "Liver Function",
        "description": "Orange-yellow pigment formed during red blood cell breakdown."
    },
    "ggt": {
        "canonical_key": "ggt",
        "display_name": "GGT (Gamma-Glutamyl Transferase)",
        "standard_unit": "U/L",
        "category": "Liver Function",
        "description": "Liver enzyme sensitive to bile duct obstruction."
    },

    # --- THYROID MARKERS ---
    "tsh": {
        "canonical_key": "tsh",
        "display_name": "TSH (Thyroid Stimulating Hormone)",
        "standard_unit": "mIU/L",
        "category": "Thyroid",
        "description": "Pituitary hormone regulating thyroid activity."
    },
    "t3": {
        "canonical_key": "t3",
        "display_name": "Total T3 (Triiodothyronine)",
        "standard_unit": "ng/dL",
        "category": "Thyroid",
        "description": "Active thyroid hormone level."
    },
    "t4": {
        "canonical_key": "t4",
        "display_name": "Total T4 (Thyroxine)",
        "standard_unit": "μg/dL",
        "category": "Thyroid",
        "description": "Primary thyroid hormone level."
    },
    "free_t3": {
        "canonical_key": "free_t3",
        "display_name": "Free T3",
        "standard_unit": "pg/mL",
        "category": "Thyroid",
        "description": "Unbound active triiodothyronine."
    },
    "free_t4": {
        "canonical_key": "free_t4",
        "display_name": "Free T4",
        "standard_unit": "ng/dL",
        "category": "Thyroid",
        "description": "Unbound thyroxine."
    },

    # --- HEMATOLOGY (CBC) ---
    "hemoglobin": {
        "canonical_key": "hemoglobin",
        "display_name": "Hemoglobin (Hb)",
        "standard_unit": "g/dL",
        "category": "Hematology",
        "description": "Oxygen-carrying protein in red blood cells."
    },
    "rbc": {
        "canonical_key": "rbc",
        "display_name": "Red Blood Cell Count (RBC)",
        "standard_unit": "mill/μL",
        "category": "Hematology",
        "description": "Total red blood cell count."
    },
    "wbc": {
        "canonical_key": "wbc",
        "display_name": "White Blood Cell Count (WBC)",
        "standard_unit": "thou/μL",
        "category": "Hematology",
        "description": "Total leukocyte count."
    },
    "platelets": {
        "canonical_key": "platelets",
        "display_name": "Platelet Count",
        "standard_unit": "thou/μL",
        "category": "Hematology",
        "description": "Blood clotting cells count."
    },
    "mcv": {
        "canonical_key": "mcv",
        "display_name": "MCV (Mean Corpuscular Volume)",
        "standard_unit": "fL",
        "category": "Hematology",
        "description": "Average size of red blood cells."
    },
    "mch": {
        "canonical_key": "mch",
        "display_name": "MCH (Mean Corpuscular Hemoglobin)",
        "standard_unit": "pg",
        "category": "Hematology",
        "description": "Average amount of hemoglobin per RBC."
    },
    "mchc": {
        "canonical_key": "mchc",
        "display_name": "MCHC",
        "standard_unit": "g/dL",
        "category": "Hematology",
        "description": "Average concentration of hemoglobin per volume of RBCs."
    },

    # --- IRON & INFLAMMATION ---
    "ferritin": {
        "canonical_key": "ferritin",
        "display_name": "Serum Ferritin",
        "standard_unit": "ng/mL",
        "category": "Iron Studies",
        "description": "Iron storage protein."
    },
    "serum_iron": {
        "canonical_key": "serum_iron",
        "display_name": "Serum Iron",
        "standard_unit": "μg/dL",
        "category": "Iron Studies",
        "description": "Amount of circulating iron."
    },
    "tibc": {
        "canonical_key": "tibc",
        "display_name": "TIBC (Total Iron Binding Capacity)",
        "standard_unit": "μg/dL",
        "category": "Iron Studies",
        "description": "Capacity of transferrin to bind iron."
    },
    "crp": {
        "canonical_key": "crp",
        "display_name": "C-Reactive Protein (CRP)",
        "standard_unit": "mg/L",
        "category": "Inflammation",
        "description": "Acute-phase inflammatory marker."
    },
    "esr": {
        "canonical_key": "esr",
        "display_name": "ESR (Erythrocyte Sedimentation Rate)",
        "standard_unit": "mm/hr",
        "category": "Inflammation",
        "description": "Nonspecific marker of inflammation."
    },
}


# Synonym and alias mapping dictionary.
BIOMARKER_ALIASES: Dict[str, str] = {
    # --- DIABETES ---
    "hba1c": "hba1c",
    "hb a1c": "hba1c",
    "hb-a1c": "hba1c",
    "glycated haemoglobin": "hba1c",
    "glycated hemoglobin": "hba1c",
    "glycosylated hemoglobin": "hba1c",
    "glycosylated haemoglobin": "hba1c",
    "hemoglobin a1c": "hba1c",
    "haemoglobin a1c": "hba1c",
    "a1c": "hba1c",
    "blood sugar fasting": "fasting_glucose",
    "fasting blood sugar": "fasting_glucose",
    "fasting blood glucose": "fasting_glucose",
    "fasting plasma glucose": "fasting_glucose",
    "fasting glucose": "fasting_glucose",
    "fbs": "fasting_glucose",
    "fbg": "fasting_glucose",
    "blood sugar pp": "postprandial_glucose",
    "post prandial blood sugar": "postprandial_glucose",
    "postprandial blood sugar": "postprandial_glucose",
    "ppbs": "postprandial_glucose",
    "ppbg": "postprandial_glucose",
    "postprandial glucose": "postprandial_glucose",
    "insulin fasting": "fasting_insulin",
    "fasting serum insulin": "fasting_insulin",
    "fasting insulin": "fasting_insulin",

    # --- LIPID PANEL ---
    "total cholesterol": "total_cholesterol",
    "serum cholesterol": "total_cholesterol",
    "cholesterol total": "total_cholesterol",
    "cholesterol": "total_cholesterol",
    "ldl cholesterol": "ldl",
    "ldl-c": "ldl",
    "ldl": "ldl",
    "low density lipoprotein": "ldl",
    "low-density lipoprotein": "ldl",
    "hdl cholesterol": "hdl",
    "hdl-c": "hdl",
    "hdl": "hdl",
    "high density lipoprotein": "hdl",
    "high-density lipoprotein": "hdl",
    "triglycerides": "triglycerides",
    "serum triglycerides": "triglycerides",
    "tg": "triglycerides",
    "triglyceride": "triglycerides",
    "vldl": "vldl",
    "vldl cholesterol": "vldl",
    "very low density lipoprotein": "vldl",

    # --- RENAL / KIDNEY ---
    "serum creatinine": "creatinine",
    "creatinine": "creatinine",
    "creatinine serum": "creatinine",
    "blood urea nitrogen": "bun",
    "bun": "bun",
    "blood urea": "bun",
    "urea": "bun",
    "uric acid": "uric_acid",
    "serum uric acid": "uric_acid",
    "uric acid serum": "uric_acid",
    "egfr": "egfr",
    "estimated gfr": "egfr",
    "gfr": "egfr",
    "e-gfr": "egfr",

    # --- LIVER ---
    "sgpt": "alt",
    "alt": "alt",
    "alanine aminotransferase": "alt",
    "alanine transaminase": "alt",
    "sgpt (alt)": "alt",
    "sgot": "ast",
    "ast": "ast",
    "aspartate aminotransferase": "ast",
    "aspartate transaminase": "ast",
    "sgot (ast)": "ast",
    "alp": "alp",
    "alkaline phosphatase": "alp",
    "alkaline phosphatase total": "alp",
    "bilirubin total": "bilirubin_total",
    "total bilirubin": "bilirubin_total",
    "bilirubin, total": "bilirubin_total",
    "ggt": "ggt",
    "gamma gt": "ggt",
    "gamma-glutamyl transferase": "ggt",
    "gamma glutamyl transferase": "ggt",

    # --- THYROID ---
    "tsh": "tsh",
    "thyroid stimulating hormone": "tsh",
    "thyroid-stimulating hormone": "tsh",
    "t3": "t3",
    "total t3": "t3",
    "triiodothyronine": "t3",
    "t4": "t4",
    "total t4": "t4",
    "thyroxine": "t4",
    "free t3": "free_t3",
    "ft3": "free_t3",
    "free t4": "free_t4",
    "ft4": "free_t4",

    # --- HEMATOLOGY / CBC ---
    "haemoglobin": "hemoglobin",
    "hemoglobin": "hemoglobin",
    "hb": "hemoglobin",
    "hgb": "hemoglobin",
    "rbc count": "rbc",
    "rbc": "rbc",
    "red blood cell count": "rbc",
    "red blood cells": "rbc",
    "wbc count": "wbc",
    "wbc": "wbc",
    "total leukocyte count": "wbc",
    "total leucocyte count": "wbc",
    "tlc": "wbc",
    "white blood cell count": "wbc",
    "platelet count": "platelets",
    "platelets": "platelets",
    "plt": "platelets",
    "mcv": "mcv",
    "mean corpuscular volume": "mcv",
    "mch": "mch",
    "mean corpuscular hemoglobin": "mch",
    "mchc": "mchc",
    "mean corpuscular hemoglobin concentration": "mchc",

    # --- IRON & INFLAMMATION ---
    "ferritin": "ferritin",
    "serum ferritin": "ferritin",
    "serum iron": "serum_iron",
    "iron": "serum_iron",
    "tibc": "tibc",
    "total iron binding capacity": "tibc",
    "crp": "crp",
    "c-reactive protein": "crp",
    "c reactive protein": "crp",
    "hs-crp": "crp",
    "esr": "esr",
    "erythrocyte sedimentation rate": "esr",
}


def get_biomarker_metadata(key: str) -> Optional[BiomarkerMetadata]:
    """Retrieve metadata dict for a canonical biomarker key."""
    return CANONICAL_BIOMARKERS.get(key)
