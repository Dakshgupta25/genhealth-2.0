import json
import uuid
from datetime import date
from pathlib import Path
from typing import List, Optional, Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Path as FPath, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.family_relationship import FamilyRelationship
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.user import User
from app.models.medical_history import MedicalHistoryRecord

from app.services.clinical_service import (
    get_all_disease_registry_items,
    get_patient_recent_disease_measurements,
    get_patient_disease_timeline,
    get_family_disease_overview,
    resolve_disease_key,
)

router = APIRouter(prefix="/api/v1/clinical", tags=["Doctor Portal & Clinical"])

_DISEASE_MAPPING_PATH = Path(__file__).parent.parent / "data" / "disease_mapping.json"


# --- Schemas ---

class BiomarkerDetailItem(BaseModel):
    key: str
    display_name: str
    standard_unit: str
    category: str
    description: str


class DiseaseMappingItem(BaseModel):
    id: str
    disease_key: Optional[str] = None
    name: str
    category: str
    description: str
    heritability_estimate: Optional[float] = 0.5
    heritability_range_text: Optional[str] = ""
    clinical_guideline: Optional[str] = ""
    citation: Optional[str] = ""
    primary_biomarkers: List[str] = []
    primary_biomarkers_detail: List[BiomarkerDetailItem] = []
    primary_tests: List[str] = []


class FamilyBiomarkerPoint(BaseModel):
    relative_id: uuid.UUID
    relative_name: str
    relationship_type: str
    canonical_test_name: str
    value: str
    numeric_value: Optional[float]
    unit: Optional[str]
    reference_range: Optional[str]
    abnormality_flag: str
    report_date: str


class PatientBiomarkerSummary(BaseModel):
    canonical_test_name: str
    latest_value: str
    numeric_value: Optional[float]
    unit: Optional[str]
    reference_range: Optional[str]
    abnormality_flag: str
    report_date: str
    report_id: uuid.UUID


class MedicalHistoryCreateRequest(BaseModel):
    disease_key: str
    diagnosis_date: date
    record_type: str = "confirmed_diagnosis"  # 'confirmed_diagnosis', 'self_reported', 'clinical_note'
    status: str = "active"  # 'active', 'managed', 'in_remission', 'resolved'
    notes: Optional[str] = None


class MedicalHistoryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    disease_key: str
    diagnosis_date: date
    record_type: str
    status: str
    notes: Optional[str]
    created_at: str

    model_config = ConfigDict(from_attributes=True)


class ReportMeasurementItem(BaseModel):
    id: str
    report_id: str
    report_date: Optional[str]
    filename: Optional[str]
    canonical_key: str
    canonical_test_name: str
    raw_test_name: Optional[str]
    value: str
    numeric_value: Optional[float]
    unit: Optional[str]
    reference_range: Optional[str]
    abnormality_flag: str
    severity_status: str


class ReportGroupItem(BaseModel):
    report_id: str
    report_date: Optional[str]
    filename: Optional[str]
    measurements_count: int
    measurements: List[ReportMeasurementItem]


class RecentDiseaseMeasurementsResponse(BaseModel):
    disease_key: str
    disease_name: Optional[str] = None
    user_id: str
    total_reports_evaluated: int
    reports: List[ReportGroupItem]
    biomarker_summaries: List[ReportMeasurementItem]


class TimelineEventItem(BaseModel):
    id: str
    event_type: str  # 'confirmed_diagnosis', 'self_reported', 'inferred_episode'
    is_inferred: bool
    title: str
    date: Optional[str]
    status: str
    severity: str  # 'critical', 'warning', 'normal'
    notes: Optional[str]
    source_label: str
    report_id: Optional[str] = None
    triggers: Optional[List[Dict[str, Any]]] = None
    created_at: Optional[str] = None


class FamilyRelativeOverviewItem(BaseModel):
    relative_id: str
    relative_name: str
    relationship_type: str
    is_placeholder: bool
    is_managed_placeholder: bool
    is_genetic: bool
    kinship_weight: float
    share_clinical_data: bool
    consent_restricted: bool
    restriction_reason: Optional[str] = None
    recent_reports: List[ReportGroupItem] = []
    biomarker_summaries: List[ReportMeasurementItem] = []
    timeline: List[TimelineEventItem] = []


# --- Endpoints ---

@router.get(
    "/diseases",
    response_model=List[DiseaseMappingItem],
    summary="Get all clinical disease panels mapped from unified DISEASE_REGISTRY",
)
def get_disease_mappings() -> List[DiseaseMappingItem]:
    """
    Returns disease metadata, heritability parameters, and mapped primary biomarkers
    sourced from the single unified DISEASE_REGISTRY.
    """
    items = get_all_disease_registry_items()
    return [DiseaseMappingItem(**item) for item in items]


