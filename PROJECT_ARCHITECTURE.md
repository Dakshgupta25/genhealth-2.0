# GenHealth 2.0 — Complete Project Architecture

## 1. Project Overview

**GenHealth 2.0** is an enterprise-grade AI-powered clinical analytics and health intelligence platform designed to extract, synthesize, analyze, and present multi-modal patient data. It combines automated OCR lab report ingestion, canonical biomarker normalization, clinical threshold evaluation, multi-generational hereditary risk prediction, and LLM-powered narrative clinical summaries.

### Main Technical Components
1. **Core Host Application (`backend/app`)**:
   - **User & Authentication**: Provides user session management, JWT authentication (`HS256`), password hashing, and patient access control.
   - **Clinical Data Ingestion**: Processes lab reports via OCR, normalizes raw test names to standard canonical key definitions (and LOINC codes), and stores structured numerical measurements in SQLite/PostgreSQL database tables.
   - **Family & Consent Architecture**: Manages relative links (parents, siblings, extended family, spouses) and enforces clinical data sharing consent policies (`share_clinical_data`) alongside managed placeholder profiles for non-registered relatives.
   - **Patient Dashboard & Frontend (`frontend`)**: Modern React SPA powered by Vite, TailwindCSS, and Axios with custom interceptors for JWT Bearer token propagation.

2. **Hereditary Risk Engine (`backend/hereditary_risk`)**:
   - A standalone, modular 4-layer engine designed for patient hereditary disease risk estimation.
   - Operates statelessly: receives authenticated patient lab history, family member relationships, and consenting relative lab histories, and produces multi-dimensional disease risk assessments.
   - Integrates with host endpoints via `backend/app/adapters/hereditary_adapter.py`.

### Relationship Between Host Application & Hereditary Risk Engine
The **Hereditary Risk Engine** operates as an isolated, self-contained sub-system mounted under `/api/v1/hereditary-risk/` in the host FastAPI application. 

```
┌────────────────────────────────────────────────────────────────────────┐
│                        GenHealth Host Application                      │
│                                                                        │
│  ┌───────────────────┐     ┌───────────────────┐     ┌──────────────┐  │
│  │ User Auth (JWT)   │     │ Lab Report OCR    │     │ Family DB    │  │
│  └─────────┬─────────┘     └─────────┬─────────┘     └──────┬───────┘  │
│            │                         │                      │          │
│            └─────────────────────────┼──────────────────────┘          │
│                                      ▼                                 │
│                     ┌─────────────────────────────────┐                │
│                     │  Integration Adapter Layer      │                │
│                     │  (hereditary_adapter.py)        │                │
│                     └────────────────┬────────────────┘                │
└──────────────────────────────────────┼─────────────────────────────────┘
                                       ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Hereditary Risk Engine                          │
│                                                                        │
│  ┌─────────────────┐ ┌─────────────────┐ ┌───────────┐ ┌────────────┐  │
│  │ Layer 1:        │ │ Layer 2:        │ │ Layer 3:  │ │ Layer 4:   │  │
│  │ Biomarker Norm. │ │ Rules + Kinship │ │ XGBoost   │ │ Gemini LLM │  │
│  └─────────────────┘ └─────────────────┘ └───────────┘ └────────────┘  │
└────────────────────────────────────────────────────────────────────────┘
```

The host application controls persistence, authentication, authorization, and database state. The hereditary engine computes risk signals statelessly on request, ensuring zero database pollution while making evidence-based clinical risk signals accessible to clinicians and patients.

---

## 2. Technology Stack

### Backend
* **Language**: Python 3.12+
* **Framework**: FastAPI (v0.110+) / Starlette / Uvicorn
* **Database / ORM**: SQLite (Development) / PostgreSQL (Production) via SQLAlchemy 2.0+
* **Authentication**: PyJWT (JSON Web Tokens with `HS256` signing), Passlib / Bcrypt password hashing
* **Validation & Schemas**: Pydantic v2.0+

### Machine Learning & Data Science
* **Runtime**: Python 3.12+
* **Gradient Boosting**: XGBoost (v2.0+)
* **Data Processing**: Pandas, NumPy
* **Model Evaluation & Calibration**: Scikit-Learn (v1.4+), `CalibratedClassifierCV` (Isotonic & Sigmoid regression)
* **Model Explainability**: SHAP (SHapley Additive exPlanations, `TreeExplainer`)
* **Model Serialization**: Joblib (v1.3+) with MD5 checksum provenance metadata
* **Generative AI**: Google Gemini API (`google.generativeai` SDK)

### Frontend
* **UI Framework**: React 18+
* **Build System**: Vite 5+
* **HTTP Client**: Axios (configured with automated JWT Bearer request interceptors)
* **Styling**: Vanilla CSS + TailwindCSS, responsive design with dark mode support
* **Icons / Assets**: Lucide React / Custom SVG iconography

---

## 3. Repository Structure

