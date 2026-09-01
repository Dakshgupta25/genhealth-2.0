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
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.report import Report
from app.models.report_result import ReportResult
from app.pipeline.orchestrator import run_pipeline
from app.pipeline import normalizer

router = APIRouter(prefix="/api/v1/reports", tags=["Lab Reports"])

_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
}


# ---------------------------------------------------------------------------
# Schemas
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
    is_duplicate_same_date: bool = False
    extracted_at: str


class TrendDataPoint(BaseModel):
    report_id: str
    numeric_value: "float | None"
    value: str
    unit: "str | None"
    reference_range: "str | None"
    abnormality_flag: str
    report_date: str


class MeasurementInputItem(BaseModel):
    raw_test_name: str
    value: str
    unit: "str | None" = None
    reference_range: "str | None" = None
    canonical_test_name: "str | None" = None
    abnormality_flag: "str | None" = None


class UpdateReportResultsRequest(BaseModel):
    results: list[MeasurementInputItem]


class ManualReportCreateRequest(BaseModel):
    user_id: uuid.UUID
    original_filename: "str | None" = "Manual Entry"
    results: list[MeasurementInputItem]


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
    extractor: str = Query("qwen", description="Extractor to use: 'qwen' (Local Ollama) or 'gemini' (Gemini API)"),
    db: Session = Depends(get_db),
) -> IngestionResponse:
    """
    Ingest a lab report through the full 3-stage pipeline.

    Steps:
    1. Validate MIME type.
    2. Write upload to a temp file (SDK reads from path).
    3. Run pipeline with selected extractor, clean up temp file, return summary.

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
            extractor_type=extractor,
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
            "is_duplicate_same_date": bool(r.is_duplicate_same_date),
            "extracted_at": r.extracted_at.isoformat() if r.extracted_at else "",
        }
        for r in rows
    ]


@router.get(
    "/users/{user_id}/trend/{canonical_test_name}",
    response_model=list,
    summary="Health trend: one test across all user reports over time",
    description=(
        "Core health-tracking query. Returns all values for a single canonical "
        "test name across all reports for this user, excluding same-date duplicates."
    ),
)
def get_test_trend(
    user_id: uuid.UUID = FPath(...),
    canonical_test_name: str = FPath(...),
    db: Session = Depends(get_db),
) -> list:
    """
    Health tracking over time query. Excludes same-date duplicates so longitudinal trends remain accurate.
    """
    stmt = (
        select(ReportResult, Report.created_at)
        .join(Report, ReportResult.report_id == Report.id)
        .where(Report.user_id == user_id)
        .where(ReportResult.canonical_test_name == canonical_test_name)
        .where(ReportResult.is_duplicate_same_date == False)
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


@router.put(
    "/{report_id}/results",
    response_model=list[ReportResultResponse],
    summary="Update and commit edited measurements for a report",
)
def update_report_results(
    report_id: uuid.UUID = FPath(...),
    payload: UpdateReportResultsRequest = ...,
    db: Session = Depends(get_db),
) -> list:
    # Reasoning:
    # Allows the patient or clinician to edit extracted test values, delete incorrect rows,
    # and add missing measurements prior to saving. Normalizes updated table rows and flags
    # same-date duplicates to prevent storing redundant measures in longitudinal database tables.
    report_stmt = select(Report).where(Report.id == report_id)
    report = db.execute(report_stmt).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    # Delete existing results for this report and replace with user-verified items
    db.execute(delete(ReportResult).where(ReportResult.report_id == report_id))

    normalized_items: list[dict] = []
    for item in payload.results:
        norm = normalizer.process_table_row({
            "test_name": item.raw_test_name,
            "value": item.value,
            "unit": item.unit,
            "reference_range": item.reference_range,
        })
        canonical_name = item.canonical_test_name or norm["canonical_test_name"]
        abnormality_flag = item.abnormality_flag or norm["abnormality_flag"]

        normalized_items.append({
            "raw_test_name": item.raw_test_name,
            "value": item.value,
            "unit": item.unit,
            "reference_range": item.reference_range,
            "canonical_test_name": canonical_name,
            "loinc_code": norm["loinc_code"],
            "match_score": norm["match_score"],
            "numeric_value": norm["numeric_value"],
            "abnormality_flag": abnormality_flag,
        })

    from app.pipeline.deduplication import check_and_flag_measurements
    flagged = check_and_flag_measurements(
        db=db,
        user_id=report.user_id,
        report_id=report.id,
        report_created_at=report.created_at,
        measurement_items=normalized_items,
    )

    new_results: list[ReportResult] = []
    for item in flagged:
        new_results.append(
            ReportResult(
                report_id=report_id,
                raw_test_name=item["raw_test_name"],
                value=item["value"],
                unit=item["unit"],
                reference_range=item["reference_range"],
                canonical_test_name=item["canonical_test_name"],
                loinc_code=item["loinc_code"],
                match_score=item["match_score"],
                numeric_value=item["numeric_value"],
                abnormality_flag=item["abnormality_flag"],
                is_duplicate_same_date=item.get("is_duplicate_same_date", False),
            )
        )

    db.add_all(new_results)
    report.status = "done"
    db.commit()

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
            "is_duplicate_same_date": bool(r.is_duplicate_same_date),
            "extracted_at": r.extracted_at.isoformat() if r.extracted_at else "",
        }
        for r in new_results
    ]


@router.post(
    "/manual",
    response_model=IngestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Save manually entered medical measurements",
)
def create_manual_report(
    payload: ManualReportCreateRequest,
    db: Session = Depends(get_db),
) -> IngestionResponse:
    report = Report(
        user_id=payload.user_id,
        original_filename=payload.original_filename or "Manual Entry",
        file_mime_type="manual/entry",
        status="done",
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    normalized_items: list[dict] = []
    for item in payload.results:
        norm = normalizer.process_table_row({
            "test_name": item.raw_test_name,
            "value": item.value,
            "unit": item.unit,
            "reference_range": item.reference_range,
        })
        normalized_items.append({
            "raw_test_name": item.raw_test_name,
            "value": item.value,
            "unit": item.unit,
            "reference_range": item.reference_range,
            "canonical_test_name": item.canonical_test_name or norm["canonical_test_name"],
            "loinc_code": norm["loinc_code"],
            "match_score": norm["match_score"],
            "numeric_value": norm["numeric_value"],
            "abnormality_flag": item.abnormality_flag or norm["abnormality_flag"],
        })

    from app.pipeline.deduplication import check_and_flag_measurements
    flagged = check_and_flag_measurements(
        db=db,
        user_id=report.user_id,
        report_id=report.id,
        report_created_at=report.created_at,
        measurement_items=normalized_items,
    )

    result_rows: list[ReportResult] = []
    for item in flagged:
        result_rows.append(
            ReportResult(
                report_id=report.id,
                raw_test_name=item["raw_test_name"],
                value=item["value"],
                unit=item["unit"],
                reference_range=item["reference_range"],
                canonical_test_name=item["canonical_test_name"],
                loinc_code=item["loinc_code"],
                match_score=item["match_score"],
                numeric_value=item["numeric_value"],
                abnormality_flag=item["abnormality_flag"],
                is_duplicate_same_date=item.get("is_duplicate_same_date", False),
            )
        )

    db.add_all(result_rows)
    db.commit()

    return IngestionResponse(
        report_id=str(report.id),
        status="done",
        result_count=len(result_rows),
        entity_count=0,
        suppressed_entity_count=0,
        model_used="manual_entry",
        error=None,
    )


class UserReportSummaryResponse(BaseModel):
    id: uuid.UUID
    original_filename: str
    file_mime_type: str
    status: str
    created_at: str
    result_count: int


class UpdateReportNameRequest(BaseModel):
    original_filename: str


@router.get(
    "/users/{user_id}/recent",
    response_model=list[UserReportSummaryResponse],
    summary="Get recent lab reports uploaded by a user",
)
def get_user_recent_reports(
    user_id: uuid.UUID = FPath(...),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> list[UserReportSummaryResponse]:
    # Reasoning:
    # Fetches only successfully extracted lab reports (status == 'done') sorted by creation date (newest first),
    # ensuring failed or incomplete extractions never clutter the patient's medical history.
    stmt = (
        select(Report)
        .where(Report.user_id == user_id)
        .where(Report.status == "done")
        .order_by(Report.created_at.desc())
        .limit(limit)
    )
    reports = db.execute(stmt).scalars().all()

    summaries = []
    for rep in reports:
        count_stmt = select(ReportResult).where(ReportResult.report_id == rep.id)
        results = db.execute(count_stmt).scalars().all()
        # Only include reports that have extracted result measures
        if len(results) > 0:
            summaries.append(
                UserReportSummaryResponse(
                    id=rep.id,
                    original_filename=rep.original_filename,
                    file_mime_type=rep.file_mime_type,
                    status=rep.status,
                    created_at=rep.created_at.isoformat() if rep.created_at else "",
                    result_count=len(results),
                )
            )

    return summaries


@router.patch(
    "/{report_id}/name",
    response_model=UserReportSummaryResponse,
    summary="Update and rename a lab report",
)
def update_report_name(
    report_id: uuid.UUID = FPath(...),
    payload: UpdateReportNameRequest = ...,
    db: Session = Depends(get_db),
) -> UserReportSummaryResponse:
    # Reasoning:
    # Allows patients or clinicians to customize and rename uploaded report documents at any time.
    new_name = payload.original_filename.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Report name cannot be empty.")

    report_stmt = select(Report).where(Report.id == report_id)
    report = db.execute(report_stmt).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    report.original_filename = new_name
    db.commit()
    db.refresh(report)

    count_stmt = select(ReportResult).where(ReportResult.report_id == report.id)
    results = db.execute(count_stmt).scalars().all()

    return UserReportSummaryResponse(
        id=report.id,
        original_filename=report.original_filename,
        file_mime_type=report.file_mime_type,
        status=report.status,
        created_at=report.created_at.isoformat() if report.created_at else "",
        result_count=len(results),
    )


@router.delete(
    "/{report_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a report and all its extracted measurements",
)
def delete_report(
    report_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
) -> dict:
    """
    Permanently deletes a report and all associated extracted measurements from the database.
    """
    report_stmt = select(Report).where(Report.id == report_id)
    report = db.execute(report_stmt).scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found.")

    # Delete all associated extracted measurements explicitly and the report
    db.execute(delete(ReportResult).where(ReportResult.report_id == report_id))
    db.delete(report)
    db.commit()

    return {
        "message": "Report and all extracted measurements permanently deleted successfully.",
        "report_id": str(report_id),
    }