@router.get(
    "/patient/{user_id}/disease/{disease_key}/recent-measurements",
    response_model=RecentDiseaseMeasurementsResponse,
    summary="Get up to 5 most recent reports filtered to disease-relevant biomarkers",
)
def get_recent_disease_measurements(
    user_id: uuid.UUID = FPath(...),
    disease_key: str = FPath(...),
    db: Session = Depends(get_db),
) -> RecentDiseaseMeasurementsResponse:
    """
    Queries the patient's 5 most recent reports, filtering report results
    strictly to biomarkers that diagnose or monitor the specified disease.
    """
    data = get_patient_recent_disease_measurements(db=db, user_id=user_id, disease_key=disease_key, limit_reports=5)
    return RecentDiseaseMeasurementsResponse(**data)


@router.get(
    "/patient/{user_id}/disease/{disease_key}/timeline",
    response_model=List[TimelineEventItem],
    summary="Get hybrid disease timeline (confirmed diagnoses + inferred lab episodes)",
)
def get_disease_timeline(
    user_id: uuid.UUID = FPath(...),
    disease_key: str = FPath(...),
    db: Session = Depends(get_db),
) -> List[TimelineEventItem]:
    """
    Returns a unified, reverse-chronological timeline of disease events:
    - Confirmed diagnoses from medical history records.
    - Dynamically inferred episodes from historical lab reports crossing critical thresholds.
    """
    events = get_patient_disease_timeline(db=db, user_id=user_id, disease_key=disease_key)
    return [TimelineEventItem(**e) for e in events]


@router.post(
    "/patient/{user_id}/medical-history",
    response_model=MedicalHistoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a confirmed diagnosis or clinical disease history record",
)
def create_medical_history_record(
    user_id: uuid.UUID = FPath(...),
    payload: MedicalHistoryCreateRequest = ...,
    db: Session = Depends(get_db),
) -> MedicalHistoryResponse:
    """
    Creates a new medical history record (e.g. physician-confirmed diagnosis or self-reported condition).
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    resolved_key = resolve_disease_key(payload.disease_key)

    record = MedicalHistoryRecord(
        user_id=user_id,
        disease_key=resolved_key,
        diagnosis_date=payload.diagnosis_date,
        record_type=payload.record_type,
        status=payload.status,
        notes=payload.notes,
        created_by_user_id=user_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return MedicalHistoryResponse(
        id=record.id,
        user_id=record.user_id,
        disease_key=record.disease_key,
        diagnosis_date=record.diagnosis_date,
        record_type=record.record_type,
        status=record.status,
        notes=record.notes,
        created_at=record.created_at.isoformat(),
    )


@router.delete(
    "/patient/{user_id}/medical-history/{record_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a medical history record",
)
def delete_medical_history_record(
    user_id: uuid.UUID = FPath(...),
    record_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Deletes a medical history record belonging to the specified user.
    """
    record = db.get(MedicalHistoryRecord, record_id)
    if not record or record.user_id != user_id:
        raise HTTPException(status_code=404, detail="Medical history record not found.")

    db.delete(record)
    db.commit()
    return {"status": "success", "deleted_id": str(record_id)}


@router.get(
    "/patient/{user_id}/disease/{disease_key}/family-overview",
    response_model=List[FamilyRelativeOverviewItem],
    summary="Get disease measurements and timelines for all linked family members",
)
def get_family_overview(
    user_id: uuid.UUID = FPath(...),
    disease_key: str = FPath(...),
    db: Session = Depends(get_db),
) -> List[FamilyRelativeOverviewItem]:
    """
    Queries all linked family relatives for the patient, enforcing data sharing consent.
    For consenting relatives, returns their recent measurements (5 reports) and disease history timeline.
    """
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Patient not found.")

    overview = get_family_disease_overview(db=db, patient_id=user_id, disease_key=disease_key, limit_reports=5)
    return [FamilyRelativeOverviewItem(**item) for item in overview]


# --- Backwards Compatibility Endpoints ---

