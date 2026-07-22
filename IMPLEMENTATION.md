# GenHealth AI — System Implementation Documentation

This document provides a comprehensive technical overview of the implementation architecture, database schemas, machine learning pipelines, backend REST APIs, and frontend client components for the **GenHealth AI** platform.

---

### Phase 0 — Environment setup

#### 0.1 — Initialize the repo
A Git repository was initialized for the `genhealth-ai` project. A `.gitignore` configuration was established covering Python virtual environments (`venv/`), compiled bytecode directories (`__pycache__/`), and local environment variable definitions (`.env`). A foundational `README.md` file was created containing an overview of the project architecture and a placeholder `Setup` section for environment configuration instructions.

#### 0.2 — Python environment
A Python 3.11+ virtual environment baseline was established. Core project dependencies were specified in `requirements.txt`, pin-pointing essential libraries:
- `fastapi` & `uvicorn`: Web framework and ASGI application server execution.
- `sqlalchemy` & `psycopg2-binary`: ORM and PostgreSQL database adapter.
- `pydantic` & `python-dotenv`: Data validation, settings management, and environment variable resolution.
- `python-jose[cryptography]` & `pwdlib[bcrypt]`: Cryptographic signing, password hashing, and JWT token handling.
- `pytest`: Automated testing framework.

Detailed virtual environment activation and dependency installation steps were documented in the `README.md` under the `Setup` heading.

#### 0.3 — Local Postgres
Database infrastructure was established for local PostgreSQL development. Database configuration procedures were defined to create the primary application database (`genhealth_dev`) alongside a dedicated database user account with granted permissions. A `.env.example` file was created establishing the standard SQLAlchemy `DATABASE_URL` connection string pattern (`postgresql://<user>:<password>@localhost:5432/genhealth_dev`).

#### 0.4 — Scaffold the React frontend
A React frontend single-page application was initialized using Vite inside the `frontend/` directory at the repository root. The project was configured with Tailwind CSS for utility-first styling, `axios` for HTTP API client communication, and `react-router-dom` for client-side routing. A minimal `App.jsx` entry component was created to confirm layout rendering and CSS compilation. A `frontend/.env.example` file was introduced defining `VITE_API_BASE_URL` pointing to the backend API service.

---

### Phase 1 — Vertical slice

#### 1.1 — FastAPI skeleton
The foundational FastAPI project layout was created across `backend/app/__init__.py`, `backend/app/main.py`, and `backend/app/config.py`. The application entry point in `main.py` instantiates a `FastAPI` application exposing a health monitoring endpoint at `GET /health` returning `{"status": "ok"}`. Application configuration settings are managed in `config.py` using `pydantic-settings` to load `DATABASE_URL` and `SECRET_KEY` from environment variables.

#### 1.2 — Database connection
Database connectivity and ORM session management were implemented in `backend/app/database.py` using SQLAlchemy 2.0. The module configures an `Engine` instance backed by `DATABASE_URL`, a `SessionLocal` sessionmaker factory, and a declarative `Base` class for model definitions. A `get_db()` dependency generator function was implemented to yield transactional database sessions per HTTP request, ensuring automatic session closure and resource cleanup upon request completion.

#### 1.3 — Users table
The user entity model was defined in `backend/app/models/user.py` mapping to the `users` table via SQLAlchemy. Relational schema attributes include:
- `id`: UUID primary key.
- `email`: Unique, non-nullable string.
- `password_hash`: Non-nullable string storing salted bcrypt hashes for security compliance rather than plain-text passwords.
- `full_name`: Non-nullable string.
- `date_of_birth`: Date column.
- `role`: String enum defaulting to `'patient'`.
- `created_at`: Timestamp column with default server timezone execution.

An Alembic migration script was generated and applied to establish database versioning for the `users` table.

