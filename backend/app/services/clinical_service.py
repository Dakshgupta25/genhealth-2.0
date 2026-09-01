"""
Clinical Workstation Service: Disease Pathology Queries, Longitudinal Measurements,
Inferred Episode Detection, and Pedigree Overview.
"""

import uuid
from typing import Dict, List, Optional, Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.family_relationship import FamilyRelationship
from app.models.medical_history import MedicalHistoryRecord

from hereditary_risk.app.config.diseases import DISEASE_REGISTRY, get_disease_metadata
from hereditary_risk.app.config.biomarkers import CANONICAL_BIOMARKERS
from hereditary_risk.app.config.kinship import get_kinship_weight, is_genetic_relationship
from hereditary_risk.app.normalization.aliasing import normalize_biomarker_input
from hereditary_risk.app.rules.clinical_rule_engine import evaluate_biomarker_rule

# Mapping of legacy / short disease keys to canonical registry keys
DISEASE_KEY_ALIASES = {
    "diabetes": "type_2_diabetes",
    "type_2_diabetes": "type_2_diabetes",
    "cardiovascular": "dyslipidemia",
    "dyslipidemia": "dyslipidemia",
    "hypothyroidism": "hypothyroidism",
    "thyroid": "hypothyroidism",
    "ckd": "ckd",
    "renal": "ckd",
    "anemia": "anemia",
    "liver_disease": "liver_disease",
    "hepatic": "liver_disease",
}


def resolve_disease_key(raw_key: str) -> str:
    """Normalize input disease key to standard DISEASE_REGISTRY key."""
    clean = (raw_key or "").strip().lower()
    return DISEASE_KEY_ALIASES.get(clean, clean)


def get_all_disease_registry_items() -> List[Dict[str, Any]]:
    """
    Retrieve all clinical disease definitions from the unified DISEASE_REGISTRY.
    Enriches with canonical biomarker display details.
    """
    items = []
    for key, meta in DISEASE_REGISTRY.items():
        primary_details = []
        for b_key in meta.get("primary_biomarkers", []):
            b_meta = CANONICAL_BIOMARKERS.get(b_key, {})
            primary_details.append({
                "key": b_key,
                "display_name": b_meta.get("display_name", b_key),
                "standard_unit": b_meta.get("standard_unit", ""),
                "category": b_meta.get("category", ""),
                "description": b_meta.get("description", ""),
            })

        items.append({
            "id": key,
            "disease_key": key,
            "name": meta["display_name"],
            "category": meta["category"],
            "description": meta["description"],
            "heritability_estimate": meta.get("heritability_estimate", 0.5),
            "heritability_range_text": meta.get("heritability_range_text", ""),
            "clinical_guideline": meta.get("clinical_guideline", ""),
            "citation": meta.get("citation", ""),
            "primary_biomarkers": meta.get("primary_biomarkers", []),
            "primary_biomarkers_detail": primary_details,
            # Backwards compatibility fields for UI
            "primary_tests": [d["display_name"] for d in primary_details],
        })
    return items


