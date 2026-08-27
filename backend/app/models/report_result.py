import uuid
from datetime import datetime
from typing import Optional, TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, UUID, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.report import Report


class ReportResult(Base):
    """
    One extracted lab test row per report.

    Stores both the raw extraction from Gemini and the normalized
    canonical form produced by the fuzzy-matching normalizer.

    abnormality_flag values: 'normal' | 'high' | 'low' | 'unknown'
    - 'unknown' means the reference_range was missing or could not be parsed.

    match_score is the rapidfuzz token_sort_ratio score (0-100) for the
    fuzzy match between raw_test_name and the lookup table key.
    A score of None means no match was found above the threshold (80).
    """

    __tablename__ = "report_results"

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
    # Raw extraction from Gemini
    raw_test_name: Mapped[str] = mapped_column(String(500), nullable=False)
    value: Mapped[str] = mapped_column(String(200), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    reference_range: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)

    # Normalized / canonical form (from lab_lookup.json via rapidfuzz)
    canonical_test_name: Mapped[Optional[str]] = mapped_column(String(500), nullable=True, index=True)
    loinc_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    match_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Parsed numeric value - enables ORDER BY / range queries for trend tracking
    numeric_value: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # 'normal' | 'high' | 'low' | 'unknown'
    abnormality_flag: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )

    extracted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    # Relationship
    report: Mapped["Report"] = relationship("Report", back_populates="results")

    def __repr__(self) -> str:
        return (
            f"<ReportResult(raw='{self.raw_test_name}', canonical='{self.canonical_test_name}', "
            f"value='{self.value}', flag='{self.abnormality_flag}')>"
        )
