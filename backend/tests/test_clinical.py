import pytest
import uuid
from datetime import date
from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.family_relationship import FamilyRelationship
from app.models.medical_history import MedicalHistoryRecord


def test_get_disease_mappings(client):
    res = client.get("/api/v1/clinical/diseases")
    assert res.status_code == 200
    diseases = res.json()
    assert len(diseases) == 6
    keys = [d["id"] for d in diseases]
    assert "type_2_diabetes" in keys
    assert "dyslipidemia" in keys
    assert "hypothyroidism" in keys
    assert "ckd" in keys
    assert "anemia" in keys
    assert "liver_disease" in keys

    diabetes = next(d for d in diseases if d["id"] == "type_2_diabetes")
    assert "hba1c" in diabetes["primary_biomarkers"]
    assert "fasting_glucose" in diabetes["primary_biomarkers"]
    assert diabetes["heritability_estimate"] == 0.50
    assert "40-60%" in diabetes["heritability_range_text"]
    assert len(diabetes["primary_biomarkers_detail"]) >= 4


def test_patient_recent_disease_measurements(client, db_session):
    # 1. Create a patient
    patient = User(
        email="patient.recent@test.com",
        password_hash="fakehash",
        full_name="Patient Recent",
        role="patient",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    # 2. Add 2 reports with diabetes & renal markers
    rep1 = Report(user_id=patient.id, original_filename="Report1.pdf", file_mime_type="application/pdf", status="done")
    db_session.add(rep1)
    db_session.commit()
    db_session.refresh(rep1)

    r1_sugar = ReportResult(
        report_id=rep1.id,
        raw_test_name="Fasting Glucose",
        canonical_test_name="Fasting Blood Glucose",
        value="142",
        numeric_value=142.0,
        unit="mg/dL",
        abnormality_flag="high",
    )
    r1_creat = ReportResult(
        report_id=rep1.id,
        raw_test_name="Serum Creatinine",
        canonical_test_name="Serum Creatinine",
        value="0.9",
        numeric_value=0.9,
        unit="mg/dL",
        abnormality_flag="normal",
    )
    db_session.add_all([r1_sugar, r1_creat])
    db_session.commit()

    # 3. Query recent measurements for type_2_diabetes
    res = client.get(f"/api/v1/clinical/patient/{patient.id}/disease/type_2_diabetes/recent-measurements")
    assert res.status_code == 200
    data = res.json()
    assert data["disease_key"] == "type_2_diabetes"
    assert data["total_reports_evaluated"] == 1
    assert len(data["reports"]) == 1
    # Only sugar should be in diabetes measurements, not creatinine
    measurements = data["reports"][0]["measurements"]
    assert len(measurements) == 1
    assert measurements[0]["canonical_key"] == "fasting_glucose"
    assert measurements[0]["numeric_value"] == 142.0


def test_hybrid_disease_timeline_and_medical_history_crud(client, db_session):
    # 1. Create a patient
    patient = User(
        email="patient.timeline@test.com",
        password_hash="fakehash",
        full_name="Patient Timeline",
        role="patient",
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    # 2. Add an historical report with a CRITICAL HbA1c (triggering an inferred episode)
    rep = Report(user_id=patient.id, original_filename="CriticalHbA1c.pdf", file_mime_type="application/pdf", status="done")
    db_session.add(rep)
    db_session.commit()
    db_session.refresh(rep)

    crit_hba1c = ReportResult(
        report_id=rep.id,
        raw_test_name="HbA1c Glycated Hemoglobin",
        canonical_test_name="HbA1c (Glycated Hemoglobin)",
        value="9.2",
        numeric_value=9.2,
        unit="%",
        abnormality_flag="critical",
    )
    db_session.add(crit_hba1c)
    db_session.commit()

    # 3. Post a confirmed diagnosis record via POST endpoint
    post_res = client.post(
        f"/api/v1/clinical/patient/{patient.id}/medical-history",
        json={
            "disease_key": "type_2_diabetes",
            "diagnosis_date": "2021-06-15",
            "record_type": "confirmed_diagnosis",
            "status": "managed",
            "notes": "Diagnosed by Endocrinologist; taking Metformin 500mg BID.",
        },
    )
    assert post_res.status_code == 201
    created_rec = post_res.json()
    record_id = created_rec["id"]
    assert created_rec["disease_key"] == "type_2_diabetes"
    assert created_rec["status"] == "managed"

    # 4. Fetch the hybrid timeline
    timeline_res = client.get(f"/api/v1/clinical/patient/{patient.id}/disease/type_2_diabetes/timeline")
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    assert len(timeline) == 2  # 1 confirmed diagnosis + 1 inferred episode

    confirmed_item = next(e for e in timeline if not e["is_inferred"])
    inferred_item = next(e for e in timeline if e["is_inferred"])

    assert confirmed_item["source_label"] == "Official Medical Record"
    assert "Metformin" in confirmed_item["notes"]

    assert inferred_item["source_label"] == "Inferred from Lab Values"
    assert inferred_item["severity"] == "critical"
    assert len(inferred_item["triggers"]) >= 1
    assert inferred_item["triggers"][0]["biomarker_key"] == "hba1c"

    # 5. Delete medical history record
    del_res = client.delete(f"/api/v1/clinical/patient/{patient.id}/medical-history/{record_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify timeline now only has the inferred episode
    timeline_res2 = client.get(f"/api/v1/clinical/patient/{patient.id}/disease/type_2_diabetes/timeline")
    assert len(timeline_res2.json()) == 1


def test_family_disease_overview_with_consent(client, db_session):
    # 1. Create primary patient and two relatives: Father (consented) and Mother (unconsented)
    patient = User(email="p.fam@test.com", password_hash="fakehash", full_name="Patient Pedigree", role="patient")
    father = User(email="f.fam@test.com", password_hash="fakehash", full_name="Father Pedigree", role="patient")
    mother = User(email="m.fam@test.com", password_hash="fakehash", full_name="Mother Pedigree", role="patient")
    db_session.add_all([patient, father, mother])
    db_session.commit()
    db_session.refresh(patient)
    db_session.refresh(father)
    db_session.refresh(mother)

    # 2. Link Father with share_clinical_data=True, Mother with share_clinical_data=False
    rel_f = FamilyRelationship(user_id=patient.id, relative_user_id=father.id, relationship_type="father", share_clinical_data=True)
    rel_m = FamilyRelationship(user_id=patient.id, relative_user_id=mother.id, relationship_type="mother", share_clinical_data=False)
    db_session.add_all([rel_f, rel_m])

    # 3. Add reports for Father
    f_rep = Report(user_id=father.id, original_filename="FatherCKD.pdf", file_mime_type="application/pdf", status="done")
    db_session.add(f_rep)
    db_session.commit()
    db_session.refresh(f_rep)

    f_creat = ReportResult(
        report_id=f_rep.id,
        raw_test_name="Creatinine",
        canonical_test_name="Serum Creatinine",
        value="2.4",
        numeric_value=2.4,
        unit="mg/dL",
        abnormality_flag="critical",
    )
    db_session.add(f_creat)
    db_session.commit()

    # 4. Fetch Family Overview for CKD
    res = client.get(f"/api/v1/clinical/patient/{patient.id}/disease/ckd/family-overview")
    assert res.status_code == 200
    overview = res.json()
    assert len(overview) == 2

    father_entry = next(r for r in overview if r["relative_name"] == "Father Pedigree")
    mother_entry = next(r for r in overview if r["relative_name"] == "Mother Pedigree")

    # Father should have measurements and inferred timeline
    assert father_entry["consent_restricted"] is False
    assert father_entry["is_genetic"] is True
    assert father_entry["kinship_weight"] == 0.5
    assert len(father_entry["recent_reports"]) == 1
    assert len(father_entry["timeline"]) == 1
    assert father_entry["timeline"][0]["is_inferred"] is True

    # Mother should be consent restricted
    assert mother_entry["consent_restricted"] is True
    assert "restricted" in mother_entry["restriction_reason"].lower()
    assert len(mother_entry["recent_reports"]) == 0
    assert len(mother_entry["timeline"]) == 0


def test_patient_cross_family_history_legacy(client, db_session):
    # 1. Create patient and father
    patient = User(
        email="patient.diabetes2@test.com",
        password_hash="fakehash",
        full_name="Patient Diabetes2",
        role="patient",
    )
    father = User(
        email="father.diabetes2@test.com",
        password_hash="fakehash",
        full_name="Father Diabetes2",
        role="patient",
    )
    db_session.add_all([patient, father])
    db_session.commit()
    db_session.refresh(patient)
    db_session.refresh(father)

    # 2. Link father in family tree
    rel = FamilyRelationship(
        user_id=patient.id,
        relative_user_id=father.id,
        relationship_type="father",
    )
    db_session.add(rel)

    # 3. Create a report and test result for father with High Fasting Blood Sugar
    father_report = Report(
        user_id=father.id,
        original_filename="FatherLab2.pdf",
        file_mime_type="application/pdf",
        status="done",
    )
    db_session.add(father_report)
    db_session.commit()
    db_session.refresh(father_report)

    father_sugar = ReportResult(
        report_id=father_report.id,
        raw_test_name="Blood Sugar Fasting",
        canonical_test_name="Fasting Blood Sugar",
        value="210",
        numeric_value=210.0,
        unit="mg/dL",
        reference_range="70-99",
        abnormality_flag="high",
    )
    db_session.add(father_sugar)
    db_session.commit()

    # 4. Query patient's family history for Fasting Blood Sugar
    res = client.get(f"/api/v1/clinical/patient/{patient.id}/family-history/Fasting%20Blood%20Sugar")
    assert res.status_code == 200
    points = res.json()
    assert len(points) == 1
    assert points[0]["relative_name"] == "Father Diabetes2"
    assert points[0]["relationship_type"] == "father"
    assert points[0]["numeric_value"] == 210.0
    assert points[0]["abnormality_flag"] == "high"
