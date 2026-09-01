"""
Unit tests for the local Ollama Qwen-VL document extractor (Stage 1).
"""

import json
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
import httpx

from app.pipeline.ollama_extractor import (
    _clean_json_text,
    _detect_mime_type,
    extract,
)


def test_clean_json_text_strips_markdown_fences():
    raw_with_fences = """```json
{
  "tables": [
    {"test_name": "Hemoglobin", "value": "14.2", "unit": "g/dL", "reference_range": "12.0-16.0"}
  ],
  "narrative": [
    {"label": "Impression", "text": "Normal blood count."}
  ]
}
```"""
    cleaned = _clean_json_text(raw_with_fences)
    parsed = json.loads(cleaned)
    assert "tables" in parsed
    assert len(parsed["tables"]) == 1
    assert parsed["tables"][0]["test_name"] == "Hemoglobin"
    assert len(parsed["narrative"]) == 1


def test_clean_json_text_handles_raw_json():
    raw_json = '{"tables": [], "narrative": []}'
    cleaned = _clean_json_text(raw_json)
    parsed = json.loads(cleaned)
    assert parsed == {"tables": [], "narrative": []}


def test_detect_mime_type():
    assert _detect_mime_type(Path("report.pdf")) == "application/pdf"
    assert _detect_mime_type(Path("scan.png")) == "image/png"
    assert _detect_mime_type(Path("photo.jpeg")) == "image/jpeg"
    assert _detect_mime_type(Path("photo.jpg")) == "image/jpeg"
    assert _detect_mime_type(Path("doc.unknown")) == "image/jpeg"


def test_extract_file_not_found():
    with pytest.raises(FileNotFoundError):
        extract("non_existent_file_path_12345.png")


@patch("app.pipeline.ollama_extractor._call_ollama_api")
def test_extract_mocked_single_image_success(mock_call_api, tmp_path):
    # Create a temporary dummy image file
    dummy_img = tmp_path / "test_report.png"
    dummy_img.write_bytes(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR...")

    mock_call_api.return_value = json.dumps({
        "tables": [
            {
                "test_name": "Fasting Blood Glucose",
                "value": "105",
                "unit": "mg/dL",
                "reference_range": "70-99",
            }
        ],
        "narrative": [
            {
                "label": "Doctor Notes",
                "text": "Mild impaired fasting glucose.",
            }
        ],
    })

    result = extract(dummy_img)
    assert result["error"] is None
    assert result["parsed"] is not None
    assert len(result["parsed"]["tables"]) == 1
    assert result["parsed"]["tables"][0]["test_name"] == "Fasting Blood Glucose"
    assert len(result["parsed"]["narrative"]) == 1


@patch("app.pipeline.ollama_extractor.httpx.Client")
def test_extract_ollama_offline_error_handling(mock_client_class, tmp_path):
    dummy_img = tmp_path / "test_report.png"
    dummy_img.write_bytes(b"dummy image bytes")

    # Mock connection error to simulate Ollama not running
    mock_client = MagicMock()
    mock_client.post.side_effect = httpx.ConnectError("Connection refused")
    mock_client.__enter__.return_value = mock_client
    mock_client_class.return_value = mock_client

    result = extract(dummy_img)
    assert result["parsed"] is None
    assert result["error"] is not None
    assert "Could not connect to Ollama" in result["error"]
