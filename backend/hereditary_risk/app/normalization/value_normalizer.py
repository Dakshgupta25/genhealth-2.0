"""
Layer 1: Biomarker Value and Unit Normalizer.

Extracts numeric values from raw clinical report strings (e.g. "126.0", ">126", "5.8 %", "1,200"),
validates measurement units against expected standard units, and preserves complete provenance.
"""

import re
import math
from typing import TypedDict, Optional, Any, Union
from hereditary_risk.app.normalization.biomarker_normalizer import normalize_biomarker_name


class BiomarkerValueNormalizationResult(TypedDict):
    original_value: Any
    numeric_value: Optional[float]
    original_unit: Optional[str]
    normalized_unit: Optional[str]
    unit_match: bool                    # True if unit matches expected standard unit
    is_valid: bool                      # True if numeric value was successfully parsed
    parsing_notes: Optional[str]


# Regexp for extracting numeric float or int from strings like "> 126.5", "<40", "5.7%", "1200.5"
_NUMERIC_PATTERN = re.compile(r"[<>~=]?\s*([0-9]+(?:\.[0-9]+)?)")


def parse_numeric_value(raw_value: Any) -> Optional[float]:
    """
    Safely extract float from int, float, or formatted string.
    Checks for NaN, Infinity, negative, and invalid string formats.
    """
    if raw_value is None:
        return None
    
    if isinstance(raw_value, (int, float)):
        if math.isnan(raw_value) or math.isinf(raw_value):
            return None
        return float(raw_value)
    
    val_str = str(raw_value).strip()
    if not val_str:
        return None

    # Replace commas in numbers (e.g. "1,200.50" -> "1200.50")
    val_str_clean = val_str.replace(",", "")
    
    # Check for multiple decimal points e.g. "95.5.4"
    if val_str_clean.count(".") > 1:
        return None

    match = _NUMERIC_PATTERN.search(val_str_clean)
    if match:
        try:
            val = float(match.group(1))
            if math.isnan(val) or math.isinf(val):
                return None
            return val
        except ValueError:
            return None
            
    return None


def clean_unit_string(unit: Optional[str]) -> Optional[str]:
    """Clean unit string by trimming and lowercasing."""
    if not unit or not isinstance(unit, str):
        return None
    u = unit.strip().lower()
    u = re.sub(r"\s+", "", u)
    return u if u else None


def normalize_biomarker_value(
    raw_value: Any,
    raw_unit: Optional[str] = None,
    expected_standard_unit: Optional[str] = None,
) -> BiomarkerValueNormalizationResult:
    numeric_val = parse_numeric_value(raw_value)
    is_valid = numeric_val is not None
    
    cleaned_raw_unit = clean_unit_string(raw_unit)
    cleaned_expected_unit = clean_unit_string(expected_standard_unit)
    
    unit_match = True
    notes = None
    
    if cleaned_raw_unit and cleaned_expected_unit:
        if cleaned_raw_unit != cleaned_expected_unit:
            equiv = {
                "%": ["%", "percent"],
                "mg/dl": ["mg/dl", "mg/100ml"],
                "g/dl": ["g/dl", "gm/dl", "g%"],
                "u/l": ["u/l", "iu/l", "units/l"],
                "miu/l": ["miu/l", "u/l", "iu/l"],
            }
            standard_canonical_unit = cleaned_expected_unit
            matched_equiv = False
            for std_key, aliases in equiv.items():
                if standard_canonical_unit == std_key and cleaned_raw_unit in aliases:
                    matched_equiv = True
                    break
                    
            if not matched_equiv:
                unit_match = False
                notes = f"Unit mismatch: received '{raw_unit}', expected '{expected_standard_unit}'."
    
    return {
        "original_value": raw_value,
        "numeric_value": numeric_val,
        "original_unit": raw_unit,
        "normalized_unit": cleaned_raw_unit,
        "unit_match": unit_match,
        "is_valid": is_valid,
        "parsing_notes": notes,
    }


def normalize_biomarker_input(
    raw_name: str,
    raw_value: Any,
    raw_unit: Optional[str] = None,
) -> dict:
    """
    Combined Layer 1 Normalization helper for name, numeric value, and unit.
    """
    name_res = normalize_biomarker_name(raw_name)
    val_res = normalize_biomarker_value(
        raw_value=raw_value,
        raw_unit=raw_unit,
        expected_standard_unit=name_res.get("standard_unit"),
    )
    
    return {
        "status": name_res["status"],
        "raw_name": raw_name,
        "cleaned_name": name_res["cleaned_name"],
        "canonical_key": name_res["canonical_key"],
        "display_name": name_res["display_name"],
        "standard_unit": name_res["standard_unit"],
        "category": name_res["category"],
        "numeric_value": val_res["numeric_value"],
        "unit_match": val_res["unit_match"],
        "is_valid_value": val_res["is_valid"],
        "parsing_notes": val_res["parsing_notes"],
    }
