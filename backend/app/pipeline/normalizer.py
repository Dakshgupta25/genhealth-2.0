"""
Stage 2a - Normalization: raw test name -> canonical name + abnormality flag.

Uses rapidfuzz for fuzzy matching against the editable seed file:
  backend/app/data/lab_lookup.json

HOW TO ADD NEW TEST NAMES TO THE LOOKUP TABLE:
  1. Open backend/app/data/lab_lookup.json
  2. Add a new entry:
       "raw variant lowercase": {"canonical": "Display Name", "loinc": "LOINC-code-or-null"}
  3. Save the file. No code changes needed -- this module reloads the file
     at import time (or you can call reload_lookup() to hot-reload in tests).
  4. Use lowercase for the key; the normalizer lowercases input before matching.

Matching algorithm:
  - rapidfuzz.process.extractOne with token_sort_ratio scorer
  - Threshold: 80 / 100  (raise if you see false positives)
  - token_sort_ratio is chosen over simple ratio because lab test names often
    have word-order variations (e.g. "Total Cholesterol" vs "Cholesterol Total")
"""

import json
import logging
import re
from pathlib import Path
from typing import Any, Optional

from rapidfuzz import process as rf_process, fuzz

logger = logging.getLogger(__name__)

_LOOKUP_PATH = Path(__file__).parent.parent / "data" / "lab_lookup.json"
_FUZZY_THRESHOLD = 80  # out of 100

# Module-level cache -- loaded once at import, call reload_lookup() to refresh
_lookup: dict = {}


def _load_lookup() -> dict:
    """
    Load the lab_lookup.json seed file.
    Keys starting with '_' are treated as comment/metadata fields and skipped.
    """
    if not _LOOKUP_PATH.exists():
        logger.warning(
            "lab_lookup.json not found at %s -- normalization will be skipped.",
            _LOOKUP_PATH,
        )
        return {}
    with _LOOKUP_PATH.open(encoding="utf-8") as f:
        raw = json.load(f)
    # Filter out comment/metadata keys (prefixed with '_')
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def reload_lookup() -> None:
    """Hot-reload the lookup table. Useful in tests or after editing the JSON file."""
    global _lookup
    _lookup = _load_lookup()
    logger.info("lab_lookup.json reloaded -- %d entries", len(_lookup))


# Initial load at import time
_lookup = _load_lookup()


# ---------------------------------------------------------------------------
# Canonical name resolution
# ---------------------------------------------------------------------------

def normalize_test_name(raw_name: str) -> "dict[str, Any]":
    """
    Fuzzy-match a raw test name string against the lookup table.

    Returns:
    {
        "canonical_name": str | None,
        "loinc_code": str | None,
        "match_key": str | None,
        "match_score": float | None,
        "matched": bool
    }
    """
    if not _lookup:
        return {
            "canonical_name": None, "loinc_code": None,
            "match_key": None, "match_score": None, "matched": False,
        }

    query = raw_name.strip().lower()
    if not query:
        return {
            "canonical_name": None, "loinc_code": None,
            "match_key": None, "match_score": None, "matched": False,
        }

    result = rf_process.extractOne(
        query,
        _lookup.keys(),
        scorer=fuzz.token_sort_ratio,
        score_cutoff=_FUZZY_THRESHOLD,
    )

    if result is None:
        logger.debug("No fuzzy match for '%s' (threshold=%d)", raw_name, _FUZZY_THRESHOLD)
        return {
            "canonical_name": None, "loinc_code": None,
            "match_key": None, "match_score": None, "matched": False,
        }

    matched_key, score, _ = result
    entry = _lookup[matched_key]
    logger.debug(
        "Matched '%s' -> '%s' via key='%s' score=%.1f",
        raw_name, entry["canonical"], matched_key, score,
    )

    return {
        "canonical_name": entry.get("canonical"),
        "loinc_code": entry.get("loinc"),
        "match_key": matched_key,
        "match_score": round(float(score), 2),
        "matched": True,
    }


# ---------------------------------------------------------------------------
# Numeric value parsing
# ---------------------------------------------------------------------------

