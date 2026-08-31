"""
Layer 1: Deterministic Biomarker Name Normalizer.
"""

import re
import unicodedata
from typing import TypedDict, Optional, Any, Dict
from hereditary_risk.app.config.biomarkers import BIOMARKER_ALIASES, CANONICAL_BIOMARKERS, BiomarkerMetadata


class BiomarkerNameNormalizationResult(TypedDict):
    status: str                         # "matched" | "unknown"
    raw_name: str                       # Original raw input string
    cleaned_name: str                   # Preprocessed string used for lookup
    canonical_key: Optional[str]        # E.g., "hba1c"
    display_name: Optional[str]         # E.g., "HbA1c (Glycated Hemoglobin)"
    standard_unit: Optional[str]        # E.g., "%"
    category: Optional[str]             # E.g., "Diabetes"


def _clean_string(raw_text: str) -> str:
    if not raw_text:
        return ""
    text = unicodedata.normalize("NFKD", raw_text)
    text = text.lower()
    text = re.sub(r"[\/_\,\(\)]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def normalize_biomarker_name(raw_name: str) -> BiomarkerNameNormalizationResult:
    if not raw_name or not isinstance(raw_name, str):
        return {
            "status": "unknown",
            "raw_name": str(raw_name) if raw_name is not None else "",
            "cleaned_name": "",
            "canonical_key": None,
            "display_name": None,
            "standard_unit": None,
            "category": None,
        }
        
    cleaned = _clean_string(raw_name)
    if not cleaned:
        return {
            "status": "unknown",
            "raw_name": raw_name,
            "cleaned_name": "",
            "canonical_key": None,
            "display_name": None,
            "standard_unit": None,
            "category": None,
        }

    canonical_key = BIOMARKER_ALIASES.get(cleaned)

    if not canonical_key:
        cleaned_no_hyphen = cleaned.replace("-", " ")
        cleaned_no_hyphen = re.sub(r"\s+", " ", cleaned_no_hyphen).strip()
        canonical_key = BIOMARKER_ALIASES.get(cleaned_no_hyphen)

    if not canonical_key:
        cleaned_hyphenated = cleaned.replace(" ", "-")
        canonical_key = BIOMARKER_ALIASES.get(cleaned_hyphenated)

    if not canonical_key:
        stripped_alt = re.sub(r"\b(test|level|count|serum|blood)\b", "", cleaned).strip()
        stripped_alt = re.sub(r"\s+", " ", stripped_alt)
        canonical_key = BIOMARKER_ALIASES.get(stripped_alt)

    if not canonical_key:
        # Pattern-based matching for complex composite clinical names
        if re.search(r"\b(hba1c|hb-a1c|hb a1c|a1c)\b", cleaned) or (
            ("glycosylated" in cleaned or "glycated" in cleaned)
            and ("hemoglobin" in cleaned or "haemoglobin" in cleaned)
        ):
            canonical_key = "hba1c"
        elif "fasting" in cleaned and ("glucose" in cleaned or "sugar" in cleaned or "fpg" in cleaned or "fbs" in cleaned):
            canonical_key = "fasting_glucose"
        elif ("postprandial" in cleaned or "post prandial" in cleaned or "ppbs" in cleaned or "ppbg" in cleaned) and (
            "glucose" in cleaned or "sugar" in cleaned
        ):
            canonical_key = "postprandial_glucose"
        elif "estimated average glucose" in cleaned or "average blood glucose" in cleaned or re.search(r"\beag\b", cleaned):
            canonical_key = "fasting_glucose"
        elif "total cholesterol" in cleaned or ("cholesterol" in cleaned and "total" in cleaned):
            canonical_key = "total_cholesterol"
        elif "ldl" in cleaned and "cholesterol" in cleaned:
            canonical_key = "ldl"
        elif "hdl" in cleaned and "cholesterol" in cleaned:
            canonical_key = "hdl"
        elif "triglyceride" in cleaned:
            canonical_key = "triglycerides"
        elif "creatinine" in cleaned:
            canonical_key = "creatinine"
        elif "blood urea nitrogen" in cleaned or re.search(r"\bbun\b", cleaned):
            canonical_key = "bun"
        elif "uric acid" in cleaned:
            canonical_key = "uric_acid"
        elif "tsh" in cleaned or "thyroid stimulating hormone" in cleaned:
            canonical_key = "tsh"
        elif ("haemoglobin" in cleaned or "hemoglobin" in cleaned) and not ("a1c" in cleaned or "glycosylated" in cleaned or "glycated" in cleaned):
            canonical_key = "hemoglobin"
        elif "platelet" in cleaned and "count" in cleaned:
            canonical_key = "platelets"
        elif "wbc" in cleaned or "leukocyte" in cleaned or "white blood cell" in cleaned:
            canonical_key = "wbc"
        elif "rbc" in cleaned or "red blood cell" in cleaned:
            canonical_key = "rbc"

    if canonical_key and canonical_key in CANONICAL_BIOMARKERS:
        meta: BiomarkerMetadata = CANONICAL_BIOMARKERS[canonical_key]
        return {
            "status": "matched",
            "raw_name": raw_name,
            "cleaned_name": cleaned,
            "canonical_key": meta["canonical_key"],
            "display_name": meta["display_name"],
            "standard_unit": meta["standard_unit"],
            "category": meta["category"],
        }
        
    return {
        "status": "unknown",
        "raw_name": raw_name,
        "cleaned_name": cleaned,
        "canonical_key": None,
        "display_name": None,
        "standard_unit": None,
        "category": None,
    }
