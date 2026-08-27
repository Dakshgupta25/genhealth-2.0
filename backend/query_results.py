from app.database import SessionLocal
from app.models.report_result import ReportResult
from app.models.narrative_entity import NarrativeEntity
from sqlalchemy import select

db = SessionLocal()
report_id = "3a89c3c6-69fd-4bed-887c-56e76a243d2f"

print("=== REPORT RESULTS (22 rows) ===")
rows = db.execute(select(ReportResult).where(ReportResult.report_id == report_id)).scalars().all()
print(f"{'Raw Test Name':<35} {'Canonical':<30} {'Value':<12} {'Flag':<8} {'LOINC'}")
print("-" * 105)
for r in rows:
    raw = (r.raw_test_name or "")[:34]
    canon = (r.canonical_test_name or "[no match]")[:29]
    val = (r.value or "")[:11]
    flag = r.abnormality_flag or ""
    loinc = r.loinc_code or ""
    print(f"{raw:<35} {canon:<30} {val:<12} {flag:<8} {loinc}")

print()
print("=== NARRATIVE ENTITIES ===")
ents = db.execute(select(NarrativeEntity).where(NarrativeEntity.report_id == report_id)).scalars().all()
print(f"{'Entity Text':<35} {'Type':<25} {'Score':<8} Suppressed")
print("-" * 80)
for e in ents:
    txt = (e.entity_text or "")[:34]
    etype = (e.entity_type or "")[:24]
    print(f"{txt:<35} {etype:<25} {e.score:<8.3f} {e.suppressed}")

db.close()
