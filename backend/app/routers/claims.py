import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.claim_request import ClaimRequest
from app.models.family_relationship import FamilyRelationship
from app.models.report import Report
from app.models.user import User

router = APIRouter(prefix="/api/v1/claims", tags=["Profile Claims"])


class ClaimDetailResponse(BaseModel):
    id: uuid.UUID
    placeholder_user_id: uuid.UUID
    placeholder_name: str
    manager_user_id: uuid.UUID
    manager_name: str
    claimant_user_id: uuid.UUID
    claimant_name: str
    claimant_email: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ClaimActionRequest(BaseModel):
    user_id: uuid.UUID  # ID of manager or claimant initiating the action


@router.get(
    "/pending/{user_id}",
    response_model=List[ClaimDetailResponse],
    summary="Get pending claims for a user (either incoming to manage or outgoing as claimant)",
)
def get_pending_claims(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
) -> List[ClaimDetailResponse]:
    """
    Returns all active pending claims where the user is either the manager
    (needs to approve/reject) or the claimant (waiting for approval).
    """
    stmt = (
        select(ClaimRequest)
        .where(
            (ClaimRequest.manager_user_id == user_id) | (ClaimRequest.claimant_user_id == user_id)
        )
        .where(ClaimRequest.status == "pending")
        .order_by(ClaimRequest.created_at.desc())
    )
    claims = db.execute(stmt).scalars().all()

    results: List[ClaimDetailResponse] = []
    for c in claims:
        placeholder = db.get(User, c.placeholder_user_id)
        manager = db.get(User, c.manager_user_id)
        claimant = db.get(User, c.claimant_user_id)

        results.append(
            ClaimDetailResponse(
                id=c.id,
                placeholder_user_id=c.placeholder_user_id,
                placeholder_name=placeholder.full_name if placeholder else "Placeholder Profile",
                manager_user_id=c.manager_user_id,
                manager_name=manager.full_name if manager else "Tree Manager",
                claimant_user_id=c.claimant_user_id,
                claimant_name=claimant.full_name if claimant else "Claimant",
                claimant_email=claimant.email if claimant else "",
                status=c.status,
                created_at=c.created_at,
                resolved_at=c.resolved_at,
            )
        )
    return results


@router.post(
    "/{claim_id}/approve",
    response_model=ClaimDetailResponse,
    summary="Manager approves a claim request and transfers ownership of the placeholder profile",
)
def approve_claim(
    claim_id: uuid.UUID,
    payload: ClaimActionRequest,
    db: Session = Depends(get_db),
) -> ClaimDetailResponse:
    """
    Atomic merge transaction:
    1. Validates claim is pending and payload.user_id matches the manager.
    2. Overwrites placeholder profile credentials with claimant's verified login credentials.
    3. Clears is_placeholder and managed_by_user_id on placeholder.
    4. Repoints any historical records associated with claimant to the placeholder UUID.
    5. Marks claim as approved and deletes temporary claimant row.
    """
    claim = db.execute(select(ClaimRequest).where(ClaimRequest.id == claim_id)).scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim request not found.")

    if claim.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot approve claim with status '{claim.status}'.",
        )

    if claim.manager_user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the designated manager can approve this claim.",
        )

    placeholder = db.get(User, claim.placeholder_user_id)
    claimant = db.get(User, claim.claimant_user_id)
    manager = db.get(User, claim.manager_user_id)

    if not placeholder or not claimant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Referenced user profiles could not be resolved.",
        )

    # Perform Atomic Merge
    try:
        saved_email = claimant.email
        saved_password_hash = claimant.password_hash
        saved_full_name = claimant.full_name
        saved_gender = claimant.gender

        # 1. Defensively repoint any reports or family links from claimant to placeholder
        db.execute(
            update(Report)
            .where(Report.user_id == claimant.id)
            .values(user_id=placeholder.id)
        )
        db.execute(
            update(FamilyRelationship)
            .where(FamilyRelationship.user_id == claimant.id)
            .values(user_id=placeholder.id)
        )
        db.execute(
            update(FamilyRelationship)
            .where(FamilyRelationship.relative_user_id == claimant.id)
            .values(relative_user_id=placeholder.id)
        )

        # 2. Update claim status & repoint claimant_user_id to placeholder
        claim.claimant_user_id = placeholder.id
        claim.status = "approved"
        claim.resolved_at = datetime.now(timezone.utc)
        db.flush()

        # 3. Remove temporary claimant user row (freeing up the unique email)
        db.delete(claimant)
        db.flush()

        # 4. Transfer credentials and status to placeholder profile
        placeholder.email = saved_email
        placeholder.password_hash = saved_password_hash
        placeholder.full_name = saved_full_name or placeholder.full_name
        if saved_gender and saved_gender != "unspecified":
            placeholder.gender = saved_gender
        placeholder.is_placeholder = False
        placeholder.managed_by_user_id = None

        db.commit()
        db.refresh(claim)
        db.refresh(placeholder)
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Atomic merge transaction failed: {str(exc)}",
        )

    return ClaimDetailResponse(
        id=claim.id,
        placeholder_user_id=placeholder.id,
        placeholder_name=placeholder.full_name,
        manager_user_id=manager.id if manager else payload.user_id,
        manager_name=manager.full_name if manager else "Manager",
        claimant_user_id=placeholder.id,
        claimant_name=placeholder.full_name,
        claimant_email=placeholder.email,
        status=claim.status,
        created_at=claim.created_at,
        resolved_at=claim.resolved_at,
    )


