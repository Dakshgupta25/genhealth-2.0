import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ClaimRequest(Base):
    """
    SQLAlchemy model representing a pending or resolved claim request
    where a real user signs up and requests ownership of an existing managed placeholder profile.
    """

    __tablename__ = "claim_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    placeholder_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    manager_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    claimant_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # 'pending', 'approved', 'rejected', 'abandoned', 'expired'
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    resolved_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    placeholder: Mapped["User"] = relationship("User", foreign_keys=[placeholder_user_id])
    manager: Mapped["User"] = relationship("User", foreign_keys=[manager_user_id])
    claimant: Mapped["User"] = relationship("User", foreign_keys=[claimant_user_id])

    def __repr__(self) -> str:
        return f"<ClaimRequest(id={self.id}, placeholder={self.placeholder_user_id}, status='{self.status}')>"
