"""
Stage 2b - Biomedical NER: narrative text -> tagged entities.

Model: d4data/biomedical-ner-all (HuggingFace Hub)
  https://huggingface.co/d4data/biomedical-ner-all

Runs locally via transformers.pipeline on CPU.
The AMD Ryzen 7 PRO 4750U handles this fine -- model is ~420MB, inference
per narrative block is <2s on CPU for typical paragraph-length inputs.

First run will download the model to the HuggingFace cache (~420MB).
Subsequent runs load from cache instantly.

Entity types produced by this model:
  Disease_disorder | Sign_symptom | Lab_value | Diagnostic_procedure |
  Medication | Biological_structure | Severity | Duration | ...

We only surface: Disease_disorder, Sign_symptom, Lab_value, Diagnostic_procedure.

------------------------------------------------------------------------------
BOILERPLATE SUPPRESSION HEURISTIC:

  Problem: Lab reports often include advisory boilerplate like:
    "If you have symptoms of diabetes, consult your physician."
    "Elevated LDL increases risk of cardiovascular disease."
  NER picks up "diabetes" and "cardiovascular disease" as Disease_disorder,
  but these are not actual findings -- they are generic advice.

  Heuristic: an entity is suppressed (suppressed=True) if the sentence
  containing it matches ANY of the following conditions:

    Rule 1 - Advisory verb/phrase:
      The sentence contains an advisory keyword such as:
        "consult", "seek medical", "if you experience", "if you notice",
        "please note", "recommend", "advised to", "risk of",
        "may indicate", "can indicate", "could indicate"
      Rationale: these phrases signal cautionary/educational text, not findings.

    Rule 2 - No numeric co-occurrence:
      The entity is Disease_disorder AND the sentence contains no digit.
      Rationale: a real finding (e.g. "HbA1c elevated at 9.2% -- diabetes")
      is almost always accompanied by a numeric value in the same sentence.
      A sentence like "risk of diabetes" has no number.

  Entities of type Sign_symptom, Lab_value, Diagnostic_procedure are NOT
  suppressed by Rule 2 -- only Disease_disorder is, because the false-positive
  rate for the other types is much lower in practice.

  The suppressed flag is stored in the DB (not discarded) so you can audit
  what was filtered and tune the heuristic over time.
------------------------------------------------------------------------------
"""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Entity types we care about from d4data/biomedical-ner-all
_TARGET_ENTITY_TYPES = {
    "Disease_disorder",
    "Sign_symptom",
    "Lab_value",
    "Diagnostic_procedure",
}

# Advisory keywords for Rule 1 of the boilerplate suppression heuristic.
# Case-insensitive. Add more here if you observe false positives.
_ADVISORY_PATTERNS = re.compile(
    r"\b(?:consult|seek medical|if you experience|if you notice|"
    r"please note|recommend|advised to|risk of|may indicate|"
    r"can indicate|could indicate|do not ignore|in case of|"
    r"should you have|speak to your)\b",
    re.IGNORECASE,
)

_HAS_DIGIT = re.compile(r"\d")

# Lazy-loaded NER pipeline -- loaded on first call to avoid startup cost
_ner_pipeline = None


def _get_ner_pipeline():
    """Load the d4data/biomedical-ner-all model on first call (CPU-only)."""
    global _ner_pipeline
    if _ner_pipeline is None:
        try:
            from transformers import pipeline as hf_pipeline

            logger.info(
                "Loading d4data/biomedical-ner-all NER model "
                "(first run downloads ~420MB)..."
            )
            _ner_pipeline = hf_pipeline(
                "token-classification",
                model="d4data/biomedical-ner-all",
                aggregation_strategy="simple",
                device=-1,  # -1 forces CPU (no CUDA/ROCm required)
            )
            logger.info("NER model loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load NER model: %s", exc, exc_info=True)
            raise
    return _ner_pipeline


# ---------------------------------------------------------------------------
# Sentence splitting
# ---------------------------------------------------------------------------

def _split_sentences(text: str) -> "list[str]":
    """Split text into sentences on '.', '!', '?', or newlines."""
    raw = re.split(r"(?<=[.!?])\s+|\n+", text.strip())
    return [s.strip() for s in raw if s.strip()]


# ---------------------------------------------------------------------------
# Boilerplate suppression
# ---------------------------------------------------------------------------

def _is_boilerplate_sentence(sentence: str, entity_type: str) -> bool:
    """
    Return True if this sentence should be treated as advisory boilerplate.
    See module docstring for full heuristic rationale.
    """
    # Rule 1: sentence contains advisory keyword
    if _ADVISORY_PATTERNS.search(sentence):
        return True

    # Rule 2: Disease_disorder with no numeric value in the same sentence
    if entity_type == "Disease_disorder" and not _HAS_DIGIT.search(sentence):
        return True

    return False


# ---------------------------------------------------------------------------
# Main NER function
# ---------------------------------------------------------------------------

def tag_narrative(narrative_blocks: "list[dict[str, str]]") -> "list[dict[str, Any]]":
    """
    Stage 2b entry point.

    Input: narrative list from Stage 1 extraction.
      [{"label": "Interpretation", "text": "..."}, ...]

    Output: list of entity dicts, one per detected entity across all blocks.
      Each dict:
      {
        "entity_text": str,
        "entity_type": str,
        "score": float,
        "source_label": str,
        "suppressed": bool,
      }

    Returns [] if narrative_blocks is empty or all blocks have empty text.
    """
    if not narrative_blocks:
        return []

    ner = _get_ner_pipeline()
    results: list = []

    for block in narrative_blocks:
        label = block.get("label", "unlabeled")
        text = block.get("text", "").strip()
        if not text:
            continue

        try:
            raw_entities = ner(text)
        except Exception as exc:
            logger.error("NER failed on block '%s': %s", label, exc, exc_info=True)
            continue

        sentences = _split_sentences(text)

        for ent in raw_entities:
            etype = ent.get("entity_group", "")
            if etype not in _TARGET_ENTITY_TYPES:
                continue

            entity_text = ent.get("word", "").strip()
            score = float(ent.get("score", 0.0))

            # Find which sentence contains this entity (first match)
            containing_sentence = next(
                (s for s in sentences if entity_text.lower() in s.lower()),
                text,
            )

            suppressed = _is_boilerplate_sentence(containing_sentence, etype)

            if suppressed:
                logger.debug(
                    "Suppressed boilerplate entity: '%s' (%s) in: '%s...'",
                    entity_text, etype, containing_sentence[:60],
                )

            results.append({
                "entity_text": entity_text,
                "entity_type": etype,
                "score": round(score, 4),
                "source_label": label,
                "suppressed": suppressed,
            })

    logger.info(
        "NER complete -- %d entities found, %d suppressed as boilerplate.",
        len(results),
        sum(1 for r in results if r["suppressed"]),
    )
    return results
