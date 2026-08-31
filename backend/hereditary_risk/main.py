"""
Hereditary Risk Engine — Standalone FastAPI entry point.

Run independently (development):
    cd backend/hereditary_risk
    uvicorn main:app --reload --port 8001

Future GenHealth integration (one-line change in backend/app/main.py):
    from hereditary_risk.app.api.routes import router as hereditary_router
    app.include_router(hereditary_router)
"""

import sys
import logging
from pathlib import Path

# Add backend directory to sys.path so 'hereditary_risk' package is resolvable
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from hereditary_risk.app.api.routes import router
from hereditary_risk.app.config.settings import settings

logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("hereditary_risk")

app = FastAPI(
    title="GenHealth — Hereditary Risk Engine",
    description=(
        "Self-contained family-weighted biomarker disease risk prediction service. "
        "Accepts normalized biomarker data for a patient and family members, "
        "applies clinical rule thresholds, kinship-weighted aggregation, XGBoost ML, "
        "SHAP explainability, and Gemini LLM narrative generation."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def verify_standalone_auth_config():
    if not settings.HEREDITARY_RISK_API_KEY:
        logger.warning(
            "HEREDITARY_RISK_API_KEY is not configured. Standalone API endpoints will reject requests with HTTP 503 (fail-closed mode)."
        )


@app.get("/", tags=["Health"])
def root() -> dict:
    return {
        "service": "Hereditary Risk Engine",
        "status": "online",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HEREDITARY_RISK_HOST,
        port=settings.HEREDITARY_RISK_PORT,
        reload=True,
        log_level=settings.LOG_LEVEL.lower(),
    )
