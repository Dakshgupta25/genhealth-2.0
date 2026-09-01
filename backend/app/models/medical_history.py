import uuid
from datetime import datetime, date
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text, UUID, Date, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class MedicalHistoryRecord(Base):
    """
    SQLAlchemy model representing a patient's medical history entry or confirmed diagnosis.
    
    Can be logged by the patient, linked manager, or reviewing physician.
    """

    __tablename__ = "medical_history_records"

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
    disease_key: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    diagnosis_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
    )
    record_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="confirmed_diagnosis",
        server_default="confirmed_diagnosis",
    )  # 'confirmed_diagnosis', 'self_reported', 'clinical_note'
    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="active",
        server_default="active",
    )  # 'active', 'managed', 'in_remission', 'resolved'
    notes: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    created_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", foreign_keys=[user_id])
    created_by: Mapped[Optional["User"]] = relationship("User", foreign_keys=[created_by_user_id])

    def __repr__(self) -> str:
        return (
            f"<MedicalHistoryRecord(id={self.id}, user_id={self.user_id}, "
            f"disease='{self.disease_key}', date='{self.diagnosis_date}')>"
        )
