"""
FastAPI router -- lab report ingestion endpoints.

POST /api/v1/reports/ingest
  Accepts a multipart file upload (image or PDF).
  Runs the full 3-stage pipeline and returns a summary.

GET /api/v1/reports/{report_id}/results
  Returns all extracted results for a given report.

GET /api/v1/reports/users/{user_id}/trend/{canonical_test_name}
  Core health-tracking query: all values for one canonical test across
  all of a user's reports, ordered by report date (newest first).

  Equivalent SQL:
    SELECT rr.canonical_test_name, rr.numeric_value, rr.unit,
           rr.reference_range, rr.abnormality_flag, r.created_at
    FROM report_results rr
    JOIN reports r ON rr.report_id = r.id
    WHERE r.user_id = :user_id
      AND rr.canonical_test_name = :canonical_test_name
    ORDER BY r.created_at DESC;
"""

import mimetypes
import os
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Path as FPath, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.report import Report
from app.models.report_result import ReportResult
from app.pipeline.orchestrator import run_pipeline

router = APIRouter(prefix="/api/v1/reports", tags=["Lab Reports"])

_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
}


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class IngestionResponse(BaseModel):
    report_id: str
    status: str
    result_count: int
    entity_count: int
    suppressed_entity_count: int
    model_used: "str | None"
    error: "str | None"


class ReportResultResponse(BaseModel):
    id: str
    raw_test_name: str
    canonical_test_name: "str | None"
    loinc_code: "str | None"
    value: str
    numeric_value: "float | None"
    unit: "str | None"
    reference_range: "str | None"
    abnormality_flag: str
    match_score: "float | None"
    extracted_at: str


class TrendDataPoint(BaseModel):
    report_id: str
    numeric_value: "float | None"
    value: str
    unit: "str | None"
    reference_range: "str | None"
    abnormality_flag: str
    report_date: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/ingest",
    response_model=IngestionResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Ingest a lab report image or PDF",
    description=(
        "Upload a lab report (JPEG, PNG, GIF, WEBP, or PDF). "
        "Runs the 3-stage extraction + NLP pipeline and persists results. "
        "Requires user_id as a query parameter (replace with JWT auth once middleware is added)."
    ),
)
async def ingest_report(
    file: UploadFile = File(..., description="Lab report image or PDF"),
    user_id: uuid.UUID = Query(..., description="UUID of the uploading user"),
    db: Session = Depends(get_db),
) -> IngestionResponse:
    """
    Ingest a lab report through the full 3-stage pipeline.

    Steps:
    1. Validate MIME type.
    2. Write upload to a temp file (SDK reads from path).
    3. Run pipeline, clean up temp file, return summary.

    Note: user_id is a query param for now because JWT middleware does not
    yet exist in this codebase. Once auth is wired up, extract it from the
    JWT claims instead.
    """
    content_type = file.content_type or ""
    if content_type in ("application/octet-stream", ""):
        guessed, _ = mimetypes.guess_type(file.filename or "")
        content_type = guessed or content_type

    if content_type not in _ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{content_type}'. "
                f"Allowed: {', '.join(sorted(_ALLOWED_MIME_TYPES))}"
            ),
        )

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    suffix = mimetypes.guess_extension(content_type) or ".bin"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        tmp_path = Path(tmp.name)

    try:
        result = run_pipeline(
            file_path=tmp_path,
            user_id=user_id,
            original_filename=file.filename or "upload",
            mime_type=content_type,
            db=db,
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

    return IngestionResponse(**result)


@router.get(
    "/{report_id}/results",
    response_model=list,
    summary="Get all extracted results for a report",
)
def get_report_results(
    report_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
) -> list:
    """Return all ReportResult rows for the given report."""
    stmt = select(ReportResult).where(ReportResult.report_id == report_id)
    rows = db.execute(stmt).scalars().all()

    if not rows:
        report_stmt = select(Report).where(Report.id == report_id)
        report = db.execute(report_stmt).scalar_one_or_none()
        if report is None:
            raise HTTPException(status_code=404, detail="Report not found.")

    return [
        {
            "id": str(r.id),
            "raw_test_name": r.raw_test_name,
            "canonical_test_name": r.canonical_test_name,
            "loinc_code": r.loinc_code,
            "value": r.value,
            "numeric_value": r.numeric_value,
            "unit": r.unit,
            "reference_range": r.reference_range,
            "abnormality_flag": r.abnormality_flag,
            "match_score": r.match_score,
            "extracted_at": r.extracted_at.isoformat(),
        }
        for r in rows
    ]


@router.get(
    "/users/{user_id}/trend/{canonical_test_name}",
    response_model=list,
    summary="Health trend: one test across all user reports over time",
    description=(
        "Core health-tracking query. Returns all values for a single canonical "
        "test name (e.g. 'Hemoglobin') across all reports for this user, "
        "sorted by report date (newest first)."
    ),
)
def get_test_trend(
    user_id: uuid.UUID = FPath(...),
    canonical_test_name: str = FPath(...),
    db: Session = Depends(get_db),
) -> list:
    """
    Health tracking over time query.

    Equivalent SQL:
      SELECT rr.canonical_test_name, rr.numeric_value, rr.unit,
             rr.reference_range, rr.abnormality_flag, r.created_at
      FROM report_results rr
      JOIN reports r ON rr.report_id = r.id
      WHERE r.user_id = :user_id
        AND rr.canonical_test_name = :canonical_test_name
      ORDER BY r.created_at DESC;
    """
    stmt = (
        select(ReportResult, Report.created_at)
        .join(Report, ReportResult.report_id == Report.id)
        .where(Report.user_id == user_id)
        .where(ReportResult.canonical_test_name == canonical_test_name)
        .order_by(Report.created_at.desc())
    )
    rows = db.execute(stmt).all()

    return [
        {
            "report_id": str(rr.report_id),
            "numeric_value": rr.numeric_value,
            "value": rr.value,
            "unit": rr.unit,
            "reference_range": rr.reference_range,
            "abnormality_flag": rr.abnormality_flag,
            "report_date": created_at.isoformat(),
        }
        for rr, created_at in rows
    ]