@router.get(
    "/patient/{user_id}/family-history/{canonical_test_name}",
    response_model=List[FamilyBiomarkerPoint],
    summary="Get cross-family historical values for a specific test",
)
def get_family_test_history(
    user_id: uuid.UUID = FPath(...),
    canonical_test_name: str = FPath(...),
    db: Session = Depends(get_db),
) -> List[FamilyBiomarkerPoint]:
    stmt = (
        select(
            FamilyRelationship.relationship_type,
            User.id.label("relative_id"),
            User.full_name.label("relative_name"),
            ReportResult,
            Report.created_at.label("report_date"),
        )
        .join(User, FamilyRelationship.relative_user_id == User.id)
        .join(Report, Report.user_id == User.id)
        .join(ReportResult, ReportResult.report_id == Report.id)
        .where(FamilyRelationship.user_id == user_id)
        .where(FamilyRelationship.share_clinical_data == True)
        .where(ReportResult.canonical_test_name == canonical_test_name)
        .where(ReportResult.is_duplicate_same_date == False)
        .order_by(Report.created_at.desc())
    )
    rows = db.execute(stmt).all()

    return [
        FamilyBiomarkerPoint(
            relative_id=r.relative_id,
            relative_name=r.relative_name,
            relationship_type=r.relationship_type,
            canonical_test_name=r.ReportResult.canonical_test_name or canonical_test_name,
            value=r.ReportResult.value,
            numeric_value=r.ReportResult.numeric_value,
            unit=r.ReportResult.unit,
            reference_range=r.ReportResult.reference_range,
            abnormality_flag=r.ReportResult.abnormality_flag,
            report_date=r.report_date.isoformat(),
        )
        for r in rows
    ]


@router.get(
    "/patient/{user_id}/disease/{disease_id}/summary",
    response_model=List[PatientBiomarkerSummary],
    summary="Get latest values of disease-relevant tests for a patient",
)
def get_patient_disease_summary(
    user_id: uuid.UUID = FPath(...),
    disease_id: str = FPath(...),
    db: Session = Depends(get_db),
) -> List[PatientBiomarkerSummary]:
    resolved_key = resolve_disease_key(disease_id)
    if resolved_key in DISEASE_REGISTRY:
        meta = DISEASE_REGISTRY[resolved_key]
        target_tests = meta.get("primary_biomarkers", [])
    elif _DISEASE_MAPPING_PATH.exists():
        with open(_DISEASE_MAPPING_PATH, "r", encoding="utf-8") as f:
            diseases = json.load(f)
        disease = next((d for d in diseases if d["id"] == disease_id), None)
        target_tests = disease.get("primary_tests", []) if disease else []
    else:
        target_tests = []

    summaries: list[PatientBiomarkerSummary] = []

    for test_key in target_tests:
        b_meta = CANONICAL_BIOMARKERS.get(test_key, {})
        display_name = b_meta.get("display_name", test_key)

        # Search matching either key or display_name
        stmt = (
            select(ReportResult, Report.created_at, Report.id.label("report_id"))
            .join(Report, ReportResult.report_id == Report.id)
            .where(Report.user_id == user_id)
            .where(
                (ReportResult.canonical_test_name == test_key)
                | (ReportResult.canonical_test_name == display_name)
                | (ReportResult.raw_test_name == test_key)
            )
            .where(ReportResult.is_duplicate_same_date == False)
            .order_by(Report.created_at.desc())
            .limit(1)
        )
        row = db.execute(stmt).first()
        if row:
            rr, created_at, rep_id = row
            summaries.append(
                PatientBiomarkerSummary(
                    canonical_test_name=display_name,
                    latest_value=rr.value,
                    numeric_value=rr.numeric_value,
                    unit=rr.unit,
                    reference_range=rr.reference_range,
                    abnormality_flag=rr.abnormality_flag,
                    report_date=created_at.isoformat(),
                    report_id=rep_id,
                )
            )

    return summaries


@router.get(
    "/patient/{user_id}/relative/{relative_id}/disease/{disease_id}/summary",
    response_model=List[PatientBiomarkerSummary],
    summary="Get latest values of disease-relevant tests for a linked relative",
)
def get_relative_disease_summary(
    user_id: uuid.UUID = FPath(...),
    relative_id: uuid.UUID = FPath(...),
    disease_id: str = FPath(...),
    db: Session = Depends(get_db),
) -> List[PatientBiomarkerSummary]:
    rel = db.execute(
        select(FamilyRelationship).where(
            FamilyRelationship.user_id == user_id,
            FamilyRelationship.relative_user_id == relative_id,
        )
    ).scalar_one_or_none()

    relative_user = db.get(User, relative_id)
    if not relative_user:
        raise HTTPException(status_code=404, detail="Relative profile not found.")

    if not rel:
        raise HTTPException(status_code=403, detail="Relative is not linked to this patient's pedigree.")

    if not (relative_user.is_placeholder and relative_user.managed_by_user_id == user_id):
        if not rel.share_clinical_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clinical data sharing is disabled by this relative.",
            )

    return get_patient_disease_summary(user_id=relative_id, disease_id=disease_id, db=db)
