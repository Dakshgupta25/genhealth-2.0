import uuid
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    """SQLAlchemy model representing the users table."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )
    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    date_of_birth: Mapped[Optional[date]] = mapped_column(
        Date,
        nullable=True,
    )
    gender: Mapped[Optional[str]] = mapped_column(
        String(20),
        nullable=True,
        default="unspecified",
        server_default="unspecified",
    )
    avatar_url: Mapped[Optional[str]] = mapped_column(
        String,
        nullable=True,
    )
    is_placeholder: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="0",
    )
    managed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    role: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="patient",
        server_default="patient",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', placeholder={self.is_placeholder})>"

