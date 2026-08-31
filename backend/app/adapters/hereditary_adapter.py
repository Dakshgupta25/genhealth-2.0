"""
Integration Adapter: GenHealth Host Application → Standalone Hereditary Risk Engine.

Translates existing GenHealth database records (Users, Reports, ReportResults, FamilyRelationships)
into the canonical input schemas expected by the frozen standalone Hereditary Risk Engine.

Design Principles:
- Does NOT duplicate the database or create parallel family tree sources of truth.
- Respects clinical data sharing consent (share_clinical_data) & managed placeholder profiles.
- Preserves raw biomarker provenance while calling Layer 1 aliasing normalizer.
- Maps GenHealth genealogical relationship strings to kinship-compatible types.
- Invokes frozen Layer 1-4 predictive pipeline without modifying engine internals.
"""

import uuid
from typing import Dict, List, Optional, Any
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.family_relationship import FamilyRelationship

from hereditary_risk.app.schemas.input import HereditaryRiskAssessmentRequest, FamilyMemberRequest
from hereditary_risk.app.schemas.output import HereditaryRiskAssessmentResponse
from hereditary_risk.app.normalization.aliasing import normalize_biomarker_input
from hereditary_risk.app.api.routes import predict_hereditary_risk


KINSHIP_RELATIONSHIP_MAP: Dict[str, str] = {
    # Parents
    "father": "father",
    "dad": "father",
    "mother": "mother",
    "mom": "mother",
    "parent": "father",  # Generic fallback
    # Siblings
    "brother": "brother",
    "sister": "sister",
    "sibling": "brother",  # Generic fallback
    # Children
    "son": "son",
    "daughter": "daughter",
    "child": "son",  # Generic fallback
    # Grandparents
    "grandfather": "grandfather",
    "grandpa": "grandfather",
    "grandmother": "grandmother",
    "grandma": "grandmother",
    "grandparent": "grandfather",
    # Extended
    "uncle": "uncle",
    "aunt": "aunt",
    "cousin": "cousin",
    # Spouse / Non-genetic
    "spouse": "spouse",
    "husband": "spouse",
    "wife": "spouse",
    "partner": "spouse",
}


def map_to_kinship_relationship(raw_rel: Optional[str]) -> str:
    """Map host application relationship string to kinship engine supported type."""
    if not raw_rel:
        return "unsupported"
    clean_rel = raw_rel.strip().lower()
    return KINSHIP_RELATIONSHIP_MAP.get(clean_rel, "unsupported")


def extract_patient_biomarkers(db: Session, user_id: uuid.UUID) -> Dict[str, Optional[float]]:
    """
    Query most recent non-duplicate lab test measurements for target patient.
    Converts lab results into canonical biomarker key-value pairs via Layer 1 normalizer.
    """
    stmt = (
        select(ReportResult, Report.created_at)
        .join(Report, ReportResult.report_id == Report.id)
        .where(Report.user_id == user_id)
        .where(ReportResult.is_duplicate_same_date == False)
        .order_by(Report.created_at.desc())
    )
    rows = db.execute(stmt).all()

    canonical_biomarkers: Dict[str, Optional[float]] = {}

    for row in rows:
        rr: ReportResult = row[0]
        test_name = rr.canonical_test_name or rr.raw_test_name
        if not test_name:
            continue

        numeric_val = rr.numeric_value
        if numeric_val is None and rr.value:
            try:
                numeric_val = float(rr.value.strip())
            except ValueError:
                numeric_val = None

        norm = normalize_biomarker_input(test_name, numeric_val, rr.unit)
        if norm["status"] == "matched" and norm["canonical_key"] is not None:
            c_key = norm["canonical_key"]
            if c_key not in canonical_biomarkers:
                canonical_biomarkers[c_key] = norm["numeric_value"]

    return canonical_biomarkers


def extract_family_members_data(db: Session, user_id: uuid.UUID) -> List[FamilyMemberRequest]:
    """
    Query linked family members, enforcing clinical data sharing consent and managed placeholder access.
    Maps relationship types and extracts relative lab test measurements via a single batch query (no N+1).
    """
    stmt = (
        select(FamilyRelationship, User)
        .join(User, FamilyRelationship.relative_user_id == User.id)
        .where(FamilyRelationship.user_id == user_id)
    )
    results = db.execute(stmt).all()

    eligible: List[Tuple[FamilyRelationship, User]] = []
    relative_ids: List[uuid.UUID] = []

    for rel, relative_user in results:
        # Consent Authorization Check:
        # Allow access if relative is a managed placeholder profile OR share_clinical_data is True
        is_managed = relative_user.is_placeholder and relative_user.managed_by_user_id == user_id
        if not is_managed and not rel.share_clinical_data:
            continue
        eligible.append((rel, relative_user))
        relative_ids.append(relative_user.id)

    if not relative_ids:
        return []

    # Single batch query for all relative lab test measurements
    batch_stmt = (
        select(Report.user_id, ReportResult, Report.created_at)
        .join(Report, ReportResult.report_id == Report.id)
        .where(Report.user_id.in_(relative_ids))
        .where(ReportResult.is_duplicate_same_date == False)
        .order_by(Report.created_at.desc())
    )
    batch_rows = db.execute(batch_stmt).all()

    # Map user_id to canonical biomarkers
    relative_biomarkers_map: Dict[uuid.UUID, Dict[str, Optional[float]]] = {rid: {} for rid in relative_ids}

    for u_id, rr, _created_at in batch_rows:
        test_name = rr.canonical_test_name or rr.raw_test_name
        if not test_name:
            continue

        numeric_val = rr.numeric_value
        if numeric_val is None and rr.value:
            try:
                numeric_val = float(rr.value.strip())
            except ValueError:
                numeric_val = None

        norm = normalize_biomarker_input(test_name, numeric_val, rr.unit)
        if norm["status"] == "matched" and norm["canonical_key"] is not None:
            c_key = norm["canonical_key"]
            if c_key not in relative_biomarkers_map[u_id]:
                relative_biomarkers_map[u_id][c_key] = norm["numeric_value"]

    family_inputs: List[FamilyMemberRequest] = []
    for rel, relative_user in eligible:
        mapped_rel = map_to_kinship_relationship(rel.relationship_type)
        r_biomarkers = relative_biomarkers_map.get(relative_user.id, {})

        family_inputs.append(
            FamilyMemberRequest(
                member_id=str(relative_user.id),
                relationship=mapped_rel,
                biomarkers=r_biomarkers,
            )
        )

    return family_inputs


def evaluate_patient_hereditary_risk_adapter(
    db: Session,
    patient_id: uuid.UUID,
    disease_keys: Optional[List[str]] = None,
    enable_llm_narrative: bool = True,
) -> HereditaryRiskAssessmentResponse:
    """
    Main Integration Adapter Entrypoint.
    Retrieves authenticated patient profile, lab results, and family tree from host DB,
    constructs HereditaryRiskAssessmentRequest, and executes frozen standalone engine.
    """
    patient = db.get(User, patient_id)
    if not patient:
        raise ValueError(f"Patient with ID '{patient_id}' not found in host database.")

    self_biomarkers = extract_patient_biomarkers(db, patient_id)
    family_members = extract_family_members_data(db, patient_id)

    request_payload = HereditaryRiskAssessmentRequest(
        user_id=str(patient_id),
        patient_name=patient.full_name,
        self_biomarkers=self_biomarkers,
        family_members=family_members,
        disease_keys=disease_keys,
        enable_llm_narrative=enable_llm_narrative,
    )

    # Invoke frozen engine API route handler
    response = predict_hereditary_risk(request_payload)
    return response
