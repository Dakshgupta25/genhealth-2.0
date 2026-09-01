import pytest
from datetime import date
from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.family_relationship import FamilyRelationship
from app.models.medical_history import MedicalHistoryRecord


def test_doctor_portal_complete_workflow(client, db_session):
    # -------------------------------------------------------------------------
    # 1. Verify Disease Registry (Search Source)
    # -------------------------------------------------------------------------
    res = client.get("/api/v1/clinical/diseases")
    assert res.status_code == 200
    diseases = res.json()
    assert len(diseases) == 6
    registry_keys = {d["id"] for d in diseases}
    assert registry_keys == {"type_2_diabetes", "dyslipidemia", "hypothyroidism", "ckd", "anemia", "liver_disease"}

    # -------------------------------------------------------------------------
    # 2. Setup Patient A (with both personal and family history for Diabetes)
    # -------------------------------------------------------------------------
    patient_a = User(email="doctor.patientA@test.com", password_hash="hash", full_name="Patient Alex", role="patient")
    father_a = User(email="doctor.fatherA@test.com", password_hash="hash", full_name="Father Arthur", role="patient")
    db_session.add_all([patient_a, father_a])
    db_session.commit()
    db_session.refresh(patient_a)
    db_session.refresh(father_a)

    # Link Father in family tree with clinical data sharing enabled
    rel_father = FamilyRelationship(
        user_id=patient_a.id,
        relative_user_id=father_a.id,
        relationship_type="father",
        share_clinical_data=True,
    )
    db_session.add(rel_father)

    # Patient A has a report with HbA1c = 8.6% (Critical)
    p_report = Report(user_id=patient_a.id, original_filename="Alex_Labs_2023.pdf", file_mime_type="application/pdf", status="done")
    db_session.add(p_report)
    db_session.commit()
    db_session.refresh(p_report)

    p_hba1c = ReportResult(
        report_id=p_report.id,
        raw_test_name="HbA1c Glycated",
        canonical_test_name="HbA1c (Glycated Hemoglobin)",
        value="8.6",
        numeric_value=8.6,
        unit="%",
        abnormality_flag="critical",
    )
    db_session.add(p_hba1c)

    # Patient A logs an explicit confirmed diagnosis
    p_diag = MedicalHistoryRecord(
        user_id=patient_a.id,
        disease_key="type_2_diabetes",
        diagnosis_date=date(2022, 4, 10),
        record_type="confirmed_diagnosis",
        status="managed",
        notes="Diagnosed at Endocrinology Clinic; taking Metformin.",
    )
    db_session.add(p_diag)

    # Father Arthur has a report with Fasting Blood Glucose = 210 mg/dL (Critical)
    f_report = Report(user_id=father_a.id, original_filename="Arthur_Labs.pdf", file_mime_type="application/pdf", status="done")
    db_session.add(f_report)
    db_session.commit()
    db_session.refresh(f_report)

    f_fbs = ReportResult(
        report_id=f_report.id,
        raw_test_name="Fasting Blood Glucose",
        canonical_test_name="Fasting Blood Glucose",
        value="210",
        numeric_value=210.0,
        unit="mg/dL",
        abnormality_flag="critical",
    )
    db_session.add(f_fbs)
    db_session.commit()

    # -------------------------------------------------------------------------
    # 3. Test Patient A — LEFT COLUMN (Self Measurements & Hybrid Timeline)
    # -------------------------------------------------------------------------
    meas_res = client.get(f"/api/v1/clinical/patient/{patient_a.id}/disease/type_2_diabetes/recent-measurements")
    assert meas_res.status_code == 200
    meas_data = meas_res.json()
    assert meas_data["disease_key"] == "type_2_diabetes"
    assert len(meas_data["reports"]) == 1
    assert len(meas_data["biomarker_summaries"]) == 1
    assert meas_data["biomarker_summaries"][0]["canonical_key"] == "hba1c"
    assert meas_data["biomarker_summaries"][0]["numeric_value"] == 8.6

    timeline_res = client.get(f"/api/v1/clinical/patient/{patient_a.id}/disease/type_2_diabetes/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    # Expect 2 events: 1 confirmed diagnosis + 1 inferred episode from HbA1c 8.6%
    assert len(timeline) == 2
    types = {e["event_type"] for e in timeline}
    assert "confirmed_diagnosis" in types
    assert "inferred_episode" in types

    # -------------------------------------------------------------------------
    # 4. Test Patient A — RIGHT COLUMN (Family Pedigree Overview)
    # -------------------------------------------------------------------------
    fam_res = client.get(f"/api/v1/clinical/patient/{patient_a.id}/disease/type_2_diabetes/family-overview")
    assert fam_res.status_code == 200
    fam_data = fam_res.json()
    assert len(fam_data) == 1
    father_entry = fam_data[0]
    assert father_entry["relative_name"] == "Father Arthur"
    assert father_entry["relationship_type"] == "father"
    assert father_entry["is_genetic"] is True
    assert father_entry["kinship_weight"] == 0.5
    assert father_entry["consent_restricted"] is False
    assert len(father_entry["recent_reports"]) == 1
    assert father_entry["biomarker_summaries"][0]["canonical_key"] == "fasting_glucose"
    assert len(father_entry["timeline"]) == 1
    assert father_entry["timeline"][0]["is_inferred"] is True

    # -------------------------------------------------------------------------
    # 5. Test Patient A — Disease with NEITHER Personal Nor Family History (Hypothyroidism)
    # -------------------------------------------------------------------------
    hypo_meas = client.get(f"/api/v1/clinical/patient/{patient_a.id}/disease/hypothyroidism/recent-measurements")
    assert hypo_meas.status_code == 200
    assert len(hypo_meas.json()["reports"]) == 0
    assert len(hypo_meas.json()["biomarker_summaries"]) == 0

    hypo_timeline = client.get(f"/api/v1/clinical/patient/{patient_a.id}/disease/hypothyroidism/timeline")
    assert hypo_timeline.status_code == 200
    assert len(hypo_timeline.json()) == 0

    hypo_fam = client.get(f"/api/v1/clinical/patient/{patient_a.id}/disease/hypothyroidism/family-overview")
    assert hypo_fam.status_code == 200
    assert len(hypo_fam.json()) == 1
    assert len(hypo_fam.json()[0]["recent_reports"]) == 0
    assert len(hypo_fam.json()[0]["timeline"]) == 0
