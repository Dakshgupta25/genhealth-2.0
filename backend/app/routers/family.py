import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path as FPath, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.family_relationship import FamilyRelationship
from app.models.user import User

router = APIRouter(prefix="/api/v1/family", tags=["Family Tree"])


class FamilyLinkRequest(BaseModel):
    user_id: uuid.UUID
    relative_user_id: uuid.UUID
    relationship_type: str


class FamilyMemberResponse(BaseModel):
    relationship_id: uuid.UUID
    relative_id: uuid.UUID
    full_name: str
    email: str
    relationship_type: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.get(
    "/{user_id}",
    response_model=List[FamilyMemberResponse],
    summary="Get all linked family members for a user",
)
def get_family_members(
    user_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
) -> List[FamilyMemberResponse]:
    # Reasoning:
    # Queries the family_relationships table joined with users to fetch all linked relatives
    # along with their clinical user profile details for genealogical risk tracking.
    stmt = (
        select(FamilyRelationship, User)
        .join(User, FamilyRelationship.relative_user_id == User.id)
        .where(FamilyRelationship.user_id == user_id)
        .order_by(FamilyRelationship.created_at.asc())
    )
    rows = db.execute(stmt).all()

    return [
        FamilyMemberResponse(
            relationship_id=rel.id,
            relative_id=user.id,
            full_name=user.full_name,
            email=user.email,
            relationship_type=rel.relationship_type,
            role=user.role,
            created_at=rel.created_at,
        )
        for rel, user in rows
    ]


@router.post(
    "/link",
    response_model=FamilyMemberResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link a relative by their unique User ID",
)
def link_family_member(
    payload: FamilyLinkRequest,
    db: Session = Depends(get_db),
) -> FamilyMemberResponse:
    # Reasoning:
    # Validates that both the base user and target relative exist in the users table,
    # prevents invalid self-referential relationships, checks against duplicate links,
    # and records the bidirectional or directed genealogical association.
    if payload.user_id == payload.relative_user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot link a user to themselves as a relative.",
        )

    # Check user exists
    user = db.execute(select(User).where(User.id == payload.user_id)).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Primary user not found.")

    # Check relative exists
    relative = db.execute(select(User).where(User.id == payload.relative_user_id)).scalar_one_or_none()
    if not relative:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Target relative User ID does not exist in the database.",
        )

    # Check duplicate
    existing_stmt = select(FamilyRelationship).where(
        FamilyRelationship.user_id == payload.user_id,
        FamilyRelationship.relative_user_id == payload.relative_user_id,
    )
    if db.execute(existing_stmt).scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This family relationship has already been linked.",
        )

    new_rel = FamilyRelationship(
        user_id=payload.user_id,
        relative_user_id=payload.relative_user_id,
        relationship_type=payload.relationship_type.strip().lower(),
    )
    db.add(new_rel)
    db.commit()
    db.refresh(new_rel)

    return FamilyMemberResponse(
        relationship_id=new_rel.id,
        relative_id=relative.id,
        full_name=relative.full_name,
        email=relative.email,
        relationship_type=new_rel.relationship_type,
        role=relative.role,
        created_at=new_rel.created_at,
    )


@router.delete(
    "/{relationship_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Unlink a family relationship",
)
def unlink_family_member(
    relationship_id: uuid.UUID = FPath(...),
    db: Session = Depends(get_db),
):
    # Reasoning:
    # Safely severs a family relationship link between two user profiles.
    stmt = select(FamilyRelationship).where(FamilyRelationship.id == relationship_id)
    rel = db.execute(stmt).scalar_one_or_none()
    if not rel:
        raise HTTPException(status_code=404, detail="Family relationship not found.")

    db.delete(rel)
    db.commit()
    return None
