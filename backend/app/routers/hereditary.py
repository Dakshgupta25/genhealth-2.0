"""
FastAPI Host Application Router for Integrated Hereditary Risk Subsystem.

Exposes REST API endpoints for authenticating patients, fetching DB lab/pedigree records,
and executing the frozen Hereditary Risk Engine via adapter.

Routes:
- GET /api/v1/hereditary-risk/diseases: Metadata for supported hereditary risk disease categories.
- GET /api/v1/hereditary-risk/patient/{user_id}/assessment: Compute risk for target patient.
- POST /api/v1/hereditary-risk/patient/{user_id}/assessment: Compute risk with custom options.
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path as FPath, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user, authorize_patient_access
from app.adapters.hereditary_adapter import evaluate_patient_hereditary_risk_adapter
from hereditary_risk.app.schemas.output import HereditaryRiskAssessmentResponse
from hereditary_risk.app.config.diseases import DISEASE_REGISTRY, get_disease_metadata

router = APIRouter(prefix="/api/v1/hereditary-risk", tags=["Hereditary Risk Engine"])


@router.get(
    "/diseases",
    summary="Get registry of supported hereditary disease categories",
    description="Returns metadata, diagnostic guidelines, and heritability references for all supported diseases.",
)
def get_hereditary_disease_registry():
    """Returns list of supported hereditary disease categories and metadata."""
    return [
        {
            "disease_key": k,
            "display_name": meta["display_name"],
            "category": meta["category"],
            "description": meta["description"],
            "heritability_estimate": meta.get("heritability_estimate"),
            "clinical_guideline": meta.get("clinical_guideline"),
            "required_biomarkers": meta.get("required_biomarkers", []),
        }
        for k, meta in DISEASE_REGISTRY.items()
    ]


@router.get(
    "/patient/{user_id}/assessment",
    response_model=HereditaryRiskAssessmentResponse,
    summary="Compute hereditary disease risk assessment for patient using DB records",
    description="Fetches authenticated patient lab test results and consent-approved family history, running the 4-layer hereditary risk engine.",
)
def get_patient_hereditary_assessment(
    user_id: uuid.UUID = FPath(..., description="Target patient UUID"),
    disease: Optional[List[str]] = Query(None, description="Optional target disease keys filter"),
    enable_llm: bool = Query(True, description="Enable Gemini clinical narrative generation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HereditaryRiskAssessmentResponse:
    """
    Computes risk assessment for patient using database lab results and family tree.
    Enforces authentication and patient access authorization.
    """
    # Authorize access (must be self or managed placeholder profile)
    authorize_patient_access(current_user=current_user, target_patient_id=user_id, db=db)

    # Validate target disease keys if provided
    if disease:
        for d_key in disease:
            if d_key not in DISEASE_REGISTRY:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported disease key '{d_key}'. Supported keys: {list(DISEASE_REGISTRY.keys())}",
                )

    try:
        response = evaluate_patient_hereditary_risk_adapter(
            db=db,
            patient_id=user_id,
            disease_keys=disease,
            enable_llm_narrative=enable_llm,
        )
        return response
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hereditary risk assessment execution error: {str(exc)}",
        )


@router.post(
    "/patient/{user_id}/assessment",
    response_model=HereditaryRiskAssessmentResponse,
    summary="Compute hereditary disease risk assessment with custom options",
)
def post_patient_hereditary_assessment(
    user_id: uuid.UUID = FPath(..., description="Target patient UUID"),
    disease_keys: Optional[List[str]] = None,
    enable_llm_narrative: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> HereditaryRiskAssessmentResponse:
    """POST endpoint counterpart for requesting patient risk assessment."""
    return get_patient_hereditary_assessment(
        user_id=user_id,
        disease=disease_keys,
        enable_llm=enable_llm_narrative,
        current_user=current_user,
        db=db,
    )