```
genhealth-2.0-main/
├── backend/
│   ├── app/                                  # Host GenHealth Application Core
│   │   ├── adapters/                         # Integration Adapters
│   │   │   └── hereditary_adapter.py         # DB-to-Engine Integration Adapter (N+1 optimized)
│   │   ├── dependencies/                     # FastAPI Router Dependencies
│   │   │   └── auth.py                       # JWT Auth & Patient Access Authorization (SEC-1)
│   │   ├── models/                           # SQLAlchemy Database Models
│   │   │   ├── user.py                       # User Model & Managed Placeholders
│   │   │   ├── report.py                     # Lab Report Uploads
│   │   │   ├── report_result.py              # Extracted OCR Lab Biomarker Results
│   │   │   └── family_relationship.py        # Pedigree Links & Consent Flags
│   │   ├── pipeline/                         # OCR & Biomarker Normalization
│   │   │   ├── normalizer.py                 # String matching & LOINC lookup dictionary
│   │   │   └── lab_normalizer_lookup.json    # Dictionary of 100+ lab test aliases
│   │   ├── routers/                          # Host FastAPI API Routers
│   │   │   ├── auth.py                       # User Signup & JWT Login Routes
│   │   │   ├── clinical.py                   # Clinical Assessment Routes
│   │   │   ├── family.py                     # Family Pedigree Management Routes
│   │   │   └── hereditary.py                 # Mounted Hereditary Risk Endpoint Router
│   │   ├── database.py                       # Database Engine & Session Initialization
│   │   └── main.py                           # Host Application Entrypoint & App Mount
│   │
│   ├── hereditary_risk/                      # Standalone Hereditary Risk Engine Module
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── routes.py                 # Engine API Endpoints & Request Orchestrator
│   │   │   │   └── schemas.py                # Pydantic Schemas for Requests & Responses
│   │   │   ├── config/
│   │   │   │   └── disease_config.py         # Disease Registry & Diagnostic Thresholds
│   │   │   ├── ml/
│   │   │   │   ├── datasets/                 # Clinical Dataset Ingestion & Caching
│   │   │   │   │   ├── cache/                # Local CSV Cache Directory
│   │   │   │   │   └── dataset_manifest.py   # Dataset Manifest, Retries, MD5 Provenance
│   │   │   │   ├── models/                   # Serialized Joblib XGBoost Artifacts
│   │   │   │   │   ├── anemia_model.joblib
│   │   │   │   │   ├── ckd_model.joblib
│   │   │   │   │   ├── dyslipidemia_model.joblib
│   │   │   │   │   ├── hypothyroidism_model.joblib
│   │   │   │   │   ├── liver_disease_model.joblib
│   │   │   │   │   └── type_2_diabetes_model.joblib
│   │   │   │   ├── train_models.py           # 3-Way Split Model Training & Calibration Script
│   │   │   │   ├── xgb_engine.py             # Inference Orchestrator & Median Imputation
│   │   │   │   └── shap_explainer.py         # SHAP TreeExplainer & Fallback Attributions
│   │   │   ├── narrative/
│   │   │   │   └── gemini_narrative.py       # Grounded LLM Clinical Narrative Generator
│   │   │   ├── normalization/
│   │   │   │   └── value_normalizer.py       # Unit Conversion & Numeric Extraction
│   │   │   └── rules/
│   │   │       ├── clinical_rule_engine.py   # Layer 2 Diagnostic Threshold Rules
│   │   │       └── kinship_model.py          # Layer 2B Wright's Kinship Weighting
│   │   ├── model_test_server/                # Standalone Isolated Model Testing Playground
│   │   │   ├── app.py                        # Standalone Playground FastAPI Server
│   │   │   ├── index.html                    # Single-Page Browser Testing Interface
│   │   │   └── README.md                     # Playground Documentation
│   │   └── tests/                            # Unit Test Suite for Engine Layers
│   │
│   ├── tests/                                # Host Integration & Security Tests
│   └── test_canonical_fix.py                 # Normalizer Regression Test Suite
│
├── frontend/                                 # GenHealth React Single Page Application
│   ├── src/
│   │   ├── api/
│   │   │   └── client.js                     # Axios Client with JWT Token Interceptor
│   │   ├── components/
│   │   │   └── hereditary/
│   │   │       └── HereditaryRiskPanel.jsx   # Main Hereditary Risk UI Component
│   │   ├── pages/                            # Patient Dashboard & Login Views
│   │   └── App.jsx                           # Application Router & Layout
│   ├── package.json                          # Frontend Dependencies & Build Scripts
│   └── README.md                             # Vite Application Documentation
│
├── PROJECT_ARCHITECTURE.md                   # Master Complete Project Documentation
├── README.md                                 # Root Repository Overview
└── requirements.txt                          # Python Package Dependencies
```

---

## 4. Overall System Architecture

