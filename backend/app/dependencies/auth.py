import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt
from fastapi import Depends, HTTPException, Header, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User

security = HTTPBearer(auto_error=False)


def create_access_token(user_id: uuid.UUID) -> str:
    """Generate signed JWT access token for user ID."""
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    x_user_id: Optional[str] = Header(None, alias="X-User-ID"),
    db: Session = Depends(get_db),
) -> User:
    """
    Extract and authenticate current user from Bearer JWT token or fallback header.
    """
    user_id_str: Optional[str] = None

    if credentials and credentials.credentials:
        token = credentials.credentials
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
            user_id_str = payload.get("sub")
        except jwt.PyJWTError:
            # Fallback: check if token is raw UUID string
            try:
                uuid.UUID(token)
                user_id_str = token
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or expired authentication token.",
                )
    elif x_user_id:
        user_id_str = x_user_id

    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid user ID format in token.",
        )

    user = db.get(User, user_uuid)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authenticated user account does not exist.",
        )

    return user


def authorize_patient_access(
    current_user: User,
    target_patient_id: uuid.UUID,
    db: Session,
) -> User:
    """
    Authorize current_user to access target_patient_id.
    Access allowed if:
    1. current_user.id == target_patient_id (Accessing self)
    2. target_patient is a managed placeholder profile where managed_by_user_id == current_user.id
    """
    if current_user.id == target_patient_id:
        return current_user

    target_user = db.get(User, target_patient_id)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID '{target_patient_id}' does not exist.",
        )

    if target_user.is_placeholder and target_user.managed_by_user_id == current_user.id:
        return target_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You are not authorized to access hereditary medical data for this patient.",
    )
