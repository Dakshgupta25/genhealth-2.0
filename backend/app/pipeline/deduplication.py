"""
Measurement deduplication helper.

Identifies if an extracted lab measurement with the same test name (raw or canonical)
and identical value already exists for the user on the same calendar date.
When true, the measurement is marked as `is_duplicate_same_date = True` so that
it is excluded from longitudinal health tracking, clinical trend charts, and database metrics,
while still being displayed transparently in the upload document history table.
"""

import uuid
from datetime import datetime, date
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.report import Report
from app.models.report_result import ReportResult


def check_and_flag_measurements(
    db: Session,
    user_id: uuid.UUID,
    report_id: uuid.UUID,
    report_created_at: datetime | None,
    measurement_items: list[dict],
) -> list[dict]:
    """
    Given a list of normalized measurement dictionaries, marks each item with:
      'is_duplicate_same_date': True / False

    Matches if an identical test (canonical or raw name) with the exact same value
    has already been stored for this user on the same calendar day.
    """
    target_date: date = (report_created_at.date() if report_created_at else datetime.now().date())

    # Find existing results for this user on the same date (excluding current report)
    stmt = (
        select(ReportResult, Report.created_at)
        .join(Report, ReportResult.report_id == Report.id)
        .where(Report.user_id == user_id)
        .where(Report.id != report_id)
    )
    existing_rows = db.execute(stmt).all()

    same_date_existing: list[ReportResult] = []
    for rr, created_at in existing_rows:
        if created_at and created_at.date() == target_date:
            same_date_existing.append(rr)

    seen_in_batch: set[tuple[str, str]] = set()
    flagged_results: list[dict] = []

    for item in measurement_items:
        raw_name = (item.get("raw_test_name") or item.get("test_name") or "").strip().lower()
        can_name = (item.get("canonical_test_name") or "").strip().lower() if item.get("canonical_test_name") else None
        val = str(item.get("value") or "").strip().lower()

        is_dup = False

        # 1. Check if identical in current upload batch
        batch_key_1 = (raw_name, val)
        batch_key_2 = (can_name, val) if can_name else None

        if batch_key_1 in seen_in_batch or (batch_key_2 and batch_key_2 in seen_in_batch):
            is_dup = True

        # 2. Check if identical measure exists in other reports on the same date
        if not is_dup:
            for ex in same_date_existing:
                ex_val = (ex.value or "").strip().lower()
                if ex_val != val:
                    continue
                ex_raw = (ex.raw_test_name or "").strip().lower()
                ex_can = (ex.canonical_test_name or "").strip().lower() if ex.canonical_test_name else None

                if (can_name and ex_can and can_name == ex_can) or (raw_name and ex_raw and raw_name == ex_raw):
                    is_dup = True
                    break

        # Register in current batch
        if raw_name and val:
            seen_in_batch.add(batch_key_1)
        if can_name and val:
            seen_in_batch.add(batch_key_2)

        item_copy = dict(item)
        item_copy["is_duplicate_same_date"] = is_dup
        flagged_results.append(item_copy)

    return flagged_results