```
User (Browser)
     │
     ▼
React 18 Frontend SPA (Vite)
     │  HTTP GET / POST with Authorization: Bearer <JWT>
     ▼
FastAPI Host Application (backend/app/main.py)
     │
     ├─► Security Layer (auth.py) ──► Validates JWT & Patient Access Authorization
     │
     └─► Host Router (routers/hereditary.py)
           │
           ▼
Integration Adapter (adapters/hereditary_adapter.py)
     │
     ├─► Query Host DB: Patient User Record & Lab Report Results (ReportResult)
     ├─► Query Host DB: Consenting Relatives & Single Batch Lab Measurements (No N+1)
     │
     ▼
Hereditary Risk Engine API (hereditary_risk/app/api/routes.py)
     │
     ├──► Layer 1: Biomarker Normalization (value_normalizer.py)
     │      │ Unit standardization, numeric coercion & canonical key mapping
     │      ▼
     ├──► Layer 2: Clinical Diagnostic Rules (clinical_rule_engine.py)
     │      │ Threshold evaluation (NORMAL, ELEVATED, HIGH, CRITICAL) ──► rule_based_risk_score
     │      ▼
     ├──► Layer 2B: Wright Kinship Aggregation (kinship_model.py)
     │      │ Kinship coefficient weighting (Father=0.5, Sibling=0.5, etc.) ──► family_weighted_risk
     │      ▼
     ├──► Layer 3: XGBoost ML Inference (xgb_engine.py)
     │      │ Median feature imputation & model execution ──► ml_probability_estimate
     │      ├─► Calibration Metadata Check (Isotonic / Sigmoid / Uncalibrated)
     │      └─► Explainability Engine (shap_explainer.py) ──► SHAP Attributions
     │      ▼
     ├──► Disagreement Evaluator (routes.py)
     │      │ Detects Rule/Family vs ML disparity ──► rule_ml_disagreement (bool)
     │      ▼
     └──► Layer 4: Gemini LLM Narrative (gemini_narrative.py)
            │ Grounded prompt synthesis ──► Clinical Narrative & Action Steps
            ▼
Hereditary Risk Assessment Response JSON
     │
     ▼
React Frontend Rendering (HereditaryRiskPanel.jsx)
```

### Flow Component Descriptions
1. **Frontend Request**: User interacts with `HereditaryRiskPanel.jsx`. Axios sends `GET /api/v1/hereditary-risk/patient/{user_id}/assessment`.
2. **Security Gateway**: FastAPI dependency `get_current_user` decodes the Bearer token. `authorize_patient_access` verifies that the caller owns `{user_id}` or manages `{user_id}` as a placeholder profile.
3. **Database Extraction**: `hereditary_adapter.py` queries `ReportResult` for the patient and performs a single batch query across all consenting family members (`share_clinical_data == True`).
4. **Engine Request**: Formats inputs into `HereditaryRiskAssessmentRequest` and invokes `predict_hereditary_risk()`.
5. **Layer 1 Processing**: `value_normalizer.py` converts lab units (e.g. `mmol/L` to `mg/dL`) and extracts numeric values.
6. **Layer 2 & 2B Evaluation**: `clinical_rule_engine.py` evaluates clinical rules; `kinship_model.py` weights relative disease scores by Wright coefficients.
7. **Layer 3 ML Inference**: `xgb_engine.py` executes the trained XGBoost `.joblib` model for each disease. Imputes missing features using population medians and extracts SHAP feature attributions.
8. **Disagreement Detection**: Compares rule/family risk signals against ML probability estimates to flag clinical disagreements.
9. **Layer 4 Narrative Synthesis**: `gemini_narrative.py` formats grounded prompt parameters for Google Gemini to generate human-readable patient explanations and action plans.
10. **Response & UI Render**: Returns `HereditaryRiskAssessmentResponse` JSON. Frontend displays risk cards, badges, SHAP attributions, and disagreement warnings.

---

## 5. Request Lifecycle

The detailed sequence of a complete assessment request:

```
[Client] ──1. GET /assessment (Bearer JWT)──► [FastAPI Router: routers/hereditary.py]
                                                   │
                                                   ▼ 2. Validate Token & Patient ID
                                              [auth.py: authorize_patient_access]
                                                   │
                                                   ▼ 3. Retrieve Patient & Lab History
                                              [hereditary_adapter.py]
                                                   │
                                                   ├──► SQL: SELECT * FROM report_results WHERE user_id = :patient_id
                                                   │
                                                   ▼ 4. Retrieve Consenting Relatives (Batch Query)
                                              [hereditary_adapter.py]
                                                   │
                                                   ├──► SQL: SELECT * FROM family_relationships WHERE user_id = :patient_id
                                                   ├──► SQL: SELECT * FROM report_results WHERE user_id IN (:relative_ids)
                                                   │
                                                   ▼ 5. Construct Engine Payload
                                              [hereditary_adapter.py]
                                                   │
                                                   ▼ 6. Execute 4-Layer Engine
                                              [routes.py: predict_hereditary_risk]
                                                   │
                                                   ├──► Layer 1: Normalizer (value_normalizer.py)
                                                   ├──► Layer 2: Diagnostic Rules (clinical_rule_engine.py)
                                                   ├──► Layer 2B: Kinship Model (kinship_model.py)
                                                   ├──► Layer 3: XGBoost ML Engine (xgb_engine.py)
                                                   │      ├── Impute Medians
                                                   │      ├── Predict Probability
                                                   │      └── Run SHAP (shap_explainer.py)
                                                   ├──► Disagreement Evaluator
                                                   └──► Layer 4: Narrative Generator (gemini_narrative.py)
                                                   │
                                                   ▼ 7. Serialize Response & Return JSON
                                              [Client: HereditaryRiskPanel.jsx]
```

---

## 6. Authentication & Authorization

### Authentication Architecture (SEC-1)
Authentication uses standard **JSON Web Tokens (JWT)**:
* **Token Creation**: On successful `/api/v1/auth/login` or `/api/v1/auth/signup`, the backend issues a signed JWT containing `{"sub": "<user_id>", "exp": <timestamp>}`.
* **Token Storage**: The frontend stores the token in `localStorage` (`access_token`).
* **Token Propagation**: `frontend/src/api/client.js` attaches an Axios interceptor:
  ```javascript
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  ```

