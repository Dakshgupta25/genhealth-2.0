import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from pwdlib import PasswordHash
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

from pwdlib.hashers.bcrypt import BcryptHasher

router = APIRouter(prefix="/api/v1/auth", tags=["Auth"])

# Initialize pwdlib with bcrypt hasher per requirements.txt
password_hasher = PasswordHash((BcryptHasher(),))


class UserSignupRequest(BaseModel):
    """Payload schema for user registration with format and length validation."""
    email: str = Field(..., min_length=3, max_length=255, description="Valid email address")
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
    full_name: str = Field(..., min_length=1, max_length=255, description="Full name of the user")


class UserLoginRequest(BaseModel):
    """Payload schema for user authentication."""
    email: str = Field(..., min_length=3, max_length=255, description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")


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
) -> User:
    # Reasoning:
    # Authenticates users by matching their email and securely verifying
    # the candidate password against the stored bcrypt hash using pwdlib.
    # Returns HTTP 401 for both unknown emails and incorrect passwords to prevent user enumeration.
    stmt = select(User).where(User.email == payload.email)
    user = db.execute(stmt).scalar_one_or_none()

    if not user or not password_hasher.verify(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    return user