#### 1.4 — Signup endpoint
User registration handling was implemented in `backend/app/routers/auth.py` exposing `POST /api/v1/auth/signup`. Incoming request bodies are validated using Pydantic schemas enforcing proper email syntax and minimum password length constraints. Plain-text passwords are hashed using `pwdlib` with bcrypt. If a matching email exists in the database, the endpoint returns an HTTP 409 Conflict status. Otherwise, the user record is saved and returned with the `password_hash` omitted from the response model.

#### 1.5 — Login endpoint + JWT
Authentication token issuing was added to `backend/app/routers/auth.py` via `POST /api/v1/auth/login`. Submitted credentials are verified against stored bcrypt hashes. Upon successful authentication, a JSON Web Token (JWT) signed with `SECRET_KEY` using `python-jose` is generated with a 30-minute expiration window and returned to the client. A reusable `get_current_user` FastAPI dependency was created to extract and verify JWT tokens from `Authorization: Bearer <token>` headers, decoding subject claims without embedding sensitive profile data inside unencrypted token payloads.

#### 1.6 — Tests for auth
Automated testing for authentication mechanisms was established in `backend/tests/test_auth.py` using `pytest` against an isolated database fixture. The test suite covers successful user signup, duplicate email handling (HTTP 409), successful login, invalid credential rejections (HTTP 401), and access enforcement on protected endpoints lacking valid JWT authorization tokens (HTTP 401).

#### 1.7 — Health records table + local upload
Medical record persistence and document file upload capabilities were established in `backend/app/models/health_record.py` and `backend/app/routers/records.py`. The `health_records` table was defined with the following schema:
- `id`: UUID primary key.
- `owner_id`: UUID foreign key referencing `users.id`.
- `record_type`: String describing record category.
- `source`: Enum with values `'upload_ocr'` or `'manual_entry'`.
- `source_file_path`: Nullable string specifying localized disk path for uploaded documents.
- `extraction_status`: String enum defaulting to `'pending'`.
- `raw_ocr_text`: Nullable text column storing OCR extraction output.
- `manual_data`: Nullable JSONB column storing structured clinical entry payloads.
- `created_at`: Timestamp column.

A protected endpoint `POST /api/v1/records/upload` was implemented requiring `get_current_user` authentication. The endpoint writes uploaded files to user-isolated storage locations (`backend/uploads/{user_id}/{filename}`) and inserts a linked `health_records` record initialized with `source='upload_ocr'`.

#### 1.8 — OCR script
Optical Character Recognition (OCR) processing capabilities were created in `backend/ml/ocr/extract.py`. The standalone `extract_text(image_path: str) -> dict` function executes EasyOCR on document images, returning extracted raw text alongside an average confidence score. The function includes error handling for invalid or corrupted image inputs, establishing a decoupled ML text extraction pipeline.

#### 1.9 — Wire OCR into the upload flow
Document processing logic in `POST /api/v1/records/upload` was updated to perform inline text extraction. Upon saving an uploaded image file, the endpoint synchronously invokes `extract_text()`, populates the `raw_ocr_text` and `confidence_score` database fields, and updates `extraction_status` to `'done'` (or `'failed'` upon processing exceptions).

#### 1.10 — Manual entry endpoint
Direct clinical record ingestion was implemented in the records router via `POST /api/v1/records/manual`. Protected by `get_current_user` authentication, the endpoint accepts structured payloads matching a Pydantic schema: `record_type`, nullable `diagnosis`, `medicines` (a list of `{name, dosage}` objects), nullable `doctor_name`, nullable `visit_date`, and nullable `notes`. Records are stored in `health_records` with `owner_id` set to the active user ID, `source='manual_entry'`, `manual_data` populated with the JSON payload, `source_file_path=None`, and `extraction_status='done'` immediately since no unstructured OCR parsing is required.

#### 1.11 — First risk model (offline training script)
An offline machine learning pipeline for disease risk assessment was created in `backend/ml/risk_models/train_diabetes.py`. The script loads patient feature datasets (age, BMI, family history flags) and binary diagnosis targets. To prevent data leakage across genetically related records, the script performs a grouped train/test split by `family_id`. An XGBoost binary classifier is trained and evaluated using ROC-AUC and PR-AUC metrics, and the model artifact is saved to disk via `joblib`.

