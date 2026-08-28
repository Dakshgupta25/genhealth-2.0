import pytest
from app.models.user import User
from app.models.report import Report
from app.models.report_result import ReportResult


def test_get_user_recent_reports(client, db_session):
    # 1. Create a user
    user = User(
        email="dashboard.user@test.com",
        password_hash="fakehash",
        full_name="Dashboard Test User",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # 2. Add two reports
    rep1 = Report(
        user_id=user.id,
        original_filename="CBC_Report.pdf",
        file_mime_type="application/pdf",
        status="done",
    )
    rep2 = Report(
        user_id=user.id,
        original_filename="Lipid_Panel.jpg",
        file_mime_type="image/jpeg",
        status="done",
    )
    db_session.add_all([rep1, rep2])
    db_session.commit()
    db_session.refresh(rep1)
    db_session.refresh(rep2)

    # 3. Add measurements to rep1 and rep2, plus a failed report rep3
    res1 = ReportResult(
        report_id=rep1.id,
        raw_test_name="Hemoglobin",
        canonical_test_name="Hemoglobin",
        value="15.0",
        abnormality_flag="normal",
    )
    res2 = ReportResult(
        report_id=rep2.id,
        raw_test_name="Cholesterol",
        canonical_test_name="Total Cholesterol",
        value="190.0",
        abnormality_flag="normal",
    )
    rep3 = Report(
        user_id=user.id,
        original_filename="Failed_Scan.png",
        file_mime_type="image/png",
        status="failed",
    )
    db_session.add_all([res1, res2, rep3])
    db_session.commit()

    # 4. Fetch recent reports for user (failed report rep3 must be excluded)
    res = client.get(f"/api/v1/reports/users/{user.id}/recent")
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) == 2
    report_ids = [r["id"] for r in reports]
    assert str(rep1.id) in report_ids
    assert str(rep2.id) in report_ids
    assert str(rep3.id) not in report_ids
    
    cbc = next(r for r in reports if r["id"] == str(rep1.id))
    assert cbc["result_count"] == 1
    assert cbc["original_filename"] == "CBC_Report.pdf"

    # 5. Test editing/renaming report name
    rename_res = client.patch(
        f"/api/v1/reports/{rep1.id}/name",
        json={"original_filename": "Complete Blood Count 2026.pdf"},
    )
    assert rename_res.status_code == 200
    assert rename_res.json()["original_filename"] == "Complete Blood Count 2026.pdf"

    # Verify updated in get_recent
    res2 = client.get(f"/api/v1/reports/users/{user.id}/recent")
    updated_cbc = next(r for r in res2.json() if r["id"] == str(rep1.id))
    assert updated_cbc["original_filename"] == "Complete Blood Count 2026.pdf"


def test_same_date_duplicate_measurements(client, db_session):
    # 1. Create a user
    user = User(
        email="dup.user@test.com",
        password_hash="fakehash",
        full_name="Duplicate Test User",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # 2. Upload first manual report with Hemoglobin 14.5 and Glucose 95
    res1 = client.post(
        "/api/v1/reports/manual",
        json={
            "user_id": str(user.id),
            "original_filename": "Morning_Blood_Test.pdf",
            "results": [
                {"raw_test_name": "Hemoglobin", "value": "14.5", "unit": "g/dL"},
                {"raw_test_name": "Fasting Glucose", "value": "95", "unit": "mg/dL"},
            ],
        },
    )
    assert res1.status_code == 201
    rep1_id = res1.json()["report_id"]

    # 3. Upload second report ON THE SAME DATE with same Hemoglobin 14.5 (duplicate) and a new test Platelets 250
    res2 = client.post(
        "/api/v1/reports/manual",
        json={
            "user_id": str(user.id),
            "original_filename": "Afternoon_Blood_Test.pdf",
            "results": [
                {"raw_test_name": "Hemoglobin", "value": "14.5", "unit": "g/dL"},  # Same date & value duplicate
                {"raw_test_name": "Platelets", "value": "250", "unit": "x10^3/uL"}, # New test
            ],
        },
    )
    assert res2.status_code == 201
    rep2_id = res2.json()["report_id"]

    # 4. In Report History for rep2: Hemoglobin 14.5 IS shown in the results table
    rep2_results_res = client.get(f"/api/v1/reports/{rep2_id}/results")
    assert rep2_results_res.status_code == 200
    rep2_results = rep2_results_res.json()
    assert len(rep2_results) == 2  # Both measures are displayed in history

    hemo_dup = next(r for r in rep2_results if "hemoglobin" in r["raw_test_name"].lower())
    assert hemo_dup["is_duplicate_same_date"] is True  # Flagged as duplicate

    platelet_new = next(r for r in rep2_results if "platelet" in r["raw_test_name"].lower())
    assert platelet_new["is_duplicate_same_date"] is False

    # 5. In Longitudinal Trend Database Query: Hemoglobin on this date is NOT duplicated
    trend_res = client.get(f"/api/v1/reports/users/{user.id}/trend/Hemoglobin")
    assert trend_res.status_code == 200
    trend_data = trend_res.json()
    # Should only return 1 non-duplicate measurement in trend timeline for this date
    assert len(trend_data) == 1
    assert trend_data[0]["report_id"] == rep1_id


