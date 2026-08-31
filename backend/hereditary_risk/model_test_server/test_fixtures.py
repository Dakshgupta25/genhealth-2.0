"""
Synthetic Preset Test Cases for the Model Testing Playground.

DISCLAIMER: All values in these presets are synthetic test inputs used exclusively
for manual model inspection and playground testing. They are NOT real patient records.
"""

from typing import Dict, List, Any

SYNTHETIC_PRESETS: List[Dict[str, Any]] = [
    # 1. Type 2 Diabetes Presets
    {
        "name": "T2D Low Risk Example",
        "description": "Optimal fasting glucose, insulin, and BMI (Synthetic)",
        "disease_key": "type_2_diabetes",
        "features": {
            "fasting_glucose": 82.0,
            "fasting_insulin": 5.2,
            "bmi": 21.5,
            "resting_bp": 115.0,
            "age": 28.0,
        },
    },
    {
        "name": "T2D Borderline Example",
        "description": "Mildly elevated glucose and BMI (Synthetic)",
        "disease_key": "type_2_diabetes",
        "features": {
            "fasting_glucose": 108.0,
            "fasting_insulin": 12.5,
            "bmi": 27.8,
            "resting_bp": 128.0,
            "age": 42.0,
        },
    },
    {
        "name": "T2D High Risk Example",
        "description": "Significantly elevated glucose, insulin, and BMI (Synthetic)",
        "disease_key": "type_2_diabetes",
        "features": {
            "fasting_glucose": 155.0,
            "fasting_insulin": 28.0,
            "bmi": 34.2,
            "resting_bp": 142.0,
            "age": 55.0,
        },
    },
    # 2. Chronic Kidney Disease (CKD) Presets
    {
        "name": "CKD Low Risk Example",
        "description": "Normal creatinine, BUN, and hemoglobin (Synthetic)",
        "disease_key": "ckd",
        "features": {
            "creatinine": 0.85,
            "bun": 12.0,
            "hemoglobin": 14.5,
            "fasting_glucose": 90.0,
        },
    },
    {
        "name": "CKD High Risk Example",
        "description": "Elevated creatinine, BUN, and lower hemoglobin (Synthetic)",
        "disease_key": "ckd",
        "features": {
            "creatinine": 2.8,
            "bun": 45.0,
            "hemoglobin": 10.2,
            "fasting_glucose": 135.0,
        },
    },
    # 3. Anemia Presets
    {
        "name": "Anemia Low Risk Example",
        "description": "Normal hemoglobin and RBC indices (Synthetic)",
        "disease_key": "anemia",
        "features": {
            "hemoglobin": 14.2,
            "mcv": 88.0,
            "mch": 29.5,
            "mchc": 33.5,
        },
    },
    {
        "name": "Anemia High Risk Example",
        "description": "Low hemoglobin, microcytic MCV & MCH (Synthetic)",
        "disease_key": "anemia",
        "features": {
            "hemoglobin": 8.5,
            "mcv": 68.0,
            "mch": 21.0,
            "mchc": 28.0,
        },
    },
    # 4. Liver Disease Presets
    {
        "name": "Liver Disease Low Risk Example",
        "description": "Normal ALT, AST, ALP, and bilirubin (Synthetic)",
        "disease_key": "liver_disease",
        "features": {
            "alt": 22.0,
            "ast": 20.0,
            "alp": 65.0,
            "bilirubin_total": 0.6,
            "albumin": 4.2,
        },
    },
    {
        "name": "Liver Disease High Risk Example",
        "description": "Elevated liver transaminases and bilirubin (Synthetic)",
        "disease_key": "liver_disease",
        "features": {
            "alt": 185.0,
            "ast": 140.0,
            "alp": 210.0,
            "bilirubin_total": 3.4,
            "albumin": 2.8,
        },
    },
    # 5. Hypothyroidism Presets
    {
        "name": "Hypothyroidism Low Risk Example",
        "description": "Normal TSH, T3, T4, and Free T4 (Synthetic)",
        "disease_key": "hypothyroidism",
        "features": {
            "tsh": 1.8,
            "t3": 115.0,
            "t4": 8.2,
            "free_t4": 1.2,
        },
    },
    {
        "name": "Hypothyroidism High Risk Example",
        "description": "Elevated TSH with depressed Free T4 (Synthetic)",
        "disease_key": "hypothyroidism",
        "features": {
            "tsh": 18.5,
            "t3": 55.0,
            "t4": 4.1,
            "free_t4": 0.45,
        },
    },
    # 6. Dyslipidemia Presets
    {
        "name": "Dyslipidemia High Risk Example",
        "description": "Significantly elevated cholesterol & glucose (Synthetic)",
        "disease_key": "dyslipidemia",
        "features": {
            "total_cholesterol": 285.0,
            "fasting_glucose": 130.0,
            "resting_bp": 148.0,
            "age": 60.0,
        },
    },
]
