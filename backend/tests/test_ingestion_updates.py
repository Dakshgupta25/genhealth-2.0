import pytest
from app.models.user import User
from app.models.report import Report


def test_manual_report_creation_and_normalization(client, db_session):
    # 1. Create a user
    user = User(
        email="patient.manual@test.com",
        password_hash="fakehash",
        full_name="Manual Test Patient",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    user_id = str(user.id)

    # 2. Post manual measurements
    payload = {
        "user_id": user_id,
        "original_filename": "Routine Checkup",
        "results": [
            {
                "raw_test_name": "Hemoglobin",
                "value": "14.5",
                "unit": "g/dL",
                "reference_range": "13.0-17.0",
            },
            {
                "raw_test_name": "Fasting Blood Sugar",
                "value": "180",
                "unit": "mg/dL",
                "reference_range": "70-99",
            },
        ],
    }
    response = client.post("/api/v1/reports/manual", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "done"
    assert data["result_count"] == 2
    report_id = data["report_id"]

    # 3. Verify extracted results via GET
    get_res = client.get(f"/api/v1/reports/{report_id}/results")
    assert get_res.status_code == 200
    results = get_res.json()
    assert len(results) == 2
    
    # Hemoglobin check
    hb = next(r for r in results if "Hemoglobin" in r["raw_test_name"])
    assert hb["canonical_test_name"] == "Hemoglobin"
    assert hb["abnormality_flag"] == "normal"
    assert hb["numeric_value"] == 14.5

    # Blood sugar check (180 is high for 70-99)
    glu = next(r for r in results if "Sugar" in r["raw_test_name"])
    assert glu["abnormality_flag"] == "high"


def test_update_report_results(client, db_session):
    # 1. Create user and initial report
    user = User(
        email="patient.update@test.com",
        password_hash="fakehash",
        full_name="Update Test Patient",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    report = Report(
        user_id=user.id,
        original_filename="Initial Lab.pdf",
        file_mime_type="application/pdf",
        status="done",
    )
    db_session.add(report)
    db_session.commit()
    db_session.refresh(report)
    report_id = str(report.id)

    # 2. Update/replace results for this report
    update_payload = {
        "results": [
            {
                "raw_test_name": "Total Cholesterol",
                "value": "240",
                "unit": "mg/dL",
                "reference_range": "< 200",
            },
            {
                "raw_test_name": "Platelet Count",
                "value": "250000",
                "unit": "/uL",
                "reference_range": "150000 - 450000",
            },
        ]
    }
    put_res = client.put(f"/api/v1/reports/{report_id}/results", json=update_payload)
    assert put_res.status_code == 200
    updated_items = put_res.json()
    assert len(updated_items) == 2

    # Check updated results
    chol = next(r for r in updated_items if "Cholesterol" in r["raw_test_name"])
    assert chol["abnormality_flag"] == "high"
    assert chol["canonical_test_name"] == "Total Cholesterol"


def test_delete_report_and_extracted_measurements(client, db_session):
    # 1. Create a user
    user = User(
        email="patient.delete@test.com",
        password_hash="fakehash",
        full_name="Delete Test Patient",
        role="patient",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # 2. Create manual report with measurements
    payload = {
        "user_id": str(user.id),
        "original_filename": "Report To Delete.pdf",
        "results": [
            {
                "raw_test_name": "Hemoglobin",
                "value": "13.8",
                "unit": "g/dL",
                "reference_range": "13.0-17.0",
            },
        ],
    }
    create_res = client.post("/api/v1/reports/manual", json=payload)
    assert create_res.status_code == 201
    report_id = create_res.json()["report_id"]

    # 3. Confirm measurements exist
    res_before = client.get(f"/api/v1/reports/{report_id}/results")
    assert res_before.status_code == 200
    assert len(res_before.json()) == 1

    # 4. Delete the report
    del_res = client.delete(f"/api/v1/reports/{report_id}")
    assert del_res.status_code == 200
    assert "permanently deleted" in del_res.json()["message"]

    # 5. Verify report and measurements are gone
    res_after = client.get(f"/api/v1/reports/{report_id}/results")
    assert res_after.status_code == 404
