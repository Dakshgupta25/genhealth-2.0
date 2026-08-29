import json
import uuid
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path as FPath, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.family_relationship import FamilyRelationship
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.user import User

router = APIRouter(prefix="/api/v1/clinical", tags=["Doctor Portal & Clinical"])

_DISEASE_MAPPING_PATH = Path(__file__).parent.parent / "data" / "disease_mapping.json"


class DiseaseMappingItem(BaseModel):
    id: str
    name: str
    category: str
    description: str
    primary_tests: List[str]


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


@router.get(
    "/diseases",
    response_model=List[DiseaseMappingItem],
    summary="Get all clinical disease panels and mapped lab tests",
)
def get_disease_mappings() -> List[DiseaseMappingItem]:
    # Reasoning:
    # Loads the structured clinical disease-to-test mapping registry.
    # Enables doctors to quickly select a clinical pathology and inspect the specific
    # canonical diagnostic biomarkers required for clinical evaluation.
    if not _DISEASE_MAPPING_PATH.exists():
        return []
    with open(_DISEASE_MAPPING_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)
    return [DiseaseMappingItem(**item) for item in data]


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
    # Reasoning:
    # Queries the patient's family tree to discover all linked relatives (User IDs),
    # then retrieves their historical measurements for the selected biomarker across all generations.
    # Surfaces familial risk factors and hereditary tendencies directly to the physician.
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
    # Reasoning:
    # Cross-references the disease test registry against the patient's longitudinal report history
    # and returns the most recent measurement for every biomarker pertinent to that disease condition,
    # excluding same-date duplicates.
    if not _DISEASE_MAPPING_PATH.exists():
        raise HTTPException(status_code=500, detail="Disease mapping data missing.")
    
    with open(_DISEASE_MAPPING_PATH, "r", encoding="utf-8") as f:
        diseases = json.load(f)
    
    disease = next((d for d in diseases if d["id"] == disease_id), None)
    if not disease:
        raise HTTPException(status_code=404, detail="Disease not found.")

    target_tests = disease.get("primary_tests", [])
    summaries: list[PatientBiomarkerSummary] = []

    for test_name in target_tests:
        stmt = (
            select(ReportResult, Report.created_at, Report.id.label("report_id"))
            .join(Report, ReportResult.report_id == Report.id)
            .where(Report.user_id == user_id)
            .where(ReportResult.canonical_test_name == test_name)
            .where(ReportResult.is_duplicate_same_date == False)
            .order_by(Report.created_at.desc())
            .limit(1)
        )
        row = db.execute(stmt).first()
        if row:
            rr, created_at, rep_id = row
            summaries.append(
                PatientBiomarkerSummary(
                    canonical_test_name=test_name,
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
    """
    Validates that relative_id is linked to user_id, verifies clinical data sharing consent
    (or managed placeholder status), and queries that relative's latest disease biomarker measurements.
    """
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

    # Privacy check: If not a managed placeholder and sharing consent is disabled, block access
    if not (relative_user.is_placeholder and relative_user.managed_by_user_id == user_id):
        if not rel.share_clinical_data:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Clinical data sharing is disabled by this relative.",
            )

    return get_patient_disease_summary(user_id=relative_id, disease_id=disease_id, db=db)