def get_patient_recent_disease_measurements(
    db: Session,
    user_id: uuid.UUID,
    disease_key: str,
    limit_reports: int = 5,
) -> Dict[str, Any]:
    """
    Retrieve measurements from the patient's most recent lab reports (up to limit_reports),
    filtered exclusively to biomarkers relevant to the specified disease condition.
    """
    resolved_key = resolve_disease_key(disease_key)
    if resolved_key not in DISEASE_REGISTRY:
        return {
            "disease_key": disease_key,
            "user_id": str(user_id),
            "total_reports_evaluated": 0,
            "reports": [],
            "biomarker_summaries": [],
        }

    meta = DISEASE_REGISTRY[resolved_key]
    target_biomarkers = set(meta.get("primary_biomarkers", []))

    # 1. Fetch up to `limit_reports` most recent reports for this user
    recent_reports_stmt = (
        select(Report)
        .where(Report.user_id == user_id)
        .order_by(Report.created_at.desc())
        .limit(limit_reports)
    )
    recent_reports = db.execute(recent_reports_stmt).scalars().all()

    if not recent_reports:
        return {
            "disease_key": resolved_key,
            "disease_name": meta["display_name"],
            "user_id": str(user_id),
            "total_reports_evaluated": 0,
            "reports": [],
            "biomarker_summaries": [],
        }

    report_ids = [r.id for r in recent_reports]
    report_date_map = {r.id: r.created_at for r in recent_reports}
    report_file_map = {r.id: r.original_filename for r in recent_reports}

    # 2. Fetch all non-duplicate ReportResults for these reports
    results_stmt = (
        select(ReportResult)
        .where(ReportResult.report_id.in_(report_ids))
        .where(ReportResult.is_duplicate_same_date == False)
        .order_by(ReportResult.extracted_at.desc())
    )
    all_results = db.execute(results_stmt).scalars().all()

    # 3. Filter and normalize measurements relevant to target biomarkers
    reports_map: Dict[uuid.UUID, List[Dict[str, Any]]] = {r.id: [] for r in recent_reports}
    latest_per_biomarker: Dict[str, Dict[str, Any]] = {}

    for rr in all_results:
        test_str = rr.canonical_test_name or rr.raw_test_name or ""
        numeric_val = rr.numeric_value
        if numeric_val is None and rr.value:
            try:
                numeric_val = float(rr.value.strip())
            except ValueError:
                numeric_val = None

        norm = normalize_biomarker_input(test_str, numeric_val, rr.unit)
        canonical_key = norm.get("canonical_key")

        if canonical_key in target_biomarkers:
            b_meta = CANONICAL_BIOMARKERS.get(canonical_key, {})
            ev = evaluate_biomarker_rule(canonical_key, numeric_val)
            rep_date = report_date_map.get(rr.report_id)

            item = {
                "id": str(rr.id),
                "report_id": str(rr.report_id),
                "report_date": rep_date.isoformat() if rep_date else None,
                "filename": report_file_map.get(rr.report_id, ""),
                "canonical_key": canonical_key,
                "canonical_test_name": b_meta.get("display_name", test_str),
                "raw_test_name": rr.raw_test_name,
                "value": rr.value,
                "numeric_value": numeric_val,
                "unit": rr.unit or b_meta.get("standard_unit", ""),
                "reference_range": rr.reference_range,
                "abnormality_flag": rr.abnormality_flag or ev["status"].lower(),
                "severity_status": ev["status"],
            }

            reports_map[rr.report_id].append(item)

            if canonical_key not in latest_per_biomarker:
                latest_per_biomarker[canonical_key] = item

    # Format structured report groups
    report_groups = []
    for r in recent_reports:
        measurements = reports_map.get(r.id, [])
        if measurements:  # Only include reports containing relevant tests
            report_groups.append({
                "report_id": str(r.id),
                "report_date": r.created_at.isoformat() if r.created_at else None,
                "filename": r.original_filename,
                "measurements_count": len(measurements),
                "measurements": measurements,
            })

    return {
        "disease_key": resolved_key,
        "disease_name": meta["display_name"],
        "user_id": str(user_id),
        "total_reports_evaluated": len(recent_reports),
        "reports": report_groups,
        "biomarker_summaries": list(latest_per_biomarker.values()),
    }


