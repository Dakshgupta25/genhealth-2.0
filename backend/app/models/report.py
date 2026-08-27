import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.report_result import ReportResult
    from app.models.narrative_entity import NarrativeEntity


class Report(Base):
    """
    Represents a single uploaded lab report document.

    Tracks the lifecycle of the ingestion pipeline:
      pending -> processing -> done | failed

    Each report belongs to one user and has many ReportResult rows
    (one per extracted test) and NarrativeEntity rows (from free-text NER).
    """

    __tablename__ = "reports"

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
    original_filename: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )
    file_mime_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    # Pipeline lifecycle status
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="pending",
        server_default="pending",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    extracted_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates=None)
    results: Mapped[list["ReportResult"]] = relationship(
        "ReportResult",
        back_populates="report",
        cascade="all, delete-orphan",
    )
    entities: Mapped[list["NarrativeEntity"]] = relationship(
        "NarrativeEntity",
        back_populates="report",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Report(id={self.id}, user_id={self.user_id}, status='{self.status}')>"