#### 1.12 — Risk prediction endpoint
Risk inference capabilities were exposed via `GET /api/v1/risk/{user_id}` in `backend/app/routers/risk.py`. The endpoint loads the serialized XGBoost model, retrieves user clinical features from the database, executes model inference, and returns predicted probabilities along with categorical risk classifications (`low`, `moderate`, or `high`). Access control enforces that patients can only request their own risk evaluations while users with `role='doctor'` can query patient risk data.

#### 1.13 — API client + auth context
Frontend HTTP request processing and authentication state management were configured in `frontend/src/api/client.js` and `frontend/src/context/AuthContext.jsx`. An Axios instance was initialized using `VITE_API_BASE_URL`. React Context and `useState` manage authorization state, maintaining the JWT access token and active user profile in memory to prevent XSS exposure associated with `localStorage`. Request interceptors automatically inject `Authorization: Bearer <token>` headers into outgoing requests, while `login()` and `logout()` helper functions handle authentication state transitions.

#### 1.14 — Signup and login pages
User onboarding views were constructed in `src/pages/Signup.jsx` and `src/pages/Login.jsx` using React controlled components (`useState`). The pages send request payloads to backend authentication endpoints via the central API client. On successful authorization, `AuthContext.login()` updates the session state. Validation errors returned by API endpoints are displayed dynamically, and UI elements are styled using Tailwind CSS classes.

#### 1.15 — Upload, manual entry, and risk display components
User interfaces for clinical data entry and risk visualization were implemented in `src/pages/AddRecord.jsx` and `src/pages/RiskDashboard.jsx`. `AddRecord.jsx` provides a tabbed interface allowing users to switch between file upload mode (submitting `multipart/form-data` to the document upload endpoint) and manual entry forms (supporting dynamic medicine lists). `RiskDashboard.jsx` fetches risk assessment data for the authenticated user and renders predicted probabilities and risk levels within a card layout styled with Tailwind CSS.

#### 1.16 — Routing and protected routes
Client-side routing was set up in `src/App.jsx` using `react-router-dom` with route definitions for `/signup`, `/login`, `/add-record`, and `/risk`. A `ProtectedRoute` wrapper component intercepts navigation, redirecting unauthenticated users to `/login` when no valid JWT token is present in `AuthContext`.

#### 1.17 — Integration test
Integration tests validating Phase 1 vertical functionality were added in `backend/tests/test_integration_phase1.py`. Using `pytest`, the suite validates two complete end-to-end user workflows: (1) user signup, login, image upload, polling until `extraction_status` reaches `'done'`, and requesting risk predictions; and (2) user signup, login, manual clinical record submission, and verifying immediate availability with `source='manual_entry'` and `extraction_status='done'`.

---

### Phase 2 — Expand ML: NLP entities, a second risk model, and explainability

#### 2.1 — Extracted entities table
Clinical entity storage was established in `backend/app/models/extracted_entity.py`. The `extracted_entities` table, migrated via Alembic, includes the following schema:
- `id`: UUID primary key.
- `record_id`: Foreign key referencing `health_records.id` with cascading deletion (`ON DELETE CASCADE`).
- `entity_type`: String categorizing entities (e.g., `disease`, `medicine`, `dosage`, `doctor`, `date`).
- `entity_value`: Text column storing extracted terms.
- `confidence`: Float column for extraction confidence metrics.
- `icd10_code`: Nullable string for medical coding standard mapping.
- `atc_code`: Nullable string for anatomical therapeutic chemical classification.
- `user_corrected`: Boolean flag defaulting to `false`.
- `corrected_value`: Nullable text column storing user corrections.

Separating original extraction values from user corrections preserves original ML outputs while building data feedback loops.