### Authorization Architecture (IDOR Prevention)
Protected endpoints in `backend/app/routers/hereditary.py` enforce authorization:
```python
@router.get("/patient/{user_id}/assessment")
def get_patient_hereditary_assessment(
    user_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    authorize_patient_access(current_user, user_id, db)
    return evaluate_patient_hereditary_risk_adapter(db, user_id)
```
`authorize_patient_access` checks:
1. `current_user.id == user_id` (Owner access) **OR**
2. Target user is a managed placeholder profile where `target_user.is_placeholder == True` and `target_user.managed_by_user_id == current_user.id` (Manager access).
3. If neither condition is met, FastAPI immediately raises `HTTPException(status_code=403, detail="Forbidden: You are not authorized to access clinical data for this patient.")`.
4. If no `Authorization` header is provided, `get_current_user` raises `HTTPException(status_code=401, detail="Authentication required")`.

---

## 7. Database Architecture

The host application utilizes SQLAlchemy ORM backed by SQLite (development) or PostgreSQL (production).

```
┌─────────────────────────┐         ┌─────────────────────────┐
│          User           │         │   FamilyRelationship    │
├─────────────────────────┤         ├─────────────────────────┤
│ id (UUID, PK)           │◄───────┐│ id (UUID, PK)           │
│ email (String, Unique)  │        ││ user_id (UUID, FK)      │
│ password_hash (String)  │        ├│ relative_user_id (UUID) │
│ full_name (String)      │        ││ relationship_type (Str) │
│ is_placeholder (Bool)   │        ││ share_clinical_data(Bool│
│ managed_by_user_id (FK) ├────────┘└─────────────────────────┘
└────────────┬────────────┘
             │ 1
             │
             │ N
┌────────────▼────────────┐         ┌─────────────────────────┐
│         Report          │         │      ReportResult       │
├─────────────────────────┤         ├─────────────────────────┤
│ id (UUID, PK)           │1       N│ id (UUID, PK)           │
│ user_id (UUID, FK)      ├────────►│ report_id (UUID, FK)    │
│ original_filename (Str) │         │ raw_test_name (String)  │
│ created_at (DateTime)   │         │ canonical_test_name(Str)│
└─────────────────────────┘         │ value (String)          │
                                    │ numeric_value (Float)   │
                                    │ unit (String)           │
                                    │ abnormality_flag (Str)  │
                                    └─────────────────────────┘
```

### Persistence Policy
* **Hereditary Risk Results are computed STATELESSLY.** Risk assessment scores, ML probabilities, and narratives are **not** written to database tables. This eliminates state corruption when models or clinical rules are updated.

---

## 8. OCR → Biomarker Pipeline

1. **OCR Extraction**: Lab report documents (PDFs, images) are parsed by the OCR pipeline to extract raw test name strings, text values, units, and reference ranges.
2. **Canonical Lookup Table**: Raw test names are normalized via `backend/app/pipeline/normalizer.py` against `lab_normalizer_lookup.json` containing 100+ aliases and LOINC codes.
3. **Biomarker Standardization**:

| Raw Test Alias Example | Canonical Key (`canonical_test_name`) | LOINC Code | Target Units |
|---|---|---|---|
| "Fasting Blood Sugar", "Glucose, Fasting" | `fasting_glucose` | `1558-6` | `mg/dL` |
| "Hemoglobin A1c", "HbA1c" | `hba1c` | `4548-4` | `%` |
| "Serum Cholesterol", "Cholesterol, Total" | `total_cholesterol` | `2093-3` | `mg/dL` |
| "Triglycerides" | `triglycerides` | `2571-8` | `mg/dL` |
| "TSH", "Thyroid Stimulating Hormone" | `tsh` | `3016-3` | `uIU/mL` |
| "Free T4", "FT4" | `free_t4` | `2276-4` | `ng/dL` |
| "Serum Creatinine" | `creatinine` | `2160-0` | `mg/dL` |
| "Blood Urea Nitrogen", "BUN" | `bun` | `3094-0` | `mg/dL` |
| "ALT", "SGPT" | `alt` | `1742-6` | `U/L` |
| "AST", "SGOT" | `ast` | `1920-8` | `U/L` |
| "Hemoglobin", "Hb", "HGB" | `hemoglobin` | `718-7` | `g/dL` |
| "MCV" | `mcv` | `787-2` | `fL` |

4. **Observed vs Imputed Handling**:
   - **Observed Features**: Measurements present in the patient's database record.
   - **Imputed Features**: Missing required ML inputs are imputed at inference time using verified population median constants (`POPULATION_MEDIANS` in `xgb_engine.py`). Imputed features are explicitly flagged in the response JSON and displayed as "Imputed" in the UI.

---

## 9. Hereditary Risk Engine Architecture

### Layer 1 — Biomarker Normalization (`value_normalizer.py`)
Converts raw string lab values into sanitized floats and applies unit conversion rules (e.g. `mmol/L` glucose $\rightarrow$ `mg/dL` by multiplying by 18.0182).

### Layer 2 — Clinical Rule Engine (`clinical_rule_engine.py`)
Evaluates deterministic medical logic. Computes `rule_based_risk_score` ($0.0 - 1.0$) based on lab abnormality flags and clinical threshold cutoffs.