def get_patient_disease_timeline(
    db: Session,
    user_id: uuid.UUID,
    disease_key: str,
) -> List[Dict[str, Any]]:
    """
    Retrieve unified disease history timeline combining:
    1. Confirmed / Self-Reported Medical History Records from MedicalHistoryRecord table.
    2. Dynamically Inferred Lab Episodes where historical reports crossed critical or warning thresholds.
    """
    resolved_key = resolve_disease_key(disease_key)
    if resolved_key not in DISEASE_REGISTRY:
        return []

    meta = DISEASE_REGISTRY[resolved_key]
    target_biomarkers = set(meta.get("primary_biomarkers", []))

    timeline_events: List[Dict[str, Any]] = []

    # 1. Fetch explicit MedicalHistoryRecord rows
    stmt = (
        select(MedicalHistoryRecord)
        .where(
            MedicalHistoryRecord.user_id == user_id,
            MedicalHistoryRecord.disease_key == resolved_key,
        )
        .order_by(MedicalHistoryRecord.diagnosis_date.desc())
    )
    records = db.execute(stmt).scalars().all()

    for rec in records:
        timeline_events.append({
            "id": str(rec.id),
            "event_type": "confirmed_diagnosis" if rec.record_type == "confirmed_diagnosis" else "self_reported",
            "is_inferred": False,
            "title": f"{meta['display_name']} ({rec.record_type.replace('_', ' ').title()})",
            "date": rec.diagnosis_date.isoformat(),
            "status": rec.status,
            "severity": "critical" if rec.status == "active" else "normal",
            "notes": rec.notes or "",
            "source_label": "Official Medical Record" if rec.record_type == "confirmed_diagnosis" else "Self-Reported Diagnosis",
            "created_at": rec.created_at.isoformat() if rec.created_at else None,
        })

    # 2. Fetch all historical lab reports and infer episodes
    historical_stmt = (
        select(Report.id, Report.created_at, ReportResult)
        .join(ReportResult, ReportResult.report_id == Report.id)
        .where(Report.user_id == user_id)
        .where(ReportResult.is_duplicate_same_date == False)
        .order_by(Report.created_at.desc())
    )
    historical_rows = db.execute(historical_stmt).all()

    # Group by report_id to avoid multiple episode cards for same report date
    report_spikes: Dict[uuid.UUID, Dict[str, Any]] = {}

    for rep_id, created_at, rr in historical_rows:
        test_str = rr.canonical_test_name or rr.raw_test_name or ""
        numeric_val = rr.numeric_value
        if numeric_val is None and rr.value:
            try:
                numeric_val = float(rr.value.strip())
            except ValueError:
                numeric_val = None

        norm = normalize_biomarker_input(test_str, numeric_val, rr.unit)
        canonical_key = norm.get("canonical_key")

        if canonical_key in target_biomarkers and numeric_val is not None:
            ev = evaluate_biomarker_rule(canonical_key, numeric_val)
            status = ev.get("status")

            if status in ("CRITICAL", "CRITICAL_LOW", "WARNING", "WARNING_LOW"):
                b_meta = CANONICAL_BIOMARKERS.get(canonical_key, {})
                display_test = b_meta.get("display_name", canonical_key)
                unit_str = rr.unit or b_meta.get("standard_unit", "")

                severity = "critical" if "CRITICAL" in status else "warning"

                if rep_id not in report_spikes:
                    report_spikes[rep_id] = {
                        "id": f"inferred-{rep_id}",
                        "event_type": "inferred_episode",
                        "is_inferred": True,
                        "title": f"Abnormal Lab Episode ({meta['display_name']} Biomarkers)",
                        "date": created_at.date().isoformat() if created_at else None,
                        "status": status.lower(),
                        "severity": severity,
                        "highest_severity_rank": 2 if severity == "critical" else 1,
                        "report_id": str(rep_id),
                        "source_label": "Inferred from Lab Values",
                        "triggers": [],
                    }

                report_spikes[rep_id]["triggers"].append({
                    "biomarker_key": canonical_key,
                    "biomarker_name": display_test,
                    "observed_value": f"{numeric_val} {unit_str}",
                    "reference_range": rr.reference_range,
                    "status": status,
                    "threshold_crossed": ev.get("threshold_crossed"),
                })

                if severity == "critical":
                    report_spikes[rep_id]["severity"] = "critical"
                    report_spikes[rep_id]["highest_severity_rank"] = 2

    for spike in report_spikes.values():
        triggers_summary = ", ".join([f"{t['biomarker_name']} ({t['observed_value']})" for t in spike["triggers"]])
        spike["notes"] = f"Abnormal lab threshold flagged: {triggers_summary}"
        timeline_events.append(spike)

    # Sort reverse-chronological by date
    timeline_events.sort(key=lambda e: e.get("date") or "", reverse=True)
    return timeline_events


def get_family_disease_overview(
    db: Session,
    patient_id: uuid.UUID,
    disease_key: str,
    limit_reports: int = 5,
) -> List[Dict[str, Any]]:
    """
    Retrieve comparative disease overview for all linked family members,
    enforcing clinical data sharing consent and managed placeholder rules.
    """
    resolved_key = resolve_disease_key(disease_key)

    # Query all linked family members
    stmt = (
        select(FamilyRelationship, User)
        .join(User, FamilyRelationship.relative_user_id == User.id)
        .where(FamilyRelationship.user_id == patient_id)
        .order_by(FamilyRelationship.created_at.asc())
    )
    rel_rows = db.execute(stmt).all()

    relatives_overview: List[Dict[str, Any]] = []

    for rel, rel_user in rel_rows:
        is_managed = rel_user.is_placeholder and rel_user.managed_by_user_id == patient_id
        is_consented = is_managed or rel.share_clinical_data

        rel_type = rel.relationship_type or "relative"
        weight = get_kinship_weight(rel_type)
        is_genetic = is_genetic_relationship(rel_type)

        rel_entry = {
            "relative_id": str(rel_user.id),
            "relative_name": rel_user.full_name,
            "relationship_type": rel_type,
            "is_placeholder": rel_user.is_placeholder,
            "is_managed_placeholder": is_managed,
            "is_genetic": is_genetic,
            "kinship_weight": weight,
            "share_clinical_data": rel.share_clinical_data,
            "consent_restricted": not is_consented,
            "restriction_reason": None if is_consented else "Clinical data sharing has been restricted by this relative.",
            "recent_reports": [],
            "biomarker_summaries": [],
            "timeline": [],
        }

        if is_consented:
            # Query recent measurements & timeline for this relative
            meas_data = get_patient_recent_disease_measurements(
                db=db,
                user_id=rel_user.id,
                disease_key=resolved_key,
                limit_reports=limit_reports,
            )
            rel_entry["recent_reports"] = meas_data.get("reports", [])
            rel_entry["biomarker_summaries"] = meas_data.get("biomarker_summaries", [])
            rel_entry["timeline"] = get_patient_disease_timeline(
                db=db,
                user_id=rel_user.id,
                disease_key=resolved_key,
            )

        relatives_overview.append(rel_entry)

    return relatives_overview