#### 2.2 — NLP entity extraction script (standalone)
Natural Language Processing (NLP) text extraction logic was developed in `backend/ml/nlp/extract_entities.py`. The standalone `extract_entities(text: str) -> list[dict]` function uses `medSpaCy` pattern matching to identify medical entities (medication names, dosages, dates) from raw OCR text. Fuzzy string matching via `rapidfuzz` cross-references extracted drug terms against a dictionary of known medications to compensate for OCR misreadings. Each detected entity object includes `entity_type`, `entity_value`, and confidence metrics.

#### 2.3 — Wire entity extraction into the upload flow
Entity extraction was integrated into document upload and manual record workflows. For document uploads, `extract_entities()` processes completed `raw_ocr_text` and saves returned items as rows in `extracted_entities` linked to the target `health_record`. For manual entries submitted via `POST /api/v1/records/manual`, structured diagnoses and medicine list items are converted directly into `extracted_entities` records assigned a confidence score of `1.0`, bypassing NLP text extraction.

#### 2.4 — Entity extraction accuracy check
An evaluation script for NLP entity recognition was developed in `backend/ml/nlp/evaluate_entities.py`. The script evaluates `extract_entities()` against a hand-labeled benchmark dataset of OCR texts, computing precision (accuracy of extracted entities) and recall (completeness of entity identification) segmented by `entity_type`.

#### 2.5 — Second risk model (hypothyroidism)
A secondary risk prediction model targeting hypothyroidism was built in `backend/ml/risk_models/train_thyroid.py`. Built using XGBoost, the script processes features including TSH levels, age, gender, and family history of thyroid disorders. Data splitting uses grouped partitioning by `family_id` to prevent cross-family data leakage. Model performance is evaluated using ROC-AUC and PR-AUC metrics before saving serialized model artifacts via `joblib`.

#### 2.6 — Risk model registry (refactor)
Disease prediction endpoints were refactored in `backend/app/routers/risk.py` by introducing a centralized model registry (`models_config.py`). The registry maps disease identifiers (`diabetes`, `thyroid`) to their serialized model paths and required feature lists. The `GET /api/v1/risk/{user_id}` endpoint was updated to accept a `disease_name` query parameter, dynamically executing predictions across registered models through a unified API route.

#### 2.7 — SHAP explanations
Model explainability capabilities were introduced in `backend/ml/risk_models/explain.py`. The `explain_prediction(model, feature_row) -> list[dict]` function computes SHAP (SHapley Additive exPlanations) values for individual inference calls. It extracts key risk drivers and formats them as a list of `{factor, weight, direction}` objects sorted by absolute impact weight, where positive values denote increased disease risk and negative values denote protective factors.

#### 2.8 — Risk predictions table + wire SHAP into the endpoint
Inference persistence and explanation logging were implemented in `backend/app/models/risk_prediction.py`. The `risk_predictions` table (migrated via Alembic) stores:
- `id`: UUID primary key.
- `user_id`: Foreign key referencing `users.id`.
- `disease_name`: String identifier.
- `probability`: Float prediction output.
- `risk_level`: Categorical risk classification string.
- `contributing_factors`: JSONB column storing SHAP feature contribution arrays.
- `model_version`: String tracking model lineage.
- `generated_at`: Timestamp column.

The risk endpoint in `risk.py` was updated to invoke `explain_prediction()`, persist evaluation outcomes to `risk_predictions`, and return `contributing_factors` within API responses.

#### 2.9 — Tests for entities and explanations
Testing for NLP extraction and model explainability was added to `backend/tests/test_entities.py` and `backend/tests/test_risk_explain.py`. Pytest suites verify that entity extraction outputs valid types for benchmark text, risk API responses include structured `contributing_factors`, and invalid `disease_name` parameters trigger HTTP 404 Not Found responses.

#### 2.10 — Frontend: entities list and a contributing-factors chart
Visual components for entity display and model explainability were implemented in `src/components/EntityList.jsx` and `src/components/ContributingFactors.jsx`. `EntityList.jsx` presents extracted medications, dosages, and dates in a styled list. `ContributingFactors.jsx` uses Recharts to render SHAP feature weights as a horizontal bar chart, employing distinct color schemes for positive risk factors and negative protective factors. Both components were embedded into `RiskDashboard.jsx`.

