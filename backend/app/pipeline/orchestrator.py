"""
Pipeline orchestrator -- chains Stage 1, 2a, 2b and writes to the database.

Data flow:
  file_path
    -> Stage 1 (gemini_extractor.extract)
       -> {"tables": [...], "narrative": [...]}
    -> Stage 2a (normalizer.process_table_row) applied to each table row
       -> normalized rows with canonical_name, loinc_code, abnormality_flag
    -> Stage 2b (ner_tagger.tag_narrative) applied to narrative blocks
       -> entity list with suppressed flags
    -> ORM writes: ReportResult rows + NarrativeEntity rows
    -> Report.status updated to "done" (or "failed")

Can be run from the command line for manual testing:
  cd backend
  python -m app.pipeline.orchestrator <path-to-image-or-pdf> <user-uuid>

Returns a summary dict (also what the FastAPI router returns to the caller).
"""

import logging
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.narrative_entity import NarrativeEntity
from app.models.user import User
from app.pipeline import ollama_extractor, gemini_extractor, normalizer, ner_tagger

logger = logging.getLogger(__name__)


def run_pipeline(
    file_path: "str | Path",
    user_id: uuid.UUID,
    original_filename: str,
    mime_type: str,
    db: Session,
    extractor_type: str = "qwen",
) -> "dict[str, Any]":
    """
    Full end-to-end ingestion pipeline for a single lab report file.

    Creates a Report row, runs all three stages, persists results, then
    updates the report status. Returns a summary dict.

    On any unrecoverable error the Report is marked status='failed' and
    the error message is included in the return dict.
    """
    # 1. Create the Report record (status=processing)
    report = Report(
        user_id=user_id,
        original_filename=original_filename,
        file_mime_type=mime_type,
        status="processing",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    report_id = report.id
    logger.info("Created Report id=%s for user_id=%s (extractor=%s)", report_id, user_id, extractor_type)

    try:
        # ---------------------------------------------------------------
        # Stage 1: Extraction (Gemini API vs Local Ollama Qwen2.5-VL)
        # ---------------------------------------------------------------
        extractor_choice = (extractor_type or "qwen").lower().strip()
        if extractor_choice in ("gemini", "gemini-api", "cloud"):
            logger.info("[Stage 1] Starting Gemini API extraction for report=%s", report_id)
            extraction_result = gemini_extractor.extract(file_path)
        else:
            logger.info("[Stage 1] Starting local Qwen-VL extraction for report=%s", report_id)
            extraction_result = ollama_extractor.extract(file_path)

        if extraction_result["error"] or extraction_result["parsed"] is None:
            raise RuntimeError(
                f"Document extraction failed: {extraction_result['error']}\n"
                f"Raw response: {extraction_result['raw_text'][:300]}"
            )

        parsed = extraction_result["parsed"]
        tables: list = parsed.get("tables", [])
        narrative: list = parsed.get("narrative", [])

        logger.info(
            "[Stage 1] Extracted %d table rows, %d narrative blocks",
            len(tables), len(narrative),
        )

        # ---------------------------------------------------------------
        # Stage 2a: Normalization (fuzzy match + abnormality flag) + Deduplication
        # ---------------------------------------------------------------
        logger.info("[Stage 2a] Normalizing %d table rows", len(tables))
        now = datetime.now(tz=timezone.utc)
        normalized_list: list = []

        for row in tables:
            norm = normalizer.process_table_row(row)
            normalized_list.append(norm)

        # Check and flag duplicate measures on the same calendar date
        from app.pipeline.deduplication import check_and_flag_measurements
        flagged_list = check_and_flag_measurements(
            db=db,
            user_id=user_id,
            report_id=report_id,
            report_created_at=report.created_at or now,
            measurement_items=normalized_list,
        )

        result_rows: list = []
        for norm in flagged_list:
            result_rows.append(ReportResult(
                report_id=report_id,
                raw_test_name=norm["raw_test_name"],
                value=norm["value"],
                unit=norm["unit"],
                reference_range=norm["reference_range"],
                canonical_test_name=norm["canonical_test_name"],
                loinc_code=norm["loinc_code"],
                match_score=norm["match_score"],
                numeric_value=norm["numeric_value"],
                abnormality_flag=norm["abnormality_flag"],
                is_duplicate_same_date=norm.get("is_duplicate_same_date", False),
                extracted_at=now,
            ))

        db.add_all(result_rows)

        # ---------------------------------------------------------------
        # Stage 2b: NER on narrative blocks
        # ---------------------------------------------------------------
        entity_rows: list = []
        if narrative:
            logger.info("[Stage 2b] Running NER on %d narrative blocks", len(narrative))
            entities = ner_tagger.tag_narrative(narrative)

            for ent in entities:
                entity_rows.append(NarrativeEntity(
                    report_id=report_id,
                    entity_text=ent["entity_text"],
                    entity_type=ent["entity_type"],
                    canonical_name=None,  # future: resolve to SNOMED/LOINC
                    score=ent["score"],
                    suppressed=ent["suppressed"],
                    extracted_at=now,
                ))

            db.add_all(entity_rows)
        else:
            logger.info("[Stage 2b] No narrative blocks -- skipping NER.")

        # ---------------------------------------------------------------
        # Finalize: mark report as done
        # ---------------------------------------------------------------
        report.status = "done"
        report.extracted_at = now
        db.commit()

        summary = {
            "report_id": str(report_id),
            "status": "done",
            "result_count": len(result_rows),
            "entity_count": len(entity_rows),
            "suppressed_entity_count": sum(1 for e in entity_rows if e.suppressed),
            "model_used": extraction_result["model"],
            "error": None,
        }
        logger.info("Pipeline complete: %s", summary)
        return summary

    except Exception as exc:
        logger.error("Pipeline failed for report=%s: %s", report_id, exc, exc_info=True)
        report.status = "failed"
        db.commit()
        return {
            "report_id": str(report_id),
            "status": "failed",
            "result_count": 0,
            "entity_count": 0,
            "suppressed_entity_count": 0,
            "model_used": None,
            "error": str(exc),
        }


# ---------------------------------------------------------------------------
# CLI entry point for manual testing
# ---------------------------------------------------------------------------
# Usage (from backend/ directory, with venv active):
#   python -m app.pipeline.orchestrator path/to/report.jpg <user-uuid>
#
# If no user-uuid is provided, a random UUID is used (for quick smoke tests).

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

    if len(sys.argv) < 2:
        print("Usage: python -m app.pipeline.orchestrator <file_path> [user_uuid]")
        sys.exit(1)

    fp = Path(sys.argv[1])
    mime = "image/jpeg"
    if fp.suffix.lower() == ".pdf":
        mime = "application/pdf"
    elif fp.suffix.lower() == ".png":
        mime = "image/png"

    db_session = SessionLocal()
    try:
        if len(sys.argv) > 2:
            uid = uuid.UUID(sys.argv[2])
        else:
            user = db_session.query(User).first()
            if not user:
                user = User(
                    email="test@genhealth.dev",
                    password_hash="dev-mock-hash",
                    full_name="Dev Test User",
                    role="patient",
                )
                db_session.add(user)
                db_session.commit()
                db_session.refresh(user)
                logger.info(f"Created default user: {user.id}")
            uid = user.id
            logger.info(f"Using database user: {uid} ({user.email})")

        result = run_pipeline(
            file_path=fp,
            user_id=uid,
            original_filename=fp.name,
            mime_type=mime,
            db=db_session,
        )
        print("\n=== Pipeline Result ===")
        for k, v in result.items():
            print(f"  {k}: {v}")
    finally:
        db_session.close()