### Layer 2B — Kinship Model (`kinship_model.py`)
Aggregates disease occurrence across blood relatives using Wright's Coefficient of Relationship. Computes `family_weighted_risk` ($0.0 - 1.0$).

### Layer 3 — XGBoost ML Engine (`xgb_engine.py`)
Executes calibrated XGBoost classifier models for each disease. Imputes missing features with median population constants and generates probability predictions (`ml_probability_estimate`).

### Layer 3B — Calibration Module
Ensures ML probability predictions represent genuine empirical risks. Uses `CalibratedClassifierCV` (`isotonic` or `sigmoid`).

### Layer 3C — SHAP Explainability Engine (`shap_explainer.py`)
Uses `shap.TreeExplainer` to calculate local feature attributions, explaining exactly which biomarkers increased or decreased the patient's predicted risk score.

### Layer 4 — Gemini LLM Narrative Layer (`gemini_narrative.py`)
Formulates clinical summaries and actionable recommendations using Google Gemini, grounded strictly by the structured outputs of Layers 1–3.

---

## 10. Clinical Rule Engine

Diagnostic threshold rules for supported disease categories:

| Disease Key | Primary Biomarkers | Normal Range | Elevated Threshold | High Threshold | Severe/Critical |
|---|---|---|---|---|---|
| `type_2_diabetes` | `fasting_glucose`, `hba1c` | Glucose $<100$, A1c $<5.7$ | Glucose $100-125$, A1c $5.7-6.4$ | Glucose $\ge 126$, A1c $\ge 6.5$ | Glucose $>200$, A1c $>9.0$ |
| `dyslipidemia` | `total_cholesterol`, `ldl`, `hdl`, `triglycerides` | Chol $<200$, LDL $<100$, Trig $<150$ | Chol $200-239$, LDL $130-159$ | Chol $\ge 240$, LDL $\ge 160$, Trig $\ge 200$ | Chol $>300$, Trig $>500$ |
| `hypothyroidism` | `tsh`, `free_t4` | TSH $0.4-4.5$, FT4 $0.8-1.8$ | TSH $4.5-10.0$ | TSH $>10.0$, FT4 $<0.8$ | TSH $>20.0$ |
| `ckd` | `creatinine`, `bun`, `egfr` | Creat $<1.2$, eGFR $>90$ | Creat $1.3-1.9$, eGFR $60-89$ | Creat $2.0-3.9$, eGFR $30-59$ | Creat $\ge 4.0$, eGFR $<15$ |
| `anemia` | `hemoglobin`, `mcv`, `mch` | Hb $>12.0$ (F) / $>13.5$ (M) | Hb $10.0-12.0$ | Hb $8.0-9.9$ | Hb $<8.0$ |
| `liver_disease` | `alt`, `ast`, `alp`, `bilirubin_total` | ALT $<45$, AST $<40$, Bili $<1.2$ | ALT $45-100$, AST $40-100$ | ALT $>100$, AST $>100$, Bili $>2.0$ | ALT $>300$, Bili $>5.0$ |

---

## 11. Kinship Model

Family risk calculation uses Wright's Coefficient of Relationship ($r$):

| Relationship Type | Kinship Weight ($r$) | Category |
|---|---|---|
| Father / Mother | **0.50** | First-Degree Blood Relative |
| Brother / Sister / Sibling | **0.50** | First-Degree Blood Relative |
| Son / Daughter / Child | **0.50** | First-Degree Blood Relative |
| Grandfather / Grandmother | **0.25** | Second-Degree Blood Relative |
| Uncle / Aunt | **0.25** | Second-Degree Blood Relative |
| Cousin | **0.125** | Third-Degree Blood Relative |
| Spouse / Partner | **0.00** | Non-Genetic (Excluded) |

$$\text{Family Weighted Risk} = \min\left(1.0, \sum_{i \in \text{Relatives}} r_i \times \text{RiskScore}_i\right)$$

### Consent & Privacy Safeguards
* Relative lab data is included **only** if `share_clinical_data == True` on the `FamilyRelationship` record OR if the relative is a managed placeholder profile owned by the patient (`managed_by_user_id == patient_id`).

---

## 12. Machine Learning Architecture

### Model Performance Summary (Verified Artifact Metrics)

