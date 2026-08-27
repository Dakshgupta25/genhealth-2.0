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

    # 3. Add measurements to rep1
    res1 = ReportResult(
        report_id=rep1.id,
        raw_test_name="Hemoglobin",
        canonical_test_name="Hemoglobin",
        value="15.0",
        abnormality_flag="normal",
    )
    db_session.add(res1)
    db_session.commit()

    # 4. Fetch recent reports for user
    res = client.get(f"/api/v1/reports/users/{user.id}/recent")
    assert res.status_code == 200
    reports = res.json()
    assert len(reports) == 2
    assert reports[0]["id"] in [str(rep1.id), str(rep2.id)]
    
    cbc = next(r for r in reports if r["id"] == str(rep1.id))
    assert cbc["result_count"] == 1
    assert cbc["original_filename"] == "CBC_Report.pdf"