#### 2.11 — Phase 2 integration test
Integration tests verifying Phase 2 features were implemented in `backend/tests/test_integration_phase2.py`. The suite extends Phase 1 test flows to confirm that document uploads populate linked entries in `extracted_entities`, and that requesting risk predictions for both `diabetes` and `thyroid` models returns valid probabilities alongside populated SHAP explanation arrays.

---

### Phase 3 — Family linking, invites, and graph-based generational risk

#### 3.1 — Family members table
Family relationship modeling was established in `backend/app/models/family_member.py`. The `family_members` table (migrated via Alembic) defines the following schema:
- `id`: UUID primary key.
- `user_id`: Foreign key referencing `users.id` (the account owner who created the entry).
- `related_user_id`: Nullable foreign key referencing `users.id` (populated when the family member registers an account).
- `name`: String containing relative's name.
- `relationship`: String enum (`father`, `mother`, `sibling`, `child`, `grandparent`, `spouse`, `other`).
- `gender`: Nullable string.
- `date_of_birth`: Nullable date column.
- `is_deceased`: Boolean flag defaulting to `false`.
- `created_at`: Timestamp column.

#### 3.2 — Family invites table
Family member invitation management was implemented in `backend/app/models/family_invite.py`. The `family_invites` table schema includes:
- `id`: UUID primary key.
- `inviter_id`: Foreign key referencing `users.id`.
- `family_member_id`: Foreign key referencing `family_members.id`.
- `invitee_email`: String target email.
- `token`: Unique, cryptographically secure unguessable string generated via `secrets.token_urlsafe`.
- `status`: String enum (`pending`, `accepted`, `declined`, `expired`; defaulting to `pending`).
- `expires_at`: Timestamp setting invitation expiration.
- `created_at`: Timestamp column.

#### 3.3 — Add family member endpoint
Manual family record creation was added to `backend/app/routers/family.py` via `POST /api/v1/family/members`. Requiring authentication, the endpoint validates relationship classifications against allowed enum types and inserts a `family_members` entry owned by the requesting user, initializing `related_user_id` as null.

#### 3.4 — List family members endpoint
Family member listing functionality was added to `family.py` via `GET /api/v1/family/members`. The authenticated endpoint retrieves all family member records registered by the current user, ordered by relationship type and name.

#### 3.5 — Send invite endpoint
Invitation dispatch logic was added to `family.py` via `POST /api/v1/family/invite`. Accepting a `family_member_id` (verified for user ownership) and `invitee_email`, the endpoint generates a secure token, inserts a `family_invites` row with a 7-day expiration timestamp, logs the invitation URL to the console, and returns the generated invite link in the API response payload.

#### 3.6 — Accept invite endpoint
Invitation acceptance processing was implemented via `POST /api/v1/family/invite/{token}/accept`. The endpoint validates token status and expiration. For existing registered users, it links their user ID to `family_members.related_user_id` and marks the invitation as accepted. For unregistered users, it returns instructions directing the frontend to redirect to user signup with the invite token attached for post-registration linking.

#### 3.7 — Family graph construction
Generational family tree modeling was built in `backend/ml/generational/build_graph.py`. The `build_family_graph(user_id, db_session)` function queries `family_members` records (traversing linked `related_user_id` accounts) and constructs a NetworkX directed graph representation of the patient's family tree, annotating directed edges with relationship types to support directional inheritance logic.

#### 3.8 — Ancestor condition traversal
Family medical history graph traversal was implemented in `build_graph.py` through `get_ancestor_conditions(graph, user_id, disease_name, db_session)`. The function traverses directed ancestor paths (parents, grandparents) in the NetworkX graph, checking health records and extracted clinical entities for target disease mentions. Matches are returned as an array of `{relative, relationship, degree_of_separation}` objects to quantify hereditary proximity.

