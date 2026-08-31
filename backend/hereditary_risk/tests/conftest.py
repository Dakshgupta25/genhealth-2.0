"""
Pytest configuration and shared fixtures for the Hereditary Risk Module tests.
"""

import sys
from pathlib import Path
import pytest

# Add backend directory to sys.path so 'hereditary_risk.app' package is fully resolvable
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture(autouse=True)
def configure_default_test_api_key(monkeypatch):
    """Ensure standalone API key is set for test suites by default."""
    from hereditary_risk.app.config.settings import settings
    monkeypatch.setattr(settings, "HEREDITARY_RISK_API_KEY", "test-api-key")


@pytest.fixture
def synthetic_raw_biomarkers():
    """Synthetic raw lab report test data fixture."""
    return [
        {"raw_name": "HbA1c", "value": "5.8", "unit": "%"},
        {"raw_name": "hb a1c", "value": "7.2", "unit": "%"},
        {"raw_name": "Glycated Haemoglobin", "value": 6.1, "unit": "%"},
        {"raw_name": "Fast Blood Glucose", "value": "> 126", "unit": "mg/dL"},
        {"raw_name": "FBS", "value": "102.5", "unit": "mg/dL"},
        {"raw_name": "S. Creatinine", "value": "1.4", "unit": "mg/dL"},
        {"raw_name": "SGPT (ALT)", "value": "45", "unit": "U/L"},
        {"raw_name": "TSH", "value": "5.2", "unit": "mIU/L"},
        {"raw_name": "Unknown Laboratory Test 99", "value": "10.0", "unit": "units"},
    ]
