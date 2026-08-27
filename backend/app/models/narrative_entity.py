import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.report import Report


class NarrativeEntity(Base):
    """
    A single biomedical entity extracted from a report's free-text narrative
    by the d4data/biomedical-ner-all HuggingFace model.

    entity_type values (from the NER model):
      Disease_disorder | Sign_symptom | Lab_value | Diagnostic_procedure

    suppressed=True means the boilerplate filter rejected this entity
    (i.e., it was found only in generic advisory text, not tied to a real
    abnormal result). Suppressed entities are stored but excluded from
    downstream analysis by default.

    canonical_name is populated if the entity_text could be matched to a
    known LOINC/SNOMED term (future extension -- currently stored as None).
    """

    __tablename__ = "narrative_entities"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    report_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("reports.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_text: Mapped[str] = mapped_column(String(500), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    canonical_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # NER model confidence score (0.0-1.0)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # True if the boilerplate-suppression heuristic decided this entity
    # was from advisory text rather than an actual clinical finding.
    suppressed: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )

    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship
    report: Mapped["Report"] = relationship("Report", back_populates="entities")

    def __repr__(self) -> str:
        return (
            f"<NarrativeEntity(type='{self.entity_type}', text='{self.entity_text[:40]}', "
            f"suppressed={self.suppressed})>"
        )