#### 3.9 — Feature engineering: replace the manual family_history flag
Dynamic feature computation was introduced in `backend/ml/risk_models/build_features.py`. The `build_risk_features(user_id, disease_name, db_session)` function replaces static family history booleans by calling `get_ancestor_conditions()` to calculate weighted generational risk metrics based on degrees of kinship separation. These dynamic features are merged with baseline clinical attributes (age, BMI) to construct model input vectors.

#### 3.10 — Retrain risk models on the new features
Model training scripts `train_diabetes.py` and `train_thyroid.py` were refactored to utilize `build_risk_features()`. Classification models were retrained using graph-derived generational features, and evaluation metrics (ROC-AUC, PR-AUC) were recorded in experiment logs to track model performance changes resulting from dynamic family risk features.

#### 3.11 — Generational risk endpoint
Generational risk explanation capabilities were exposed via `GET /api/v1/risk/{user_id}/generational` in `backend/app/routers/risk.py`. The endpoint executes risk inference and calls `get_ancestor_conditions()` to embed human-readable lineage explanations (detailing relative relation, condition, and degree of separation) directly into API response payloads.

#### 3.12 — Tests for family linking and graph logic
Automated testing for family invitation workflows and graph traversal algorithms was created in `backend/tests/test_family.py` and `backend/tests/test_generational_risk.py`. Pytest suites validate family record creation, invitation token issuance and acceptance across existing and new accounts, expired token handling, and ancestor condition matching across NetworkX graph structures.

#### 3.13 — Frontend: family page
The user-facing family management portal was built in `src/pages/Family.jsx` and registered at `/family` in `App.jsx`. The page features forms for adding family members, a roster displaying relationship types alongside invitation dispatch controls, and a generational risk summary section detailing ancestor condition contributions.

#### 3.14 — Phase 3 integration test
Integration tests validating Phase 3 functionality were implemented in `backend/tests/test_integration_phase3.py`. Expanding the test suite, this file verifies end-to-end family member creation, medical record linkage, and verification that generational risk endpoints return ancestor clinical histories with expected degrees of separation.

---

### Phase 4 — Doctor portal, consent-based access, and audit logging

#### 4.1 — Doctor access table
Consent-based access control persistence was created in `backend/app/models/doctor_access.py`. The `doctor_access` table (migrated via Alembic) defines:
- `id`: UUID primary key.
- `patient_id`: Foreign key referencing `users.id`.
- `doctor_id`: Foreign key referencing `users.id`.
- `access_level`: String defaulting to `'read'`.
- `consent_text`: Text column storing patient consent agreements.
- `granted_at`: Timestamp column.
- `expires_at`: Nullable timestamp column for scheduled access expiration.
- `is_active`: Boolean flag defaulting to `true`.
- `revoked_at`: Nullable timestamp column tracking explicit access revocation.

Managing `is_active` independently from `expires_at` guarantees immediate access invalidation upon patient revocation regardless of remaining expiry time.

#### 4.2 — Audit log table
Security audit logging was implemented in `backend/app/models/audit_log.py`. The `audit_log` table (migrated via Alembic) records system security events with the following schema:
- `id`: UUID primary key.
- `actor_id`: Foreign key referencing `users.id` (user performing action).
- `patient_id`: Foreign key referencing `users.id` (patient whose data was accessed).
- `action`: String enum (`viewed_record`, `viewed_risk`, `granted_access`, `revoked_access`).
- `resource_type`: String identifier.
- `resource_id`: Nullable UUID column.
- `timestamp`: Timestamp column.
- `metadata`: Nullable JSONB column for contextual event metadata.

Application logic restricts interactions with `audit_log` strictly to insert operations, ensuring immutable audit records.

#### 4.3 — Grant doctor access endpoint
Doctor access grant functionality was implemented in `backend/app/routers/doctor.py` via `POST /api/v1/doctor-access/grant`. Authenticated patients provide a physician email, explicit non-empty `consent_text`, and an optional expiration date. The endpoint verifies that the target physician user possesses `role='doctor'`, records the `doctor_access` row, and writes a `'granted_access'` event to `audit_log`.