| Disease Key | Real Clinical Dataset Source | Sample Count ($N$) | Feature Count | Target Variable | Calibration Strategy | Model Version | ROC-AUC | Brier Score | Accuracy | Precision | Sensitivity | Specificity | F1 Score | MD5 Provenance Hash |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `type_2_diabetes` | Pima Indians Diabetes | 768 | 5 | `class` | `isotonic` | 2.0.0-real-calibrated | **0.8210** | **0.1647** | 0.7532 | 0.6600 | 0.6111 | 0.8300 | 0.6346 | `9b7a8ee7bbb848c7963a86e489e2d007` |
| `dyslipidemia` | Cleveland Heart Disease (UCI 45) | 303 | 4 | `num > 0` | `sigmoid` | 2.0.0-real-calibrated | **0.6894** | **0.2395** | 0.5574 | 0.5556 | 0.1786 | 0.8788 | 0.2703 | `83a8160e172bb87d48ed15ff58883c02` |
| `hypothyroidism` | Hypothyroid Disease (UCI 57) | 3,772 | 4 | `binary_class` | `uncalibrated` | 2.0.0-real-calibrated | **0.9957** | **0.0131** | 0.9828 | 0.8462 | 0.9483 | 0.9857 | 0.8943 | `4aae3d4efb63bab498146f140dcd836c` |
| `ckd` | Chronic Kidney Disease (UCI 336) | 400 | 4 | `class == ckd` | `isotonic` | 2.0.0-real-calibrated | **0.9970** | **0.0237** | 0.9750 | 0.9800 | 0.9800 | 0.9667 | 0.9800 | `af4b776b263f96c9b91c24edecf8bace` |
| `anemia` | Clinical Hematology CBC | 1,421 | 4 | `Result == 1` | `isotonic` | 2.0.0-real-calibrated | **0.9918** | **0.0374** | 0.9544 | 0.9512 | 0.9435 | 0.9627 | 0.9474 | `ec2ec07588c82654271b5aeae4cfb553` |
| `liver_disease` | Indian Liver Patient (UCI 225) | 583 | 5 | `Selector == 1` | `uncalibrated` | 2.0.0-real-calibrated | **0.7385** | **0.1785** | 0.7094 | 0.7379 | 0.9157 | 0.2059 | 0.8172 | `2e7db332751d7ed80c11012c41ca3e20` |

---

## 13. Dataset Provenance

All 6 models are trained exclusively on genuine, verified public clinical datasets cached locally in `backend/hereditary_risk/app/ml/datasets/cache/`:

1. **`type_2_diabetes`**: Pima Indians Diabetes Dataset (768 clinical samples). Features: `fasting_glucose`, `fasting_insulin`, `bmi`, `resting_bp`, `age`. MD5: `9b7a8ee7bbb848c7963a86e489e2d007`.
2. **`dyslipidemia`**: UCI Cleveland Heart Disease Dataset (UCI 45, 303 samples). Features: `total_cholesterol`, `fasting_glucose`, `resting_bp`, `age`. MD5: `83a8160e172bb87d48ed15ff58883c02`.
3. **`hypothyroidism`**: UCI Hypothyroid Dataset (UCI 57, 3,772 samples). Features: `tsh`, `t3`, `t4`, `free_t4`. MD5: `4aae3d4efb63bab498146f140dcd836c`.
4. **`ckd`**: UCI Chronic Kidney Disease Dataset (UCI 336, 400 samples). Features: `creatinine`, `bun`, `hemoglobin`, `fasting_glucose`. MD5: `af4b776b263f96c9b91c24edecf8bace`.
5. **`anemia`**: Clinical Hematology CBC Anemia Dataset (1,421 samples). Sourced from real CBC clinical observations. Features: `hemoglobin`, `mcv`, `mch`, `mchc`. MD5: `ec2ec07588c82654271b5aeae4cfb553`.
6. **`liver_disease`**: UCI Indian Liver Patient Dataset (ILPD, UCI 225, 583 samples). Features: `alt`, `ast`, `alp`, `bilirubin_total`, `albumin`. MD5: `2e7db332751d7ed80c11012c41ca3e20`.

Zero synthetic training datasets exist in the model pipeline.

---

## 14. ML Training Pipeline

The training script (`backend/hereditary_risk/app/ml/train_models.py`) implements a 3-way split:

```
Full Dataset (100%)
  │
  ├──► Train Set (60%) ─────────► XGBoost Model Fitting
  │
  ├──► Validation Set (20%) ────► Evaluate Calibration Options:
  │                                 - Uncalibrated Brier Score
  │                                 - Sigmoid Calibrated Brier Score
  │                                 - Isotonic Calibrated Brier Score
  │                               Select strategy with minimal Brier loss on Val
  │
  └──► Holdout Test Set (20%) ──► Final Untouched Performance Metric Evaluation
                                  (ROC-AUC, PR-AUC, Accuracy, Precision, Recall, F1, Brier)
```

This 3-way dataset split prevents calibration selection bias and ensures holdout metrics accurately reflect un-tainted generalization error.

---

## 15. Model Evaluation

> [!IMPORTANT]
> **Clinical Evaluation Disclaimer**: Benchmark performance metrics reported in Section 12 represent empirical validation on public clinical datasets. They demonstrate statistical calibration and model quality, but do **NOT** constitute formal FDA/CE-mark clinical validation for independent diagnostic decision-making.

---

## 16. SHAP / Explainability

Model explainability is provided by `backend/hereditary_risk/app/ml/shap_explainer.py`:

1. **Primary Explainer**: `shap.TreeExplainer(model)` calculates exact Shapley values for each biomarker feature input.
2. **Attribution Normalization**: Converts raw SHAP log-odds contributions into percentage impact values indicating whether each biomarker increased ($+$) or decreased ($-$) the risk estimate.
3. **Fallback Explainer**: If `TreeExplainer` is unavailable or fails due to environment constraints, the engine safely falls back to model `feature_importances_` or rule-based attributions without interrupting inference.

---

## 17. Risk Signal Semantics

To prevent misinterpretation, five distinct risk signals are maintained and returned separately:

