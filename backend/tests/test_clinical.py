import pytest
from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult
from app.models.family_relationship import FamilyRelationship


def test_get_disease_mappings(client):
    res = client.get("/api/v1/clinical/diseases")
    assert res.status_code == 200
    diseases = res.json()
    assert len(diseases) >= 5
    diabetes = next(d for d in diseases if d["id"] == "diabetes")
    assert "Fasting Blood Sugar" in diabetes["primary_tests"]
    assert "HbA1c" in diabetes["primary_tests"]


def test_patient_cross_family_history(client, db_session):
    # 1. Create patient and father
    patient = User(
        email="patient.diabetes@test.com",
        password_hash="fakehash",
        full_name="Patient Diabetes",
        role="patient",
    )
    father = User(
        email="father.diabetes@test.com",
        password_hash="fakehash",
        full_name="Father Diabetes",
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
        original_filename="FatherLab.pdf",
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
    assert points[0]["relative_name"] == "Father Diabetes"
    assert points[0]["relationship_type"] == "father"
    assert points[0]["numeric_value"] == 210.0
    assert points[0]["abnormality_flag"] == "high"


def test_relative_disease_summary_and_privacy_check(client, db_session):
    # 1. Create patient and relative
    patient = User(email="patient_p@test.com", password_hash="fakehash", full_name="Patient Privacy", role="patient")
    relative = User(email="relative_p@test.com", password_hash="fakehash", full_name="Relative Privacy", role="patient")
    db_session.add_all([patient, relative])
    db_session.commit()
    db_session.refresh(patient)
    db_session.refresh(relative)

    # 2. Link relative with share_clinical_data = True
    rel = FamilyRelationship(
        user_id=patient.id,
        relative_user_id=relative.id,
        relationship_type="mother",
        share_clinical_data=True,
    )
    db_session.add(rel)

    # Add a report for relative
    report = Report(user_id=relative.id, original_filename="report.pdf", file_mime_type="application/pdf", status="done")
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)

    result = ReportResult(
        report_id=report.id,
        raw_test_name="Fasting Glucose",
        canonical_test_name="Fasting Blood Sugar",
        value="110",
        numeric_value=110.0,
        unit="mg/dL",
        abnormality_flag="warning",
    )
    db_session.add(result)
    db_session.commit()

    # 3. Query relative disease summary with consent enabled -> 200 OK
    res = client.get(f"/api/v1/clinical/patient/{patient.id}/relative/{relative.id}/disease/diabetes/summary")
    assert res.status_code == 200
    summaries = res.json()
    assert len(summaries) >= 1
    sugar_summary = next(s for s in summaries if s["canonical_test_name"] == "Fasting Blood Sugar")
    assert sugar_summary["latest_value"] == "110"

    # 4. Disable clinical data sharing consent -> MUST receive 403 Forbidden
    rel.share_clinical_data = False
    db_session.commit()

    blocked_res = client.get(f"/api/v1/clinical/patient/{patient.id}/relative/{relative.id}/disease/diabetes/summary")
    assert blocked_res.status_code == 403
    assert "Clinical data sharing is disabled" in blocked_res.json()["detail"]

