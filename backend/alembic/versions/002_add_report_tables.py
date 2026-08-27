"""Add report, report_results, and narrative_entities tables

Revision ID: 002_add_report_tables
Revises: 001_create_users_table
Create Date: 2026-08-26

Adds three tables for the lab report ingestion pipeline:
  reports              -- one row per uploaded lab report document
  report_results       -- one row per extracted test result row
  narrative_entities   -- one row per NER entity found in free-text narrative
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "002_add_report_tables"
down_revision: Union[str, None] = "001_create_users_table"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # reports
    # ------------------------------------------------------------------
    op.create_table(
        "reports",
        sa.Column("id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("file_mime_type", sa.String(length=100), nullable=False),
        sa.Column(
            "status",
            sa.String(length=50),
            server_default="pending",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column("extracted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_reports_user_id", "reports", ["user_id"])

    # ------------------------------------------------------------------
    # report_results
    # ------------------------------------------------------------------
    op.create_table(
        "report_results",
        sa.Column("id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("raw_test_name", sa.String(length=500), nullable=False),
        sa.Column("value", sa.String(length=200), nullable=False),
        sa.Column("unit", sa.String(length=100), nullable=True),
        sa.Column("reference_range", sa.String(length=200), nullable=True),
        sa.Column("canonical_test_name", sa.String(length=500), nullable=True),
        sa.Column("loinc_code", sa.String(length=50), nullable=True),
        sa.Column("match_score", sa.Float(), nullable=True),
        sa.Column("numeric_value", sa.Float(), nullable=True),
        sa.Column(
            "abnormality_flag",
            sa.String(length=20),
            server_default="unknown",
            nullable=False,
        ),
        sa.Column(
            "extracted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_report_results_report_id", "report_results", ["report_id"])
    # Index on canonical_test_name speeds up the health-tracking trend query
    op.create_index(
        "ix_report_results_canonical_test_name",
        "report_results",
        ["canonical_test_name"],
    )

    # ------------------------------------------------------------------
    # narrative_entities
    # ------------------------------------------------------------------
    op.create_table(
        "narrative_entities",
        sa.Column("id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("report_id", sa.UUID(as_uuid=True), nullable=False),
        sa.Column("entity_text", sa.String(length=500), nullable=False),
        sa.Column("entity_type", sa.String(length=100), nullable=False),
        sa.Column("canonical_name", sa.String(length=500), nullable=True),
        sa.Column("score", sa.Float(), nullable=True),
        sa.Column(
            "suppressed",
            sa.Boolean(),
            server_default="false",
            nullable=False,
        ),
        sa.Column(
            "extracted_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["report_id"], ["reports.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_narrative_entities_report_id", "narrative_entities", ["report_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_narrative_entities_report_id", table_name="narrative_entities")
    op.drop_table("narrative_entities")

    op.drop_index(
        "ix_report_results_canonical_test_name", table_name="report_results"
    )
    op.drop_index("ix_report_results_report_id", table_name="report_results")
    op.drop_table("report_results")

    op.drop_index("ix_reports_user_id", table_name="reports")
    op.drop_table("reports")
