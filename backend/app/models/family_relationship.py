import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class FamilyRelationship(Base):
    """
    SQLAlchemy model representing family links between users.
    
    Links user_id to a relative_user_id with a designated relationship type
    (e.g., 'father', 'mother', 'son', 'daughter', 'brother', 'sister', 'spouse').
    """

    __tablename__ = "family_relationships"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relative_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    relationship_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships to User model
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    relative: Mapped["User"] = relationship("User", foreign_keys=[relative_user_id])

    def __repr__(self) -> str:
        return f"<FamilyRelationship(user={self.user_id}, relative={self.relative_user_id}, type='{self.relationship_type}')>"
