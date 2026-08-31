"""
Standalone Model Testing Playground FastAPI Application.

Runs independently on http://localhost:8100
Completely decoupled from production GenHealth application, database, and auth.
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from hereditary_risk.model_test_server.schemas import (
    HealthResponse,
    ModelListResponse,
    PredictRequest,
    PredictResponse,
    ModelCompareRequest,
    ModelCompareResponse,
    PresetsListResponse,
    PresetCaseSchema,
)
from hereditary_risk.model_test_server.model_loader import (
    discover_and_load_all_models,
    get_all_model_metadata,
    get_model_artifact,
)
from hereditary_risk.model_test_server.predictor import run_playground_prediction
from hereditary_risk.model_test_server.test_fixtures import SYNTHETIC_PRESETS

# Initialize standalone FastAPI app
app = FastAPI(
    title="Hereditary ML Model Testing Playground API",
    description="Standalone testing playground for trained XGBoost disease risk models.",
    version="1.0.0",
)

# CORS Middleware (Restricted to local dev origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8100", "http://127.0.0.1:8100", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all local model artifacts into memory on startup
@app.on_event("startup")
def startup_load_models():
    models = discover_and_load_all_models()
    print(f"[ModelTestServer] Successfully loaded {len(models)} model artifacts on port 8100:")
    for d_key in models:
        print(f"  - {d_key}")


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Server health status endpoint."""
    models = discover_and_load_all_models()
    return HealthResponse(
        status="ok",
        models_loaded=len(models),
        loaded_diseases=list(models.keys()),
    )


@app.get("/api/models", response_model=ModelListResponse, tags=["Registry"])
def list_models():
    """List all available trained model artifacts and their feature schemas."""
    metadata_list = get_all_model_metadata()
    return ModelListResponse(
        status="ok",
        models_count=len(metadata_list),
        models=metadata_list,
    )


@app.get("/api/presets", response_model=PresetsListResponse, tags=["Registry"])
def list_presets():
    """List synthetic preset test cases for manual playground testing."""
    return PresetsListResponse(
        presets=[PresetCaseSchema(**preset) for preset in SYNTHETIC_PRESETS]
    )


@app.post("/api/predict", response_model=PredictResponse, tags=["Inference"])
def predict(req: PredictRequest):
    """
    Run model prediction for a target disease using provided feature dictionary.
    """
    try:
        res = run_playground_prediction(req.disease, req.features)
        return res
    except ValueError as val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(val_err),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference processing error: {str(exc)}",
        )


@app.post("/api/compare", response_model=ModelCompareResponse, tags=["Inference"])
def compare_models(req: ModelCompareRequest):
    """
    Side-by-side model prediction comparison for compatible feature sets.
    """
    try:
        res_a = run_playground_prediction(req.disease_a, req.features)
        res_b = run_playground_prediction(req.disease_b, req.features)

        feats_a = set(res_a.features.keys())
        feats_b = set(res_b.features.keys())
        common_feats = sorted(list(feats_a.intersection(feats_b)))

        return ModelCompareResponse(
            disease_a=res_a,
            disease_b=res_b,
            comparable_features=common_feats,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Comparison execution error: {str(exc)}",
        )


# Serve Static HTML Playground Interface
HTML_FILE_PATH = os.path.join(os.path.dirname(__file__), "model-test.html")

@app.get("/", response_class=HTMLResponse, tags=["Playground UI"])
@app.get("/playground", response_class=HTMLResponse, tags=["Playground UI"])
def get_playground_ui():
    """Serve the standalone HTML Model Testing Playground UI."""
    if not os.path.exists(HTML_FILE_PATH):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="model-test.html file not found.",
        )
    with open(HTML_FILE_PATH, "r", encoding="utf-8") as f:
        html_content = f.read()
    return HTMLResponse(content=html_content)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("hereditary_risk.model_test_server.app:app", host="127.0.0.1", port=8100, reload=True)
