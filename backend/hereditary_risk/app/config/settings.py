"""
Module Settings using pydantic-settings.
Centralized configuration for the Hereditary Disease Prediction Engine.
"""

import os
from pathlib import Path
from typing import Optional, List
from pydantic_settings import BaseSettings, SettingsConfigDict


class HereditaryRiskSettings(BaseSettings):
    # API & Execution (Default bound strictly to localhost)
    HEREDITARY_RISK_HOST: str = "127.0.0.1"
    HEREDITARY_RISK_PORT: int = 8001
    LOG_LEVEL: str = "INFO"
    
    # Security & Access Control
    HEREDITARY_RISK_API_KEY: Optional[str] = None
    ALLOWED_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]
    
    # Secrets & External Services
    GEMINI_API_KEY: str = ""
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    MODELS_DIR: Path = Path(__file__).resolve().parent.parent.parent / "models"
    DATA_DIR: Path = Path(__file__).resolve().parent.parent.parent / "data"
    
    # Risk Classification Cutoffs
    RISK_THRESHOLD_LOW: float = 0.33
    RISK_THRESHOLD_HIGH: float = 0.66
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = HereditaryRiskSettings()