1. **`rule_based_risk_score`**: Deterministic score ($0.0 - 1.0$) based strictly on clinical lab thresholds.
2. **`family_weighted_risk`**: Kinship score ($0.0 - 1.0$) based on blood relative history weighted by Wright coefficients.
3. **`heuristic_combined_risk_signal`**: Heuristic combination of patient lab rules and family pedigree scores.
4. **`ml_probability_estimate`**: Statistical probability ($0.0 - 1.0$) output by calibrated XGBoost classifiers. (Named `ml_probability_estimate` to reflect estimation).
5. **`population_heritability_reference`**: Published epidemiological heritability constant ($h^2$, e.g. $0.40$ for Type 2 Diabetes).

> [!NOTE]
> The engine does **not** claim to directly measure a patient's genetic genome probability; signals are maintained as distinct clinical indicators.

---

## 18. Risk Disagreement Handling

When clinical rule signals and ML probabilities diverge, the system explicitly detects and flags the disagreement:

```python
# Disagreement logic in routes.py
rule_high = (rule_score >= 0.6) or (family_risk >= 0.5)
ml_low = (ml_prob is not None) and (ml_prob < 0.3)
rule_low = (rule_score <= 0.2) and (family_risk <= 0.2)
ml_high = (ml_prob is not None) and (ml_prob > 0.7)

disagreement = (rule_high and ml_low) or (rule_low and ml_high)
```

If `rule_ml_disagreement == True`, the response includes a human-readable `disagreement_explanation` (e.g. *"Clinical rules indicate elevated risk based on recent lab thresholds, whereas the ML model predicts low probability based on secondary feature interactions"*). Disagreements are highlighted in the UI via a prominent warning banner.

---

## 19. LLM Narrative Layer

The narrative layer (`backend/hereditary_risk/app/narrative/gemini_narrative.py`) integrates with Google Gemini:

* **Grounding & Constraints**: Prompt template injects verified patient biomarkers, rule scores, family risks, ML probabilities, and SHAP attributions. Instructs Gemini to summarize findings without inventing clinical data or modifying numerical scores.
* **Fallback Template**: If `GEMINI_API_KEY` is absent or the API request fails/times out, the module falls back to a deterministic clinical text template.

---

## 20. API Architecture

Mounted under `/api/v1/hereditary-risk/` on the FastAPI host:

### 1. `GET /api/v1/hereditary-risk/diseases`
* **Auth**: Public
* **Response**: List of supported disease categories, display names, canonical biomarkers, and heritability constants.

### 2. `GET /api/v1/hereditary-risk/patient/{user_id}/assessment`
* **Auth**: `Authorization: Bearer <access_token>` (SEC-1 Required)
* **Authorization**: Checks owner or managed placeholder access.
* **Response**: `HereditaryRiskAssessmentResponse` containing `diseases`, `data_quality`, and patient metadata.

### 3. `POST /api/v1/hereditary-risk/assess`
* **Auth**: `Authorization: Bearer <access_token>` (SEC-1 Required)
* **Request Body**: `HereditaryRiskAssessmentRequest` JSON payload for direct stateless evaluation.

---

## 21. Frontend Architecture

The frontend is built in React 18 (`frontend/src/components/hereditary/HereditaryRiskPanel.jsx`):

* **Tabs**:
  - **Overview**: Multi-disease risk cards, overall risk signals, disagreement warnings.
  - **Clinical & Family**: Detailed break-down of `rule_based_risk_score`, `family_weighted_risk`, and relative history.
  - **Machine Learning**: `ml_probability_estimate`, calibration badge (`Isotonic`, `Sigmoid`, `Uncalibrated`), dataset provenance hash, and SHAP feature attributions.
  - **Narrative**: Gemini clinical summary and recommended action steps.
* **Observed / Imputed Badges**: Biomarkers rendered with visual indicators showing whether values were observed from lab reports or imputed using population medians.

---

## 22. Privacy & Consent

1. **Consent Control**: Relatives must explicitly set `share_clinical_data = True` to permit inclusion in family risk calculations.
2. **Managed Profiles**: Non-registered family members created as placeholder profiles (`is_placeholder == True`) can be managed only by their creator (`managed_by_user_id`).
3. **Data Isolation**: Raw relative biomarkers are processed in-memory during assessment computation and are never exposed in API responses to other users.

---

## 23. Security Architecture

* **JWT Verification**: Validates expiration and signature using `HS256`.
* **Access Authorization**: Enforces strict user ID boundaries (`authorize_patient_access`).
* **Environment Secret Management**: Development secrets rotated; `.env.example` provided for production configuration.
* **Input Validation**: Strict Pydantic schema validation on all inputs.

---

## 24. Testing Architecture

Current Test Suite Status: **225 / 225 PASSING (100% Success Rate)**