#### 4.4 — Revoke doctor access endpoint
Doctor access revocation was added to `doctor.py` via `POST /api/v1/doctor-access/{access_id}/revoke`. Restricted to the patient who granted access, the endpoint updates `is_active=False`, sets `revoked_at` to the current timestamp, and logs a `'revoked_access'` audit event, immediately revoking physician access for subsequent requests.

#### 4.5 — Doctor access dependency
A security authorization dependency, `require_doctor_access(patient_id)`, was established in `backend/app/middleware/auth_middleware.py`. The dependency verifies that requesting users have `role='doctor'`, checks for an active `doctor_access` record matching the physician and patient, verifies that `is_active` is true, and confirms that `expires_at` is either null or in the future, raising an HTTP 403 Forbidden exception on any validation failure.

#### 4.6 — Doctor: list patients with granted access
Physician patient roster retrieval was implemented via `GET /api/v1/doctor/patients`. The endpoint returns all patient records for which the requesting doctor currently holds an active, unexpired `doctor_access` authorization.

#### 4.7 — Doctor: view patient records
Clinical record retrieval for physicians was created via `GET /api/v1/doctor/patients/{patient_id}/records`, protected by `require_doctor_access()`. The endpoint returns patient `health_records` and linked `extracted_entities`, recording discrete `'viewed_record'` audit log entries for each record instance returned.

#### 4.8 — Chief complaint → relevant record matching
Clinical record relevance ranking was built in `backend/app/services/record_relevance.py`. The `find_relevant_records(patient_id, chief_complaint, db_session)` function performs keyword matching between a patient's chief complaint and their stored `extracted_entities.entity_value` entries, returning health records ranked by term overlap frequency.

#### 4.9 — Doctor: submit chief complaint endpoint
Clinical complaint query handling was added via `POST /api/v1/doctor/patients/{patient_id}/chief-complaint`, protected by `require_doctor_access()`. The endpoint processes chief complaint text, executes `find_relevant_records()`, returns ranked health records, and records an audit log entry containing the chief complaint text in its metadata JSON payload.

#### 4.10 — Tests for access control and audit logging
Authorization and audit logging tests were created in `backend/tests/test_doctor_access.py`. Using `pytest`, the test suite verifies access grant creation, immediate enforcement of access revocation and expiration, role-based endpoint access control for non-physician accounts, and accurate audit log entry generation for all grant, revoke, and record access actions.

#### 4.11 — Doctor portal pages
Physician portal interfaces were implemented in `src/pages/DoctorPatients.jsx` and `src/pages/DoctorPatientView.jsx`, registered at `/doctor/patients` and `/doctor/patients/:patientId`. Access is restricted to physician accounts via a `RoleProtectedRoute` component verifying `user.role === 'doctor'`. `DoctorPatients.jsx` lists authorized patients, while `DoctorPatientView.jsx` provides chief complaint search and relevant medical record review interfaces.

#### 4.12 — Patient-side access management page
Patient consent governance UI was built in `src/pages/ManageAccess.jsx` at route `/manage-access`. The page features a consent submission form requiring explicit `consent_text` and physician email to grant permissions, alongside a management dashboard displaying active grants and immediate revocation controls.

#### 4.13 — Present-mode re-authentication gate
Password re-authentication for device handoff scenarios was implemented via `POST /api/v1/auth/confirm-password` and `src/components/PresentModeGate.jsx`. The backend endpoint validates active user passwords without issuing new tokens. The `PresentModeGate.jsx` React component requires password confirmation before rendering child views, resetting state on unmount to enforce re-authentication upon each access.

#### 4.14 — Present-to-doctor page (in-person device handoff)
An in-person clinical presentation view was created in `src/pages/PresentToDoctor.jsx`, wrapped by `PresentModeGate`. The page renders a read-only summary of patient health records (incorporating OCR uploads and manual entries), extracted clinical entities, disease risk predictions with Recharts contributing factor charts, and generational risk lineage explanations, excluding all edit, deletion, or navigation controls for secure device handoff.
