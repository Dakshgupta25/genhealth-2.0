"""
Stage 1 - Extraction: image/PDF -> structured JSON via the Gemini API.

Uses the official google-genai Python SDK.
Model: gemini-2.5-flash  (fall back to gemini-2.5-flash-lite if hitting rate limits
       by changing the model_id variable below)

!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
IMPORTANT PRIVACY WARNING - READ BEFORE PROCESSING REAL PATIENT DATA:

  The free tier of the Gemini API (api.google.com) allows Google to use your
  prompts and responses to improve its models (per the Terms of Service).
  This means any lab report images / text you send may be used for training.

  Before processing real patient data:
    1. Upgrade to a paid Google Cloud Vertex AI endpoint (not AI Studio key), OR
    2. Use Gemini via Vertex AI with data residency + no-training opt-out, OR
    3. Switch entirely to a self-hosted vision model once hardware allows.

  The API key stored in GEMINI_API_KEY is an AI Studio key (free tier).
  Swap it for a Vertex AI service account credential for production.
!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
"""

import base64
import json
import logging
import mimetypes
import time
from pathlib import Path
from typing import Any

from google import genai
from google.genai import types as genai_types
from google.genai import errors as genai_errors

from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
_DEFAULT_MODEL = "gemini-2.5-flash"
# Swap to "gemini-2.5-flash-lite" here if hitting free-tier rate limits
_FALLBACK_MODEL = "gemini-2.5-flash-lite"

# Retry configuration for free-tier rate-limiting (HTTP 429 / ResourceExhausted)
_MAX_RETRIES = 3
_BASE_BACKOFF_SECONDS = 5  # doubles each retry: 5, 10, 20


# Structured output schema sent to Gemini.
# Instructs the model to return ONLY valid JSON matching this shape.
_EXTRACTION_PROMPT = """
You are a medical lab report parser. Your ONLY job is to extract data from the
provided lab report image or PDF and return it as valid JSON - nothing else.

Return a JSON object with exactly two top-level keys:

1. "tables": A list of objects extracted from tabular / structured sections.
   Each object MUST have these fields (use null if not present on the report):
   {
     "test_name": string,
     "value": string,
     "unit": string | null,
     "reference_range": string | null
   }

2. "narrative": A list of free-text blocks from non-tabular sections.
   Each object MUST have these fields:
   {
     "label": string,
     "text": string
   }

Rules:
- Do NOT merge tables and narrative into one flat list.
- Do NOT add any fields beyond those specified.
- Do NOT include markdown, code fences, or explanations - raw JSON only.
- If the report has no tabular data, return an empty list for "tables".
- If the report has no free-text narrative, return an empty list for "narrative".
- Extract ALL test rows visible; do not skip rows.
"""


def _build_client() -> genai.Client:
    """Build and return an authenticated Gemini client using the API key from config."""
    if not settings.GEMINI_API_KEY:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to your .env file. "
            "Get a key at https://aistudio.google.com/app/apikey"
        )
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _detect_mime_type(path: Path) -> str:
    """
    Detect MIME type from file extension.
    Gemini natively supports: image/jpeg, image/png, image/gif,
    image/webp, application/pdf.
    """
    mime, _ = mimetypes.guess_type(str(path))
    if mime not in {"image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"}:
        logger.warning(
            "Unrecognized MIME type '%s' for %s - defaulting to image/jpeg",
            mime, path.name,
        )
        return "image/jpeg"
    return mime or "image/jpeg"


def extract(file_path: "str | Path") -> "dict[str, Any]":
    """
    Stage 1 entry point.

    Sends the image or PDF to Gemini with a structured prompt and returns:
    {
        "parsed": {
            "tables": [...],
            "narrative": [...]
        },
        "raw_text": str,
        "model": str,
        "error": str | None
    }

    The "parsed" key will be None if JSON parsing failed.
    Check "error" and "raw_text" to debug failures.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Lab report file not found: {path}")

    client = _build_client()
    mime_type = _detect_mime_type(path)
    file_bytes = path.read_bytes()

    model_id = _DEFAULT_MODEL
    last_error = None

    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            logger.info(
                "Gemini extraction attempt %d/%d - file='%s', model='%s'",
                attempt, _MAX_RETRIES, path.name, model_id,
            )

            response = client.models.generate_content(
                model=model_id,
                contents=[
                    genai_types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=mime_type,
                    ),
                    _EXTRACTION_PROMPT,
                ],
                config=genai_types.GenerateContentConfig(
                    # JSON mode: forces the model to return well-formed JSON,
                    # dramatically reducing malformed-output errors.
                    response_mime_type="application/json",
                    temperature=0.0,  # deterministic extraction
                ),
            )

            raw_text = response.text or ""

            try:
                parsed = json.loads(raw_text)
                if "tables" not in parsed or "narrative" not in parsed:
                    raise ValueError(
                        f"Response JSON missing required keys. Got: {list(parsed.keys())}"
                    )
            except (json.JSONDecodeError, ValueError) as parse_err:
                logger.error(
                    "Failed to parse Gemini JSON response: %s\nRaw text: %s",
                    parse_err, raw_text[:500],
                )
                return {
                    "parsed": None,
                    "raw_text": raw_text,
                    "model": model_id,
                    "error": f"JSON parse error: {parse_err}",
                }

            logger.info(
                "Extraction successful - %d table rows, %d narrative blocks",
                len(parsed.get("tables", [])),
                len(parsed.get("narrative", [])),
            )
            return {
                "parsed": parsed,
                "raw_text": raw_text,
                "model": model_id,
                "error": None,
            }

        except genai_errors.APIError as exc:
            # HTTP 429 rate-limit - apply exponential backoff and retry.
            # Free tier limit: ~15 requests/minute for gemini-2.5-flash.
            if exc.code != 429:
                # Non-rate-limit API error -- do not retry
                logger.error("Gemini API error (code=%s): %s", exc.code, exc, exc_info=True)
                return {
                    "parsed": None,
                    "raw_text": "",
                    "model": model_id,
                    "error": f"Gemini API error {exc.code}: {exc}",
                }
            backoff = _BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
            logger.warning(
                "Rate limit hit (attempt %d/%d). Retrying in %ds. Error: %s",
                attempt, _MAX_RETRIES, backoff, exc,
            )
            last_error = exc
            time.sleep(backoff)

        except Exception as exc:
            logger.error("Unexpected error during Gemini extraction: %s", exc, exc_info=True)
            return {
                "parsed": None,
                "raw_text": "",
                "model": model_id,
                "error": str(exc),
            }

    # All retries exhausted
    logger.error("All %d Gemini extraction attempts failed.", _MAX_RETRIES)
    return {
        "parsed": None,
        "raw_text": "",
        "model": model_id,
        "error": f"Rate limit exhausted after {_MAX_RETRIES} retries: {last_error}",
    }