```
Backend Test Suite Break-down:
├── hereditary_risk/tests/unit/
│   ├── test_clinical_rule_engine.py .......... [PASS]
│   ├── test_extreme_values.py ....            [PASS]
│   ├── test_family_risk.py .........          [PASS]
│   ├── test_gemini_narrative.py .             [PASS]
│   ├── test_kinship.py ..................     [PASS]
│   ├── test_ml_validation_audit.py .......... [PASS] (Dataset MD5 & Provenance checks)
│   ├── test_multigen_kinship.py ..            [PASS]
│   ├── test_pre_integration_review.py ........[PASS]
│   ├── test_real_models.py .....              [PASS]
│   ├── test_shap_explainer.py ..              [PASS]
│   ├── test_value_normalizer.py ...............[PASS]
│   └── test_xgb_engine.py ........            [PASS]
└── tests/
    ├── test_auth.py ...                        [PASS] (JWT & Password security)
    ├── test_clinical.py ...                    [PASS]
    ├── test_dashboard_reports.py ..            [PASS]
    ├── test_family.py ............             [PASS]
    ├── test_hereditary_integration.py .......  [PASS] (SEC-1 IDOR & Auth headers)
    └── test_ingestion_updates.py ...           [PASS]

Total: 225 passed in 16.54s
```

Frontend Build Status: **Vite Production Build Succeeded** (0 compilation errors).

---

## 25. Running the Project

### 1. Unified Application Start (Recommended)
```bash
# Launch both Backend (http://127.0.0.1:8000) and Frontend (http://localhost:5173) concurrently:
python start.py

# Optionally launch with the standalone ML Model Testing Playground (http://127.0.0.1:8001):
python start.py --playground
```

### 2. Run Backend Host Application Directly
```bash
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Run Frontend Development Server Directly
```bash
cd frontend
npm run dev
```

### 4. Run Standalone Model Testing Playground Directly
```bash
cd backend
python -m hereditary_risk.model_test_server.app
# Open http://localhost:8001 in browser
```

### 4. Run Pytest Test Suite
```bash
cd backend
python -m pytest
```

### 5. Retrain Real Disease Models
```bash
cd backend
python -m hereditary_risk.app.ml.train_models
```

---

## 26. Configuration

Environment variables (defined in `backend/.env`):

```ini
# Core Backend Settings
DATABASE_URL=sqlite:///./genhealth.db
SECRET_KEY=<generate-strong-random-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# LLM Integration Settings
GEMINI_API_KEY=<your-google-gemini-api-key>

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

---

## 27. Model Artifacts

Model files located in `backend/hereditary_risk/app/ml/models/`:

1. `anemia_model.joblib`: Real CBC clinical dataset model (Isotonic calibrated, v2.0.0-real-calibrated)
2. `ckd_model.joblib`: UCI CKD 336 model (Isotonic calibrated, v2.0.0-real-calibrated)
3. `dyslipidemia_model.joblib`: UCI Heart 45 model (Sigmoid calibrated, v2.0.0-real-calibrated)
4. `hypothyroidism_model.joblib`: UCI Hypothyroid 57 model (Uncalibrated, v2.0.0-real-calibrated)
5. `liver_disease_model.joblib`: UCI ILPD 225 model (Uncalibrated, v2.0.0-real-calibrated)
6. `type_2_diabetes_model.joblib`: Pima Diabetes model (Isotonic calibrated, v2.0.0-real-calibrated)

---

## 28. Failure & Fallback Behavior

* **Missing Lab Data**: Imputes population medians for ML inference; flags imputed features in output.
* **Unrecognized Biomarkers**: Normalizer logs unmapped biomarker without crashing.
* **Missing Family Data**: Kinship module defaults `family_weighted_risk` cleanly to $0.0$.
* **Consent Withheld**: Excludes non-consenting relative lab records automatically.
* **Missing Model File**: Returns `ml_available: False` and falls back gracefully to rule-based scores.
* **Gemini Offline / API Failure**: Uses static clinical narrative template.
* **Authentication/Authorization Failure**: Returns standard HTTP 401/403 responses.

---

## 29. Performance Considerations

* **Model Loading**: Models cached in-memory (`_MODEL_CACHE` in `xgb_engine.py`) after initial load.
* **Batch Querying**: Relative lab history is queried via a single batch SQL query (`Report.user_id.in_(relative_ids)`), eliminating $N+1$ database queries.

---

## 30. Known Limitations

1. **Benchmark Datasets**: ML models trained on public benchmark datasets; generalization across diverse clinical populations requires localized calibration.
2. **Genomic Data**: Polygenic Risk Scores (PRS) and Whole Genome Sequencing (WGS) data are not currently integrated.
3. **Imputation**: High feature missingness relies on population medians, which can regress predictions toward average risk.

---

## 31. Future Extension Points

* **Adding a New Disease**: Add entry to `disease_config.py`, add dataset loading in `dataset_manifest.py`, and run `train_models.py`.
* **Integrating PRS**: Extend Layer 2B or Layer 3 to include polygenic risk scores alongside kinship weights.

---

## 32. Design Decisions

* **Explicit Signal Separation**: ML probabilities and clinical rule scores are kept separate to maintain semantic integrity.
* **3-Way Calibration Split**: Calibration strategies are selected on internal validation sets to prevent test-set data leakage.
* **Zero Synthetic Fallback**: Synthetic datasets have been completely purged in favor of verified public clinical data with MD5 hashing.

---

## 33. Current Project Status

* **Architecture Status**: Integrated Baseline (v2.0.0)
* **Backend Pytest Status**: **225 / 225 PASSING (100%)**
* **Frontend Build Status**: **Vite Production Build Success**
* **ML Model Artifacts**: 6 Real Calibrated XGBoost Models Active on Disk
* **Security Audit Status**: **SEC-1 & SEC-3 Remediated & Verified**
* **Production Status**: Production-Ready for Staging & Clinical Demonstration
