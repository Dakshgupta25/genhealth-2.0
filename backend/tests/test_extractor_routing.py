"""
Unit tests for multi-model extractor routing (Gemini vs Qwen-VL) in the pipeline orchestrator.
"""

import uuid
from unittest.mock import patch
from app.models.user import User
from app.pipeline.orchestrator import run_pipeline


@patch("app.pipeline.gemini_extractor.extract")
def test_run_pipeline_routes_to_gemini(mock_gemini, db_session, tmp_path):
    test_user = User(
        id=uuid.uuid4(),
        email="test_gemini@genhealth.dev",
        password_hash="mock-hash",
        full_name="Test User",
        role="patient",
    )
    db_session.add(test_user)
    db_session.commit()

    mock_gemini.return_value = {
        "parsed": {
            "tables": [
                {
                    "test_name": "Hemoglobin",
                    "value": "15.0",
                    "unit": "g/dL",
                    "reference_range": "13.0-17.0",
                }
            ],
            "narrative": [],
        },
        "raw_text": '{"tables": [{"test_name": "Hemoglobin", "value": "15.0"}]}',
        "model": "gemini-2.5-flash",
        "error": None,
    }

    dummy_file = tmp_path / "report.png"
    dummy_file.write_bytes(b"dummy")

    result = run_pipeline(
        file_path=dummy_file,
        user_id=test_user.id,
        original_filename="report.png",
        mime_type="image/png",
        db=db_session,
        extractor_type="gemini",
    )

    assert mock_gemini.called
    assert result["status"] == "done"
    assert result["result_count"] == 1
    assert result["model_used"] == "gemini-2.5-flash"


@patch("app.pipeline.ollama_extractor.extract")
def test_run_pipeline_routes_to_qwen(mock_qwen, db_session, tmp_path):
    test_user = User(
        id=uuid.uuid4(),
        email="test_qwen@genhealth.dev",
        password_hash="mock-hash",
        full_name="Test User",
        role="patient",
    )
    db_session.add(test_user)
    db_session.commit()

    mock_qwen.return_value = {
        "parsed": {
            "tables": [
                {
                    "test_name": "Glucose",
                    "value": "95",
                    "unit": "mg/dL",
                    "reference_range": "70-99",
                }
            ],
            "narrative": [],
        },
        "raw_text": '{"tables": [{"test_name": "Glucose", "value": "95"}]}',
        "model": "qwen2.5vl:7b",
        "error": None,
    }

    dummy_file = tmp_path / "report.png"
    dummy_file.write_bytes(b"dummy")

    result = run_pipeline(
        file_path=dummy_file,
        user_id=test_user.id,
        original_filename="report.png",
        mime_type="image/png",
        db=db_session,
        extractor_type="qwen",
    )

    assert mock_qwen.called
    assert result["status"] == "done"
    assert result["result_count"] == 1
    assert result["model_used"] == "qwen2.5vl:7b"