@router.post(
    "/{claim_id}/reject",
    response_model=ClaimDetailResponse,
    summary="Manager rejects a claim request",
)
def reject_claim(
    claim_id: uuid.UUID,
    payload: ClaimActionRequest,
    db: Session = Depends(get_db),
) -> ClaimDetailResponse:
    claim = db.execute(select(ClaimRequest).where(ClaimRequest.id == claim_id)).scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim request not found.")

    if claim.manager_user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the designated manager can reject this claim.",
        )

    claim.status = "rejected"
    claim.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(claim)

    placeholder = db.get(User, claim.placeholder_user_id)
    manager = db.get(User, claim.manager_user_id)
    claimant = db.get(User, claim.claimant_user_id)

    return ClaimDetailResponse(
        id=claim.id,
        placeholder_user_id=claim.placeholder_user_id,
        placeholder_name=placeholder.full_name if placeholder else "Placeholder Profile",
        manager_user_id=claim.manager_user_id,
        manager_name=manager.full_name if manager else "Manager",
        claimant_user_id=claim.claimant_user_id,
        claimant_name=claimant.full_name if claimant else "Claimant",
        claimant_email=claimant.email if claimant else "",
        status=claim.status,
        created_at=claim.created_at,
        resolved_at=claim.resolved_at,
    )


@router.post(
    "/{claim_id}/abandon",
    response_model=ClaimDetailResponse,
    summary="Claimant abandons the pending claim and creates an independent account",
)
def abandon_claim(
    claim_id: uuid.UUID,
    payload: ClaimActionRequest,
    db: Session = Depends(get_db),
) -> ClaimDetailResponse:
    """
    Called when claimant chooses 'Create a new account for myself instead':
    1. Validates claim is pending and payload.user_id matches the claimant.
    2. Marks claim as abandoned.
    3. Leaves claimant with their own independent UUID/account.
    4. Leaves placeholder untouched under manager's control.
    """
    claim = db.execute(select(ClaimRequest).where(ClaimRequest.id == claim_id)).scalar_one_or_none()
    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim request not found.")

    if claim.claimant_user_id != payload.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the claimant can abandon this claim.",
        )

    claim.status = "abandoned"
    claim.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(claim)

    placeholder = db.get(User, claim.placeholder_user_id)
    manager = db.get(User, claim.manager_user_id)
    claimant = db.get(User, claim.claimant_user_id)

    return ClaimDetailResponse(
        id=claim.id,
        placeholder_user_id=claim.placeholder_user_id,
        placeholder_name=placeholder.full_name if placeholder else "Placeholder Profile",
        manager_user_id=claim.manager_user_id,
        manager_name=manager.full_name if manager else "Manager",
        claimant_user_id=claim.claimant_user_id,
        claimant_name=claimant.full_name if claimant else "Claimant",
        claimant_email=claimant.email if claimant else "",
        status=claim.status,
        created_at=claim.created_at,
        resolved_at=claim.resolved_at,
    )
