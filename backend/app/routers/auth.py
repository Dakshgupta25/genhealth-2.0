import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.claim_request import ClaimRequest
from app.models.user import User

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

# Initialize pwdlib with bcrypt hasher
password_hasher = PasswordHash((BcryptHasher(),))


class UserSignupRequest(BaseModel):
    """Payload schema for user registration with format and length validation."""
    email: str = Field(..., min_length=3, max_length=255, description="Valid email address")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name of the user")
    gender: Optional[str] = Field("unspecified", description="Biological / stated gender for reciprocal relations")
    claim_uuid: Optional[uuid.UUID] = Field(None, description="Existing placeholder profile UUID to claim")


class UserLoginRequest(BaseModel):
    """Payload schema for user authentication."""
    email: str = Field(..., min_length=3, max_length=255, description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")


from app.dependencies.auth import create_access_token


class UserResponse(BaseModel):
    """Response schema exposing safe user attributes and claim status."""
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    gender: Optional[str] = "unspecified"
    avatar_url: Optional[str] = None
    is_placeholder: bool = False
    managed_by_user_id: Optional[uuid.UUID] = None
    is_pending_claim: bool = False
    claim_id: Optional[uuid.UUID] = None
    claim_placeholder_id: Optional[uuid.UUID] = None
    claim_manager_name: Optional[str] = None
    created_at: datetime
    access_token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


def _enrich_user_response(user: User, db: Session) -> UserResponse:
    # Check for active pending claim request
    claim_stmt = (
        select(ClaimRequest)
        .where(ClaimRequest.claimant_user_id == user.id)
        .where(ClaimRequest.status == "pending")
    )
    pending_claim = db.execute(claim_stmt).scalar_one_or_none()

    claim_id = None
    claim_placeholder_id = None
    claim_manager_name = None

    if pending_claim:
        claim_id = pending_claim.id
        claim_placeholder_id = pending_claim.placeholder_user_id
        manager = db.get(User, pending_claim.manager_user_id)
        claim_manager_name = manager.full_name if manager else "Family Member"

    token = create_access_token(user.id)

    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        gender=user.gender,
        avatar_url=user.avatar_url,
        is_placeholder=user.is_placeholder,
        managed_by_user_id=user.managed_by_user_id,
        is_pending_claim=bool(pending_claim),
        claim_id=claim_id,
        claim_placeholder_id=claim_placeholder_id,
        claim_manager_name=claim_manager_name,
        created_at=user.created_at,
        access_token=token,
    )


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user (with optional UUID claim initiation)",
    description="Registers a new user account with hashed password and unique email validation."
)
def signup(
    payload: UserSignupRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    stmt = select(User).where(User.email == payload.email)
    existing_user = db.execute(stmt).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    # If claim_uuid is provided, validate the target placeholder
    placeholder = None
    if payload.claim_uuid:
        placeholder = db.get(User, payload.claim_uuid)
        if not placeholder or not placeholder.is_placeholder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="The specified profile UUID is not a valid managed placeholder profile.",
            )

    # Hash password with bcrypt before persisting to database
    hashed_password = password_hasher.hash(payload.password)

    new_user = User(
        email=payload.email,
        password_hash=hashed_password,
        full_name=payload.full_name,
        gender=payload.gender or "unspecified",
    )
    db.add(new_user)
    db.flush()

    # If claiming, create pending ClaimRequest record
    if placeholder:
        claim_req = ClaimRequest(
            placeholder_user_id=placeholder.id,
            manager_user_id=placeholder.managed_by_user_id or placeholder.id,
            claimant_user_id=new_user.id,
            status="pending",
        )
        db.add(claim_req)

    db.commit()
    db.refresh(new_user)

    return _enrich_user_response(new_user, db)


@router.post(
    "/login",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate a user",
    description="Validates user credentials against stored bcrypt password hashes and returns user profile."
)
def login(
    payload: UserLoginRequest,
    db: Session = Depends(get_db),
) -> UserResponse:
    stmt = select(User).where(User.email == payload.email)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not password_hasher.verify(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return _enrich_user_response(user, db)
