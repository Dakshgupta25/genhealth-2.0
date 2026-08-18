import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

# Initialize pwdlib's recommended password hashing instance (uses bcrypt)
password_hasher = PasswordHash.recommended()


class UserSignupRequest(BaseModel):
    """Payload schema for user registration with format and length validation."""
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name of the user")


class UserResponse(BaseModel):
    """Response schema exposing safe user attributes without sensitive password hashes."""
    id: uuid.UUID
    email: str
    full_name: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new user account with hashed password and unique email validation."
)
def signup(
    payload: UserSignupRequest,
    db: Session = Depends(get_db),
) -> User:
    """
    Registers a new user in the database.

    Validates email uniqueness (returns 409 Conflict if already registered),
    hashes the plain password using bcrypt via pwdlib, and persists the user record.
    """
    stmt = select(User).where(User.email == payload.email)
    existing_user = db.execute(stmt).scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email address already exists.",
        )

    # Hash password with bcrypt before persisting to database
    hashed_password = password_hasher.hash(payload.password)

    new_user = User(
        email=payload.email,
        password_hash=hashed_password,
        full_name=payload.full_name,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user
