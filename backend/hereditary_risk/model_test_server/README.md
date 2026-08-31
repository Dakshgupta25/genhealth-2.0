# Standalone Hereditary ML Model Testing Playground

An isolated, browser-based model inspection and testing laboratory for the trained hereditary-risk `.joblib` / `.pkl` XGBoost models.

> **Disclaimer:** This test playground is a local development and inspection tool. It is **NOT** part of the production GenHealth 2.0 application or database. It operates directly on local trained model artifacts.

---

## 1. Features & Capabilities

- **Zero Production Coupling:** Does NOT import GenHealth database models, authentication, patient records, or production routers.
- **Dynamic Model Discovery:** Automatically discovers all trained `.joblib` model artifacts in `backend/hereditary_risk/app/ml/models/`.
- **Dynamic Input Schema Generation:** Generates HTML input forms dynamically based on the exact feature list and ordering of the selected model.
- **Direct XGBoost Inference:** Computes raw model output probabilities and binary decision classes (0 / 1).
- **SHAP Feature Importance & Contributions:** Exposes feature impact directions (`increases_risk`, `decreases_risk`, `neutral`) via SHAP Tree Explainer or tree feature importance fallbacks.
- **Synthetic Test Presets:** Pre-configured test cases (Low Risk, Borderline, High Risk, Extreme Values) for quick manual testing.
- **Extreme & Edge Value Validation:** Enforces physiological plausibility bounds and input sanitization.
- **Direct Python vs. HTTP Inference Equality:** Validated with 100% numerical reproducibility ($< 10^{-6}$ tolerance).

---

## 2. Architecture Overview

```text
┌───────────────────────────────────────────────────────────┐
│                    Standalone HTML UI                     │
│                    (model-test.html)                      │
└─────────────────────────────┬─────────────────────────────┘
                              │ HTTP GET / POST
                              ▼
┌───────────────────────────────────────────────────────────┐
│            Isolated FastAPI Test Server (8100)            │
│               (model_test_server/app.py)                  │
└─────────────────────────────┬─────────────────────────────┘
                              │ Safe Model Loader & Predictor
                              ▼
┌───────────────────────────────────────────────────────────┐
│            Trained .joblib Model Artifacts                │
│       (backend/hereditary_risk/app/ml/models/*.joblib)    │
└───────────────────────────────────────────────────────────┘
```

---

## 3. How to Start the Test Server & Open the UI

### Option A: Run via Python CLI
```powershell
cd backend
python -m uvicorn hereditary_risk.model_test_server.app:app --host 127.0.0.1 --port 8100 --reload
```

### Option B: Access via Browser
Once running, open your browser at:
- **Playground HTML UI:** [http://127.0.0.1:8100/playground](http://127.0.0.1:8100/playground)
- **API Health Check:** [http://127.0.0.1:8100/health](http://127.0.0.1:8100/health)
- **Interactive Swagger Docs:** [http://127.0.0.1:8100/docs](http://127.0.0.1:8100/docs)

---

## 4. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Returns server health status and list of loaded model keys. |
| `GET` | `/api/models` | Returns registry metadata and feature schemas for all loaded models. |
| `GET` | `/api/presets` | Returns pre-defined synthetic test cases for manual testing. |
| `POST` | `/api/predict` | Executes prediction and SHAP explanation for a given disease and feature dictionary. |
| `POST` | `/api/compare` | Compares two models or feature sets side-by-side. |
| `GET` | `/playground` | Serves the standalone single-page HTML test interface (`model-test.html`). |

---

## 5. How to Run Automated Tests

To run the dedicated playground test suite:

```powershell
cd backend
python -m pytest hereditary_risk/model_test_server/test_server.py -v
```

This verifies:
1. Server health check and model loading.
2. Model schema discovery.
3. Valid inference execution.
4. Input validation & extreme value bounds checking.
5. Direct Python vs. HTTP API inference equality ($< 10^{-6}$ error).