# Matches the leading numeric part of strings like "14.2", ">5.0", "< 3", "~2.1"
_NUMERIC_RE = re.compile(r"[<>~]?\s*(\d+(?:\.\d+)?)")


def parse_numeric_value(value_str: str) -> Optional[float]:
    """
    Extract a float from a raw value string.

    Examples:
      "14.2"     -> 14.2
      ">5.0"     -> 5.0
      "< 3"      -> 3.0
      "NEGATIVE" -> None
      ""         -> None
    """
    if not value_str:
        return None
    m = _NUMERIC_RE.search(value_str.strip())
    if m:
        try:
            return float(m.group(1))
        except ValueError:
            pass
    return None


# ---------------------------------------------------------------------------
# Reference range parsing
# ---------------------------------------------------------------------------

# Matches "3.5 - 5.0", "3.5-5.0", "3.5 to 5.0"
_RANGE_RE = re.compile(
    r"([<>]?\s*\d+(?:\.\d+)?)\s*(?:-|to)\s*([<>]?\s*\d+(?:\.\d+)?)",
    re.IGNORECASE,
)
# Matches single-bound ">5.0" or "<10"
_BOUND_RE = re.compile(r"([<>])\s*(\d+(?:\.\d+)?)")


def parse_reference_range(ref_str: str) -> "dict[str, Optional[float]]":
    """
    Parse a reference range string into low/high numeric bounds.

    Returns {"low": float|None, "high": float|None}.
    Returns {"low": None, "high": None} for ranges that cannot be parsed
    (e.g. "NEGATIVE", "REACTIVE", or missing).
    """
    if not ref_str:
        return {"low": None, "high": None}

    m = _RANGE_RE.search(ref_str)
    if m:
        try:
            low = float(re.sub(r"[<>\s]", "", m.group(1)))
            high = float(re.sub(r"[<>\s]", "", m.group(2)))
            return {"low": low, "high": high}
        except ValueError:
            pass

    # Single-bound: e.g. "<5.0" or ">10"
    m2 = _BOUND_RE.search(ref_str)
    if m2:
        operator, val_str = m2.group(1), m2.group(2)
        try:
            val = float(val_str)
            if operator == "<":
                return {"low": None, "high": val}
            else:
                return {"low": val, "high": None}
        except ValueError:
            pass

    return {"low": None, "high": None}


# ---------------------------------------------------------------------------
# Abnormality flag computation
# ---------------------------------------------------------------------------

def compute_abnormality_flag(
    numeric_value: Optional[float],
    reference_range_str: Optional[str],
) -> str:
    """
    Determine if a result is 'normal', 'high', 'low', or 'unknown'.

    Returns 'unknown' when:
      - The numeric value cannot be parsed from the value string
      - The reference range cannot be parsed
      - Both low and high bounds are absent
    """
    if numeric_value is None:
        return "unknown"

    bounds = parse_reference_range(reference_range_str or "")
    low, high = bounds["low"], bounds["high"]

    if low is None and high is None:
        return "unknown"

    if high is not None and numeric_value > high:
        return "high"
    if low is not None and numeric_value < low:
        return "low"
    return "normal"


# ---------------------------------------------------------------------------
# Full row normalization (called by orchestrator for each extracted table row)
# ---------------------------------------------------------------------------

def process_table_row(row: "dict[str, Any]") -> "dict[str, Any]":
    """
    Normalize a single extracted table row from Stage 1.

    Input row shape (from Gemini extraction):
      {"test_name": str, "value": str, "unit": str|None, "reference_range": str|None}

    Returns a dict ready for constructing a ReportResult ORM object.
    """
    raw_name = row.get("test_name", "")
    value_str = row.get("value", "")
    unit = row.get("unit")
    ref_range = row.get("reference_range")

    name_match = normalize_test_name(raw_name)
    numeric_value = parse_numeric_value(value_str)
    flag = compute_abnormality_flag(numeric_value, ref_range)

    return {
        "raw_test_name": raw_name,
        "value": value_str,
        "unit": unit,
        "reference_range": ref_range,
        "canonical_test_name": name_match["canonical_name"],
        "loinc_code": name_match["loinc_code"],
        "match_score": name_match["match_score"],
        "numeric_value": numeric_value,
        "abnormality_flag": flag,
    }
