# GenHealth AI — Learning, Practices, Workflow & Build Guide

This is your working reference for building GenHealth AI without vibe-coding. It assumes: you know Python/pandas/numpy/scikit-learn already, you're weaker on SQL/APIs/git, your goal is deep learning even if it takes months, and you're using **Google Antigravity** as your agentic dev environment.

Scope note: Part 5 below covers **Phase 0 (setup) and Phase 1 (a working vertical slice)** only — auth, one table pipeline, one upload, one OCR pass, one risk model, minimal display. That's intentional. Once you've completed Phase 1 and actually understand it, come back and ask for Phase 2's prompts (family graph, more risk models, NLP entities) in the same small-step format. Writing all 5 original parts of the plan as tiny prompts right now would produce a document so long you couldn't review it either — the same problem we're trying to avoid.

---

## PART 1 — What to learn

### 1a. Core DS/AI stack — learn these deeply, in this order

1. **SQL & relational schema design** — SELECT/JOIN/GROUP BY, primary/foreign keys, indexes, normalization, cascading deletes. You should be able to explain every table in this project's schema in your own words.
2. **Leakage-safe experiment design** — train/validation/test splits, and specifically *grouped* splits (family members must not span train and test, since they share the genetic signal you're predicting on).
3. **Imbalanced classification evaluation** — ROC-AUC vs PR-AUC, calibration curves, why accuracy is misleading when disease outcomes are rare.
4. **Gradient boosting (XGBoost)** — how it works conceptually, hyperparameters that matter, feature importance vs SHAP.
5. **Model explainability (SHAP)** — required here since the schema stores `contributing_factors` for every prediction; you need to justify a number, not just output it.
6. **PyTorch fundamentals** — tensors, autograd, a basic training loop — only as deep as needed to understand an ensemble model, not framework mastery.
7. **NLP for entity extraction** — spaCy pipelines vs transformer-based NER, what medSpaCy adds on top of spaCy for clinical text, what ClinicalBERT actually does differently from general BERT, precision/recall for NER specifically, and fuzzy matching (rapidfuzz) for OCR'd medicine names against a known drug list.
8. **OCR fundamentals** — what EasyOCR/Tesseract confidence scores mean, why image preprocessing (deskew, contrast, binarization via OpenCV) changes accuracy, and why EasyOCR tends to outperform Tesseract on medical documents while staying free.
9. **Graph-based family/relationship modeling** — enough `networkx` to represent a family tree and traverse it for "does this ancestor have this condition."

### 1b. Supporting tech — learn just enough to be functional, not deep

1. **Git** — branches, commits, diffs, `.gitignore`, resolving a merge conflict. This is foundational to everything else below, learn it first.
2. **REST APIs & FastAPI** — HTTP verbs, path/query/body params, Pydantic validation, dependency injection. Enough to read and write an endpoint, not to architect large APIs from scratch.
3. **Auth concepts** — what JWT and password hashing (pwdlib, the modern successor to passlib/bcrypt) do and why, not how to implement crypto yourself.
4. **pytest basics** — fixtures, assert patterns, unit vs integration tests, basic mocking.
5. **Docker & docker-compose** — enough to read a compose file and know what each service does, run `docker-compose up`, and debug a container that won't start.
6. **React fundamentals** — components, props, state (useState), effects (useEffect), and enough Vite/Tailwind to scaffold and style a project. You're using React for a portfolio-quality result, so treat this as "functional enough to build and explain every component," not framework mastery (no need for Redux, Next.js, or advanced patterns yet).
7. **CI/CD YAML (GitHub Actions)** — read-level understanding: what triggers a workflow, what a job/step is.
8. **Async task queues (Celery/Redis)** — concept only for now; you're not using these in Phase 1.

---

## PART 2 — Practices per process

**Git**
- One branch per unit of work (e.g. `feat/user-signup-endpoint`), never commit straight to `main`.
- Commit after every unit passes its own test, with a message describing what and why (`feat: add signup endpoint with bcrypt hashing, validates duplicate email`).
- Never commit `.env`, credentials, or `venv/` — set up `.gitignore` before your first commit.

**Working with AI-generated code**
- One unit per prompt: one table, one endpoint, one function. Never "build the whole backend."
- Before accepting a suggestion, read every line. If anything is unclear, ask the agent to explain it, in the file, before moving on.
- Rewrite at least the tricky parts in your own words in a comment or your notes — if you can't explain it, you don't own it yet.
- Treat AI output as a first draft from a fast junior developer: plausible, occasionally wrong, needs your review every time — even for "boring" code.

**Testing**
- Write down what a unit should do *before* generating it — this becomes your test.
- Every endpoint gets at least one happy-path test and one failure-path test (bad input, duplicate record, missing auth).
- Every ML function gets a test that checks output shape/range/type, not just "does it run."
- Run the full test suite before every commit, not just the test for what you just changed.

**ML experimentation**
- Fix random seeds everywhere (`numpy`, `sklearn`, `torch`) so results are reproducible.
- Log every experiment in a plain CSV or text file: date, model, features used, split strategy, metric values. You don't need MLflow yet — a spreadsheet is fine at this scale.
- Never evaluate on data that shares a family with training data (see leakage note in Part 1).
- Always check the metric *and* the SHAP explanation together — a good AUC with nonsensical feature attributions means something's leaking.

**SQL / database**
- Write your first migration for each new table by hand once, even slowly, before letting AI generate future ones — you need to recognize when a generated migration is wrong.
- Before running any migration against real data, read it and confirm you understand what it deletes/alters.

**Documentation**
- Docstrings explain *why*, not *what* — the code already shows what it does.
- Keep a `DECISIONS.md` at the project root: one entry per non-obvious choice ("used grouped k-fold split instead of random split because family members share genetic risk — see Part 1").
- Each `ml/` subfolder gets a short `README.md` explaining its data flow — these are the least self-explanatory parts of the codebase.

**Debugging**
1. Reproduce with the smallest possible input.
2. Read the full traceback yourself, form a hypothesis.
3. Ask AI to explain the *root cause*, not just "fix it."
4. Verify the explanation actually matches your understanding of the code.
5. Add a regression test for that specific bug.
6. Commit the fix separately from feature work.

---

## PART 3 — Project workflow

**Phases**

| Phase | Goal |
|---|---|
| 0 | Environment setup: git, Python venv, Postgres running locally, Antigravity configured |
| 1 | Vertical slice: signup/login, one upload (or manual entry), one OCR pass, one risk model, minimal page to see it all work end to end |
| 2 | Expand ML: more risk models, NLP entity extraction, SHAP explanations surfaced in the API |
| 3 | Family linking + generational/graph-based risk logic |
| 4 | Doctor portal (remote, consent-based) + an in-person "present to doctor" mode within the patient's own account, audit logging |
| 5 | Polish, deployment, CI/CD |

**The per-unit loop (use this for every single prompt in Part 5 and beyond)**

1. Define one small unit (you)
2. AI drafts it (Antigravity agent)
3. Read and question every line (you)
4. Test it yourself (you)
5. Commit with a clear message (you)
6. Repeat for the next unit

**Weekly checklist**
- Re-read your `DECISIONS.md` — does anything need updating given what you've learned since?
- Skim your git log — does the commit history tell a coherent story you could explain to someone else?
- Pick one thing you accepted from AI without fully understanding last week and go understand it now.

---

## PART 4 — Antigravity setup (rules & permissions)

Antigravity's default posture is more autonomous than you want while learning — the whole point of the tool is agents that plan, edit across files, run terminal commands, and iterate on their own. Set it up deliberately so it matches the "one unit, reviewed" discipline instead of fighting it.

**Autonomy mode**
- On first project setup (or in Settings), choose **Review-driven development**, not Secure (too slow to be useful) and not Agent-driven (too autonomous for a learning project — it'll happily touch 10 files before you've read line 1).
- Keep **artifact review** turned on — every plan and diff should be shown to you before it's applied, not just before it's committed.

**Terminal execution policy**
- Set it to `Auto` with an explicit allow-list (below), never `Turbo` — Turbo auto-runs everything except a deny-list, which is backwards from what you want right now.
- Allow-list of commands safe to auto-run: `pytest`, `pip install` (inside the project venv), `git status`, `git diff`, `git add`, `python -m`, `alembic upgrade head` (only after you've personally read that specific migration once — don't blanket-allow migrations).
- Everything else — anything touching the database destructively, `git push`, deployment commands — should require your explicit approval every time.

**Rules file — what it is and where it goes**
- Antigravity reads rules from a hierarchy: immutable system rules (Google's, can't change) → `GEMINI.md` (Antigravity-specific, highest priority you control, usually at `~/.gemini/GEMINI.md` for global rules) → `AGENTS.md` (cross-tool, useful if you ever also use Claude Code or Cursor on this repo) → `.agents/rules/` folder (workspace-specific supplements).
- For this project, put a workspace rules file at `.agents/rules/genhealth-rules.md` in the repo root. Rules files are capped at roughly 12,000 characters each, so keep it focused rather than exhaustive.

**Rules content to actually use** (copy this into `.agents/rules/genhealth-rules.md`):

```markdown
# GenHealth AI — Agent Rules

## Scope discipline
- Work on exactly one unit per request: one table, one endpoint, one function, one test file.
- Never generate multiple unrelated files in a single response unless explicitly asked.
- If a request seems to require touching more than 2-3 files, stop and propose a plan first; do not execute until I approve it.

## Explanation requirement
- After generating any non-trivial function (more than ~15 lines, or anything touching auth, database migrations, or ML evaluation), add a short comment block explaining the reasoning, not just what the code does.
- If I ask "explain this," answer in plain language before showing any code.

## Testing requirement
- Every new endpoint or function must come with at least one pytest test in the same response.
- Do not mark work as done without a passing test.

## Data & security caution
- Never write real patient data, API keys, or credentials into any file. Use `.env` and placeholder values only.
- Do not run destructive database operations (DROP, DELETE without WHERE, migrations that alter existing columns) without explicit confirmation from me first, even if terminal auto-run is otherwise allowed for this session.
- Treat this as health data: assume anything resembling PII/PHI handling needs an explicit callout in the code comments.

## Code style
- Python: PEP 8, type hints on function signatures, docstrings on every public function.
- SQL: explicit column names, never `SELECT *` in application code.
- No magic numbers — use named constants.

## Stack constraints (Phase 1)
- Postgres only — do not introduce MongoDB, Redis, Celery, or S3 yet.
- File storage: local disk under `backend/uploads/`, not cloud storage.
- No Docker required yet unless I ask for it — running locally with a plain Postgres install is fine for Phase 1.
```

**Model picker**
- Switch models per task via Settings → Select Model (or the `/model` slash command). Antigravity's free preview typically includes Gemini 3 Pro (the platform's native default, strongest for architecture/reasoning), Gemini 3 Flash (fast and cheap, right for routine boilerplate), and — if you add your own Anthropic API key — Claude Sonnet/Opus with Thinking mode, which tends to produce more careful, conservative code on security-sensitive steps. Part 5 below recommends per-step.
- This lineup shifts often for a preview product — if a model isn't in your picker anymore, just pick your best available reasoning model for the "Gemini 3 Pro" recommendations and your fastest/cheapest one for "Gemini 3 Flash."

**A note on scope vs. Antigravity's design**
- Antigravity's core feature is parallel autonomous agents working through multi-step "missions." That's explicitly *not* the workflow this guide uses — you're deliberately running it more like a single reviewed assistant, one unit at a time. That's a legitimate way to use the tool; you're just not using its most autonomous mode, on purpose, while you're still building the muscle to review everything it does.

---

## PART 5 — Step-by-step prompts (Phase 0 + Phase 1)

<!-- For each prompt: give it to an Antigravity agent, keep the **Review-driven** autonomy mode on (see Part 4), read the plan and diff it proposes, run the test yourself, then commit before moving to the next one. Antigravity's free preview ships with Gemini 3 Pro, Gemini 3 Flash, and (if you've added an Anthropic key) Claude Sonnet/Opus with Thinking mode — switch models per task using the model picker (Settings → Select Model), not just the default. This lineup changes fairly often, so if a model name below isn't in your picker anymore, treat "Gemini 3 Pro" as shorthand for "your current best reasoning model" and "Gemini 3 Flash" as shorthand for "your current fast/cheap model."

---

### Phase 0 — Environment setup

**0.1 — Initialize the repo**
> Prompt: "Initialize a git repository for a Python/FastAPI project called genhealth-ai. Create a .gitignore covering Python (venv, __pycache__, .env), and a basic README.md with a one-paragraph project description and a 'Setup' section I'll fill in later. Don't create any application code yet."
- Model: **Gemini 3 Flash** (simple boilerplate, no reasoning needed)
- Review checklist: confirm `.env` and `venv/` are actually in `.gitignore` before your first commit.

**0.2 — Python environment**
> Prompt: "Create a Python virtual environment setup for this project targeting Python 3.11+. Generate a requirements.txt with only: fastapi, uvicorn, sqlalchemy, psycopg2-binary, pydantic, python-jose[cryptography], pwdlib[bcrypt], pytest, python-dotenv. Add setup instructions to the README under 'Setup'."
- Model: **Gemini 3 Flash**
- Review checklist: understand what each package is for before running `pip install` — ask the agent to explain any you don't recognize.

**0.3 — Local Postgres**
> Prompt: "I have Postgres installed locally (not Docker). Write me the exact SQL commands to create a database called genhealth_dev and a database user with a password, and explain what each command does. Then create a .env.example file with a DATABASE_URL variable in the correct SQLAlchemy connection string format for Postgres."
- Model: **Gemini 3 Flash**
- Review checklist: run these commands yourself in `psql`, don't let the agent run them — you want the muscle memory.

**0.4 — Scaffold the React frontend**
> Prompt: "Scaffold a new Vite + React project in a frontend/ folder at the repo root. Add Tailwind CSS following Vite's official integration steps, and axios and react-router-dom as dependencies. Set up a minimal App.jsx with a placeholder page and confirm Tailwind classes actually apply. Add a .env.example for the frontend with VITE_API_BASE_URL pointing at the backend."
- Model: **Gemini 3 Flash**
- Review checklist: run `npm run dev` yourself and confirm the placeholder page renders with a Tailwind-styled element (e.g. a colored button) before moving on — don't trust "it should work," see it work.

---

### Phase 1 — Vertical slice

**1.1 — FastAPI skeleton**
> Prompt: "Create the basic FastAPI project structure: backend/app/__init__.py, backend/app/main.py with a FastAPI() instance and a single GET /health endpoint returning {\"status\": \"ok\"}, and backend/app/config.py using pydantic-settings to load DATABASE_URL and a SECRET_KEY from environment variables. Keep it minimal — no routers yet."
- Model: **Gemini 3 Flash**
- Review checklist: run `uvicorn app.main:app --reload` yourself and hit `/health` in the browser before moving on.

**1.2 — Database connection**
> Prompt: "Create backend/app/database.py with SQLAlchemy 2.0 setup: an engine using DATABASE_URL from config, a SessionLocal factory, a declarative Base, and a get_db() dependency function for FastAPI. Explain why the session is created per-request rather than globally."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (correctness-sensitive infrastructure code — ask it to explain reasoning, not just output code)
- Review checklist: make sure you understand what `get_db()` yields and why it's a generator, not a return.

**1.3 — Users table**
> Prompt: "Create backend/app/models/user.py with a SQLAlchemy model for a users table: id (UUID primary key), email (unique, not null), password_hash, full_name, date_of_birth, role (default 'patient'), created_at. Then create an Alembic migration for it and explain each column choice, especially why password_hash and not password."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: read the generated migration file fully before running `alembic upgrade head` yourself. -->

**1.4 — Signup endpoint**
> Prompt: "Create backend/app/routers/auth.py with a POST /api/v1/auth/signup endpoint. It should accept email, password, full_name via a Pydantic schema, hash the password with pwdlib's bcrypt handler, check for duplicate email and return a 409 if found, save the user, and return the created user without the password hash. Include input validation for email format and minimum password length. Explain the bcrypt hashing choice vs plain sha256."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (security-sensitive — don't use a fast/cheap model here)
- Review checklist: manually trace through what happens if two signups race on the same email — is there actually a unique constraint enforcing it at the DB level, or only the application check?

**1.5 — Login endpoint + JWT**
> Prompt: "Add a POST /api/v1/auth/login endpoint to auth.py that verifies email/password against the stored hash and returns a JWT access token (expiring in 30 minutes) signed with SECRET_KEY, using python-jose. Also add a get_current_user dependency that other routes can use to require authentication. Explain what's actually inside the JWT payload and why we shouldn't put sensitive data in it."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: decode a token yourself at jwt.io (or ask the agent to show you how) to confirm you understand what's actually inside it — it's not encrypted, just signed.

**1.6 — Tests for auth**
> Prompt: "Write pytest tests for the signup and login endpoints in backend/tests/test_auth.py, using a test database fixture. Cover: successful signup, duplicate email signup (expect 409), successful login, login with wrong password (expect 401), and accessing a protected route without a token (expect 401)."
- Model: **Gemini 3 Flash** (mechanical test-writing once the logic is understood) or **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) if you want it to also explain fixture design
- Review checklist: run the tests, watch at least one intentionally fail (e.g. comment out the password check) to confirm the test actually catches the bug.

**1.7 — Health records table + local upload**
> Prompt: "Create backend/app/models/health_record.py with a health_records table: id (UUID), owner_id (FK to users), record_type, source (enum: 'upload_ocr'/'manual_entry'), source_file_path (nullable — only set for uploads), extraction_status (default 'pending'), raw_ocr_text (nullable), manual_data (JSONB, nullable — only set for manual entries), created_at. Create the Alembic migration. Then create a POST /api/v1/records/upload endpoint that accepts a file upload, saves it to backend/uploads/{user_id}/{filename}, creates a health_records row with source='upload_ocr', and requires authentication via get_current_user. Explain why source_file_path and manual_data are both nullable rather than required."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the endpoint rejects unauthenticated requests and doesn't let a user write outside their own uploads folder (path traversal check).

**1.8 — OCR script**
> Prompt: "Create backend/ml/ocr/extract.py with a function extract_text(image_path: str) -> dict that runs EasyOCR on an image, returns the raw text and an average confidence score, and handles the case where the file isn't a valid image. Keep it as a standalone function I can test independently before wiring it into the API. Explain what the confidence score actually represents, and briefly why EasyOCR tends to outperform Tesseract on medical documents."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) or **GPT-5-Codex** (via the OpenAI proxy) (code-specialized, good for this kind of self-contained script)
- Review checklist: run it on 2-3 real sample images yourself and sanity-check the confidence scores against how readable the image actually looks. If you're curious, also run the same images through Tesseract (pytesseract) once and compare — that comparison is worth doing yourself rather than taking "EasyOCR is better" on faith.

**1.9 — Wire OCR into the upload flow**
> Prompt: "Update the /api/v1/records/upload endpoint so that after saving the file, it calls extract_text() synchronously (no Celery yet), stores the result in raw_ocr_text and confidence_score, and sets extraction_status to 'done' or 'failed'. Explain why doing this synchronously is fine for now but won't scale, and what would need to change later."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: upload a real prescription image through the API (via `/docs` Swagger UI) and confirm the OCR text actually lands in the database row.

**1.10 — Manual entry endpoint**
> Prompt: "Add a POST /api/v1/records/manual endpoint to the records router. It should accept structured fields via a Pydantic schema: record_type, diagnosis (nullable), medicines (a list of {name, dosage} objects), doctor_name (nullable), visit_date (nullable), notes (nullable). It creates a health_records row with source='manual_entry', manual_data set to the submitted fields as JSON, extraction_status='done' (there's nothing to extract, it's already structured), and no source_file_path. Require authentication and set owner_id from the current user. Explain why extraction_status is immediately 'done' here instead of 'pending'."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: submit a manual entry with an empty medicines list and confirm it's accepted (not every record needs medicines — e.g. a lab result) — check the schema doesn't wrongly require it.

**1.11 — First risk model (offline training script)**
> Prompt: "Create backend/ml/risk_models/train_diabetes.py: a standalone script that loads a small synthetic/sample CSV of patient features (age, BMI, family_history_diabetes, etc.) and a binary diabetes label, does a grouped train/test split by family_id, trains an XGBoost classifier, evaluates with ROC-AUC and PR-AUC, and saves the model with joblib. Explain why we're grouping by family_id in the split and what would go wrong if we didn't."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (this is the highest-value part to get an explanation-first response on — reasoning-heavy, not boilerplate)
- Review checklist: this is one you should be able to fully explain back without notes — re-derive why random splitting would leak here.

**1.12 — Risk prediction endpoint**
> Prompt: "Create backend/app/routers/risk.py with a GET /api/v1/risk/{user_id} endpoint that loads the saved model from train_diabetes.py, pulls the current user's features from the database, runs a prediction, and returns probability plus risk_level (low/moderate/high based on thresholds you choose and explain). Require authentication and only allow users to view their own risk unless they're role='doctor'."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: check the authorization logic specifically — try calling it as a different logged-in user and confirm it's actually blocked.

**1.13 — API client + auth context**
> Prompt: "In the frontend/ project, create src/api/client.js with an axios instance configured with the base URL from VITE_API_BASE_URL. Create src/context/AuthContext.jsx using React context and useState to hold the JWT and current user in memory (not localStorage), with login() and logout() functions, and an axios request interceptor that attaches the token to outgoing requests. Explain why keeping the token in React state instead of localStorage is the safer default here."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the token actually disappears on a page refresh (that's the tradeoff of in-memory storage) and that you understand why that's acceptable for now versus a real risk with localStorage.

**1.14 — Signup and login pages**
> Prompt: "Create src/pages/Signup.jsx and src/pages/Login.jsx as functional components with controlled form inputs (useState), calling the backend's signup/login endpoints via the api client, and using AuthContext's login() on success. Show validation errors from the API response. Style with Tailwind utility classes only, no custom CSS files."
- Model: **Gemini 3 Flash** (straightforward form components once the API client and context exist)
- Review checklist: manually test both success and failure paths (duplicate email, wrong password) and confirm error messages actually render, not just log to the console.

**1.15 — Upload, manual entry, and risk display components**
> Prompt: "Create src/pages/AddRecord.jsx with a toggle between two modes: 'Upload document' (a file input calling the upload endpoint from 1.7/1.9) and 'Enter manually' (a form with fields for record_type, diagnosis, a repeatable medicines list of {name, dosage}, doctor_name, visit_date, and notes, calling the manual entry endpoint from 1.10). Create src/pages/RiskDashboard.jsx that fetches and displays the risk prediction (probability and risk_level) once available. Use Tailwind for a simple card-based layout throughout. Keep both focused on data-fetching and display/input only — no extra features yet."
- Model: **Gemini 3 Flash** for the layout, **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) for the repeatable medicines-list form state, which is the fiddliest part
- Review checklist: confirm the upload path actually sends multipart/form-data (a common React file-upload mistake is sending JSON instead) — check the network tab. Separately submit a manual entry with two medicines and confirm both actually reach the backend as a list, not a single concatenated string.

**1.16 — Routing and protected routes**
> Prompt: "Set up react-router-dom in src/App.jsx with routes for /signup, /login, /add-record, /risk. Create a ProtectedRoute wrapper component that redirects to /login if AuthContext has no token. Explain the difference between this client-side protection and the backend's actual authorization checks — which one is the real security boundary?"
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (the explanation matters here — a common mistake is treating frontend route guards as security)
- Review checklist: try navigating directly to /risk in the browser URL bar while logged out — confirm you're redirected, then separately confirm the backend endpoint itself also rejects an unauthenticated request (that's the real check, the frontend one is just UX).

**1.17 — Integration test**
> Prompt: "Write pytest integration tests in backend/tests/test_integration_phase1.py that run the full flow end to end two ways: (a) signup, login, upload a sample test image, poll until extraction_status is 'done', request the risk prediction, assert a valid probability; (b) signup, login, submit a manual entry record, and confirm it's retrievable with source='manual_entry' and extraction_status='done' immediately."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: both tests passing is your actual definition of "Phase 1 complete" — don't move to Phase 2 until they're green and you understand every assertion in them. Separately, click through the actual React UI end to end too (signup → login → upload or manual entry → see risk) — the backend tests alone don't confirm the frontend wiring works.

---

### Phase 2 — Expand ML: NLP entities, a second risk model, and explainability

One correction from the closing note in the previous version of this file: per the phase table in Part 3, Phase 2 is ML expansion (NLP entities, more risk models, SHAP), and family linking/graph logic is **Phase 3**, not Phase 2. Ask for Phase 3's prompts separately once this phase is done.

Before starting: confirm Phase 1's integration test still passes on a clean run. Everything below builds on top of it.

**2.1 — Extracted entities table**
> Prompt: "Create backend/app/models/extracted_entity.py with a SQLAlchemy model for an extracted_entities table: id (UUID), record_id (FK to health_records, cascade delete), entity_type (disease/medicine/dosage/doctor/date), entity_value (text), confidence (float), icd10_code (nullable), atc_code (nullable), user_corrected (boolean, default false), corrected_value (nullable text). Create the Alembic migration. Explain why entity_value and corrected_value are separate columns instead of overwriting the original extraction."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: read the migration and confirm the cascade delete actually removes entities when a health_record is deleted — test this manually with a throwaway row before trusting it.

**2.2 — NLP entity extraction script (standalone)**
> Prompt: "Create backend/ml/nlp/extract_entities.py with a function extract_entities(text: str) -> list[dict] that uses medSpaCy (built on top of spaCy) with a rule-based/pattern matcher to pull out medicine names, dosages, and simple date patterns from raw OCR text. Use rapidfuzz to fuzzy-match extracted medicine names against a small known drug-name list, to catch OCR typos. Each returned entity should include entity_type, entity_value, and a confidence score. Explain why we're starting with medSpaCy's rule-based components before reaching for ClinicalBERT, and what its failure modes will be."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (this is a reasoning/design choice, not boilerplate — you want the explanation as much as the code)
- Review checklist: run it on 3-4 real OCR outputs from your Phase 1 uploads and manually check what it misses — write those misses down, you'll need them for 2.4.

**2.3 — Wire entity extraction into the upload flow**
> Prompt: "Update the upload endpoint (or add a follow-up step after extraction_status is 'done') to call extract_entities() on the raw_ocr_text, and save each result as a row in extracted_entities linked to the health_record. Keep this synchronous like the OCR step. Handle the case where extract_entities returns an empty list. Separately, update the manual entry endpoint from Phase 1 (1.10) to create extracted_entities rows directly from manual_data (mapping diagnosis and each medicine straight to entity rows) rather than running them through extract_entities() — they're already structured, so NLP would just add noise. Give manual-entry-derived entities a confidence of 1.0 since they came straight from the user."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: upload a real prescription and separately submit a manual entry, then query the extracted_entities table directly in `psql` for both — confirm the OCR path went through extract_entities() with a realistic confidence score, and the manual path landed with confidence 1.0 and didn't get run through NLP at all.

**2.4 — Entity extraction accuracy check**
> Prompt: "Create backend/ml/nlp/evaluate_entities.py: a script that takes a small hand-labeled sample of OCR text with known correct entities (I'll provide 5-10 examples), runs extract_entities() on each, and reports precision and recall per entity_type. Explain the difference between what precision and recall tell you here specifically, not just the general definition."
- Model: **Gemini 3 Flash** for the scaffolding, but ask **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) for the explanation part specifically — split this one across two prompts if you want the best of both.
- Review checklist: hand-label the sample examples yourself first, before running the script — don't let AI generate the "ground truth," that defeats the point of an accuracy check.

**2.5 — Second risk model (hypothyroidism)**
> Prompt: "Create backend/ml/risk_models/train_thyroid.py following the same structure as train_diabetes.py from Phase 1: grouped split by family_id, XGBoost classifier, ROC-AUC and PR-AUC evaluation, joblib save. Use a different sample feature set relevant to hypothyroidism (TSH levels if available, age, gender, family_history_thyroid). Point out anywhere this model's evaluation should be interpreted differently from the diabetes model given class balance."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: compare this model's PR-AUC to the diabetes model's — if the class balance differs a lot, does the same risk_level threshold logic from Phase 1 still make sense? Answer that yourself before moving on.

**2.6 — Risk model registry (refactor)**
> Prompt: "Refactor backend/app/routers/risk.py so it doesn't hardcode train_diabetes.py's model path. Create a small registry (a Python dict or a models_config.py file) mapping disease_name to its saved model path and feature list, and update the GET /api/v1/risk/{user_id} endpoint to accept a disease_name query param and loop the registry to support both diabetes and thyroid without duplicating endpoint code. Explain the tradeoff of this registry approach versus one endpoint per disease."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (refactor of existing code — needs to preserve Phase 1 behavior exactly, verify with the existing test)
- Review checklist: rerun the Phase 1 integration tests (1.17) after this refactor — they must still pass unchanged, since you didn't intend to change diabetes behavior.

**2.7 — SHAP explanations**
> Prompt: "Create backend/ml/risk_models/explain.py with a function explain_prediction(model, feature_row) -> list[dict] that computes SHAP values for a single prediction and returns the top contributing factors as a list of {factor, weight, direction} dicts, sorted by absolute weight. Explain what a positive vs negative SHAP value means for this specific binary classification setup."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (explainability logic is easy to get subtly wrong — insist on the explanation, verify it matches your own SHAP understanding from Part 1)
- Review checklist: manually sanity-check one output — does the top factor make clinical/logical sense (e.g. family history should usually show up for a genetic-risk-driven prediction)? If not, dig into why before trusting the pipeline.

**2.8 — Risk predictions table + wire SHAP into the endpoint**
> Prompt: "Create backend/app/models/risk_prediction.py with a risk_predictions table: id (UUID), user_id (FK), disease_name, probability, risk_level, contributing_factors (JSONB), model_version, generated_at. Create the migration. Then update the risk endpoint from 2.6 to call explain_prediction(), store the result as a risk_predictions row, and include contributing_factors in the API response."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the JSONB column actually round-trips correctly — fetch a stored row back out and check the contributing_factors deserialize to the same structure you saved.

**2.9 — Tests for entities and explanations**
> Prompt: "Write pytest tests in backend/tests/test_entities.py and backend/tests/test_risk_explain.py: entity extraction returns expected types for a known sample text, the risk endpoint response includes a non-empty contributing_factors list with the expected keys, and a malformed disease_name query param returns a 404 rather than a server error."
- Model: **Gemini 3 Flash**
- Review checklist: intentionally pass an unsupported disease_name yourself first and confirm you get a clean 404, not a stack trace — before the test locks that behavior in.

**2.10 — Frontend: entities list and a contributing-factors chart**
> Prompt: "Create src/components/EntityList.jsx to display extracted entities (medicine, dosage, dates) for a record as a simple Tailwind-styled list. Create src/components/ContributingFactors.jsx using Recharts to render the top contributing factors from a risk prediction as a horizontal bar chart, with color indicating positive vs negative direction. Wire both into RiskDashboard.jsx from Phase 1."
- Model: **Gemini 3 Flash** for EntityList, **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) for the Recharts component (chart libraries have more ways to get subtly wrong)
- Review checklist: click through the full flow again — upload, see entities, see the factors chart — and confirm nothing from Phase 1 broke. Check that positive vs negative SHAP direction actually maps to the color you'd expect (increases risk vs decreases risk), not just whatever the AI defaulted to.

**2.11 — Phase 2 integration test**
> Prompt: "Write backend/tests/test_integration_phase2.py: extend the Phase 1 integration test to also assert that extracted_entities rows exist after upload, and that requesting risk for both 'diabetes' and 'thyroid' disease_names returns valid probabilities with non-empty contributing_factors."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: this test passing, plus your own ability to explain SHAP's role in 2.7 without notes, is your definition of "Phase 2 complete."

---

### Phase 3 — Family linking, invites, and graph-based generational risk

This is the phase your project is actually named for — generational risk only means something once family relationships are represented as data you can traverse, not just a `family_history_diabetes` boolean you hand-waved in Phase 1/2's sample features.

Before starting: confirm Phase 2's integration test still passes on a clean run.

**3.1 — Family members table**
> Prompt: "Create backend/app/models/family_member.py with a SQLAlchemy model for a family_members table: id (UUID), user_id (FK to users, the person who added this record), related_user_id (nullable FK to users, filled in once/if they join the platform), name, relationship (father/mother/sibling/child/grandparent/spouse/other), gender (nullable), date_of_birth (nullable), is_deceased (boolean, default false), created_at. Create the Alembic migration. Explain why related_user_id is nullable and what it means when it's null vs filled in."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: make sure you can explain the difference between `user_id` and `related_user_id` back in your own words before moving on — this distinction is the foundation of the whole invite flow.

**3.2 — Family invites table**
> Prompt: "Create backend/app/models/family_invite.py with a family_invites table: id (UUID), inviter_id (FK to users), family_member_id (FK to family_members), invitee_email, token (unique, unguessable), status (pending/accepted/declined/expired, default pending), expires_at, created_at. Create the migration. Explain how the token should be generated so it's not guessable, and why we need an expiry."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (token generation is a security-relevant detail worth getting an explanation on)
- Review checklist: confirm the token generation actually uses a cryptographically secure random source (e.g. `secrets.token_urlsafe`), not something predictable like a UUID4 alone assumed to be "random enough" — ask the agent directly if you're not sure which it used.

**3.3 — Add family member endpoint**
> Prompt: "Create backend/app/routers/family.py with a POST /api/v1/family/members endpoint that lets an authenticated user add a family member manually (name, relationship, gender, date_of_birth, is_deceased — related_user_id stays null at this point). Validate that relationship is one of the allowed values. Require authentication."
- Model: **Gemini 3 Flash** (straightforward CRUD once the schema from 3.1 exists)
- Review checklist: try submitting an invalid relationship value and confirm you get a clean validation error, not a 500.

**3.4 — List family members endpoint**
> Prompt: "Add a GET /api/v1/family/members endpoint to family.py that returns all family members added by the current authenticated user, ordered by relationship then name."
- Model: **Gemini 3 Flash**
- Review checklist: confirm this only returns the current user's family members, not everyone's — test by adding a second user and checking isolation.

**3.5 — Send invite endpoint**
> Prompt: "Add a POST /api/v1/family/invite endpoint that takes a family_member_id and invitee_email, generates a secure token, creates a family_invites row with a 7-day expiry, and 'sends' the invite by printing the invite link to the console (no SendGrid yet — we're stubbing email for now). Return the invite link in the API response too, so I can test it manually via Swagger."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the endpoint checks that the family_member_id actually belongs to the requesting user before creating an invite for it.

**3.6 — Accept invite endpoint**
> Prompt: "Add a POST /api/v1/family/invite/{token}/accept endpoint. If the invitee already has an account, log them in and link their user id to family_member.related_user_id, mark the invite accepted. If they don't have an account yet, return a response telling the frontend to redirect to signup with the token attached, so acceptance can complete after signup. Reject expired or already-used tokens with a clear error. Explain the bidirectional linking question: should the invitee also get a family_members row pointing back at the inviter?"
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (this is the trickiest logic in Phase 3 — multiple states to handle correctly, don't rush the review here)
- Review checklist: walk through all four cases yourself before trusting it: (a) valid token + existing account, (b) valid token + no account, (c) expired token, (d) already-accepted token reused. Test each one manually.

**3.7 — Family graph construction**
> Prompt: "Create backend/ml/generational/build_graph.py with a function build_family_graph(user_id, db_session) that queries family_members (traversing through related_user_id where available) and constructs a networkx directed graph representing the user's known family tree, with relationship type as an edge attribute. Explain why a directed graph is the right structure here versus undirected."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (core reasoning-heavy piece of this phase — this is where the "generational" part of the project actually lives)
- Review checklist: build the graph for a small test family you set up manually (3-4 members) and print/visualize it — confirm the edges actually point the direction you expect (parent → child, or however you decided).

**3.8 — Ancestor condition traversal**
> Prompt: "Add a function get_ancestor_conditions(graph, user_id, disease_name, db_session) to build_graph.py that traverses ancestors (parents, grandparents) in the family graph, checks their health_records/extracted_entities for mentions of disease_name, and returns a list of {relative, relationship, degree_of_separation} for anyone with a match. Explain what 'degree of separation' should mean here and why it matters for risk weighting."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: re-derive by hand, on paper, what the correct output should be for your test family from 3.7, then compare against the function's actual output before trusting it on real data.

**3.9 — Feature engineering: replace the manual family_history flag**
> Prompt: "Create backend/ml/risk_models/build_features.py with a function build_risk_features(user_id, disease_name, db_session) that replaces the hardcoded family_history_diabetes-style boolean from Phase 1/2 with a real feature computed from get_ancestor_conditions(): e.g. a weighted count based on degree of separation, plus the existing age/BMI/etc features. Explain the tradeoff of weighting closer relatives more heavily versus treating all ancestor matches equally."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (feature engineering decision — this is exactly the kind of thing you should own per Part 2, use the AI as a sounding board and make sure you agree with the weighting logic before accepting it)
- Review checklist: this is a case where you should genuinely disagree with or adjust the AI's first suggestion if it doesn't match your own reasoning from Part 1's leakage/feature-engineering learning — don't just accept it because it runs.

**3.10 — Retrain risk models on the new features**
> Prompt: "Update train_diabetes.py and train_thyroid.py from Phase 1/2 to use build_risk_features() instead of the old hardcoded sample features, retrain both models, and compare the new ROC-AUC/PR-AUC against the Phase 1/2 numbers logged in your experiment log. Explain what it would mean if performance dropped after switching to the real graph-based feature."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: log this experiment in your CSV/text log per Part 2's ML practices — this is exactly the kind of "why performance changed" entry that log exists for.

**3.11 — Generational risk endpoint**
> Prompt: "Add a GET /api/v1/risk/{user_id}/generational endpoint to risk.py that returns the risk prediction plus a human-readable explanation of which specific ancestors contributed to the family-history feature (e.g. 'paternal grandfather — type 2 diabetes — 2 degrees of separation'), using get_ancestor_conditions() directly rather than re-deriving it from SHAP output."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the response doesn't leak information about relatives the requesting user shouldn't be able to see (e.g. a family member who hasn't accepted an invite and hasn't consented to sharing their own diagnosis details).

**3.12 — Tests for family linking and graph logic**
> Prompt: "Write pytest tests in backend/tests/test_family.py and backend/tests/test_generational_risk.py: adding a family member, sending and accepting an invite (both existing-account and new-account paths), rejecting an expired invite, and get_ancestor_conditions() returning the correct relatives for a small constructed test graph."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) for the graph traversal tests, **Gemini 3 Flash** for the simpler CRUD tests — split this one.
- Review checklist: intentionally break `build_family_graph` (e.g. swap an edge direction) and confirm at least one test actually fails — if nothing fails, the test isn't checking what you think it is.

**3.13 — Frontend: family page**
> Prompt: "Create src/pages/Family.jsx: a form to add a family member (calling POST /api/v1/family/members), a list of current family members with their relationship, an 'Invite' button next to members without a related_user_id (calling the invite endpoint and showing the returned link), and a section displaying the generational risk explanation from 3.11 using the ContributingFactors-style layout from Phase 2 where it makes sense. Add a /family route in App.jsx, protected like the others. Keep the family list a simple styled list, not a visual tree graphic yet."
- Model: **Gemini 3 Flash** for the CRUD list/form parts, **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) for wiring the generational risk explanation correctly
- Review checklist: click through the full flow — add a family member, send an invite, see the console-logged link, accept it in a second browser session (or incognito), see generational risk update on the /family page.

**3.14 — Phase 3 integration test**
> Prompt: "Write backend/tests/test_integration_phase3.py: extend the Phase 2 integration test to add two family members (one with a matching disease in their records), retrieve generational risk, and assert the response includes that relative in its explanation with the correct degree of separation."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: this test passing, plus your ability to explain the directed graph traversal in 3.7/3.8 without notes, is your definition of "Phase 3 complete."

---

### Phase 4 — Doctor portal, consent-based access, and audit logging

This phase is the most security/authorization-sensitive one so far — a bug here means a doctor sees a patient's records without consent, or a revoked doctor keeps access. Be more conservative than usual about what you accept without independently verifying.

Before starting: confirm Phase 3's integration test still passes on a clean run.

**4.1 — Doctor access table**
> Prompt: "Create backend/app/models/doctor_access.py with a doctor_access table: id (UUID), patient_id (FK to users), doctor_id (FK to users), access_level (default 'read'), consent_text (the exact text the patient agreed to), granted_at, expires_at (nullable — null means no expiry), is_active (boolean, default true), revoked_at (nullable). Create the migration. Explain why we store is_active separately from checking expires_at, rather than relying on expiry alone."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: make sure you understand why revocation needs its own explicit flag — think through what should happen if a patient revokes access before the expiry date.

**4.2 — Audit log table**
> Prompt: "Create backend/app/models/audit_log.py with an audit_log table: id (UUID), actor_id (FK to users, who performed the action), patient_id (FK to users, whose data was accessed), action (e.g. 'viewed_record', 'viewed_risk', 'granted_access', 'revoked_access'), resource_type, resource_id (nullable), timestamp, metadata (JSONB, nullable). Create the migration. Explain why this table should never allow updates or deletes from application code, only inserts."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm there's no update/delete endpoint anywhere touching this table — an editable audit log defeats its purpose.

**4.3 — Grant doctor access endpoint**
> Prompt: "Create backend/app/routers/doctor.py with a POST /api/v1/doctor-access/grant endpoint. The authenticated patient provides a doctor's email and an optional expiry date, the endpoint looks up the doctor by email (must have role='doctor'), requires the patient to submit consent_text explicitly (not a default string — they must type or confirm it), creates the doctor_access row, and writes an audit_log entry for 'granted_access'."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the endpoint rejects granting access to a user whose role isn't 'doctor' — try it with a regular patient email and make sure it fails cleanly.

**4.4 — Revoke doctor access endpoint**
> Prompt: "Add a POST /api/v1/doctor-access/{access_id}/revoke endpoint that only the patient who granted it can call, sets is_active to false and revoked_at to now, and writes an audit_log entry for 'revoked_access'. After revocation, confirm in your own testing that the doctor immediately loses access on their very next request, not just after some cache expires."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: this is the single most important manual test in this phase — grant access, confirm the doctor can see records, revoke it, then immediately try the doctor's request again and confirm it's blocked. Don't skip this.

**4.5 — Doctor access dependency**
> Prompt: "Create a require_doctor_access(patient_id) FastAPI dependency in backend/app/middleware/auth_middleware.py that checks: the current user has role='doctor', an active doctor_access row exists for this doctor+patient pair, is_active is true, and expires_at is either null or in the future. Raise 403 if any check fails. Explain why checking is_active AND expiry AND the current timestamp all matter, rather than just one of them."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (this single function is the security boundary for the entire doctor portal — review it more carefully than anything else in this phase)
- Review checklist: write out the four failure cases yourself (not a doctor, no access row, revoked, expired) and manually test each one hits the 403 before moving on.

**4.6 — Doctor: list patients with granted access**
> Prompt: "Add a GET /api/v1/doctor/patients endpoint that returns all patients who have an active, non-expired doctor_access grant for the current authenticated doctor."
- Model: **Gemini 3 Flash**
- Review checklist: confirm a doctor with zero grants gets an empty list, not an error, and that a revoked grant doesn't show up here.

**4.7 — Doctor: view patient records**
> Prompt: "Add a GET /api/v1/doctor/patients/{patient_id}/records endpoint, protected by require_doctor_access(), that returns the patient's health_records and extracted_entities. Log an audit_log entry with action='viewed_record' for each record actually returned (not just for the request itself)."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: check the audit log after calling this — does it have one entry per record, or one entry for the whole request? Confirm it matches what the prompt asked for and what you actually want.

**4.8 — Chief complaint → relevant record matching**
> Prompt: "Create backend/app/services/record_relevance.py with a function find_relevant_records(patient_id, chief_complaint, db_session) that does simple keyword matching between the chief_complaint text and extracted_entities.entity_value for that patient's records, returning records ranked by number of matching terms. Keep this to basic keyword overlap for now, not embeddings. Explain why starting with keyword matching before jumping to embeddings is a reasonable choice here."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: test with a chief complaint like 'fatigue and weight gain' against a patient with thyroid records from Phase 2 and confirm the thyroid-related record actually ranks higher than unrelated ones.

**4.9 — Doctor: submit chief complaint endpoint**
> Prompt: "Add a POST /api/v1/doctor/patients/{patient_id}/chief-complaint endpoint, protected by require_doctor_access(), that accepts a chief_complaint string, calls find_relevant_records(), returns the ranked records, and writes an audit_log entry with the chief_complaint stored in metadata."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm this endpoint is blocked for a doctor without active access, same as 4.7 — don't assume the dependency from 4.5 automatically covers every new route, verify it explicitly on each one.

**4.10 — Tests for access control and audit logging**
> Prompt: "Write pytest tests in backend/tests/test_doctor_access.py: granting access works and is auditable, revoked access is immediately blocked, expired access is blocked, a non-doctor role cannot access doctor endpoints even with a valid token, and every access-granting/revoking/viewing action produces exactly the expected audit_log entries."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (authorization tests deserve the more careful model, not the fast one)
- Review checklist: for each test, briefly imagine the bug it would need to exist for the test to wrongly pass — if a test could pass even with broken authorization, it's not testing the right thing. Fix any you find like that.

**4.11 — Doctor portal pages**
> Prompt: "Create src/pages/DoctorPatients.jsx (list of patients who've granted access, calling GET /api/v1/doctor/patients) and src/pages/DoctorPatientView.jsx (a chief-complaint input plus ranked relevant records for a selected patient). Add /doctor/patients and /doctor/patients/:patientId routes, and update ProtectedRoute (or add a RoleProtectedRoute variant) to also check AuthContext's user.role === 'doctor' for these routes, redirecting non-doctors elsewhere. Keep the patient-side consent/grant UI on a separate ManageAccess page instead of here (see 4.12)."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (role-based routing is easy to get subtly wrong — review the redirect logic carefully)
- Review checklist: log in as a doctor and a patient in two separate browser sessions (or one normal, one incognito) and walk through: patient grants access → doctor sees patient → doctor submits chief complaint → patient revokes → doctor immediately loses access. Also confirm a logged-in patient can't just navigate to /doctor/patients directly and see anything — remember from 1.16 that this frontend check is UX, not the real security boundary; the backend's require_doctor_access() from 4.5 is what actually matters.

**4.12 — Patient-side access management page**
> Prompt: "Create src/pages/ManageAccess.jsx: a form to grant a doctor access (doctor email, a required consent_text textarea the patient must actually type or explicitly check, optional expiry date, calling POST /api/v1/doctor-access/grant), and a list of currently granted accesses (doctor name/email, granted date, expiry or 'no expiry', a Revoke button calling the revoke endpoint from 4.4). Add a /manage-access route, protected like the others."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (this is the actual UI for a consent decision — don't let the model default to a pre-checked or placeholder consent_text, the patient needs to genuinely provide it)
- Review checklist: confirm the grant button is disabled until consent_text is actually filled in, not just present with placeholder text — a pre-filled consent box defeats the point of requiring explicit consent from 4.3.

**4.13 — Present-mode re-authentication gate**
> Prompt: "Add a POST /api/v1/auth/confirm-password endpoint that re-checks the current authenticated user's password against their stored hash and returns 200 or 403 — it does not issue a new token, it's just a re-auth check. Then create src/components/PresentModeGate.jsx: a component that prompts for the account password, calls confirm-password, and only renders its children once confirmed (state resets on unmount, so it re-prompts every time). Explain why this is a UX safeguard rather than a real security boundary, given the user is handing over an already-authenticated device."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm the gate actually re-prompts every time you enter present mode, not just once per session — the whole point is friction right before someone else looks at the screen.

**4.14 — Present-to-doctor page (in-person device handoff)**
> Prompt: "Create src/pages/PresentToDoctor.jsx, wrapped by PresentModeGate from 4.13, showing a clean, read-only summary of the current patient's own data: their health records list (from both upload_ocr and manual_entry sources) with extracted entities, risk predictions with the ContributingFactors chart from 2.10, and generational risk explanations from Phase 3 — with no edit, delete, or navigation-to-other-sections controls visible anywhere on this page. Add a prominent 'Exit present mode' button that returns to the dashboard. On page load, call a new backend endpoint POST /api/v1/audit/present-session that logs an audit_log row with actor_id and patient_id both set to the current user and action='presented_to_doctor'. Explain why logging this matters even though it's the patient's own data."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (the "no edit controls anywhere" constraint needs actual verification, not just a prompt instruction — see review checklist)
- Review checklist: this is the one to review most carefully in this phase — click through every element on the present-mode page and confirm literally none of them lead to an edit, delete, or settings action. A stray "Edit" button here means a doctor holding the patient's phone could accidentally modify their records. Also confirm the audit_log entry actually appears after loading the page.

**4.15 — Phase 4 integration test**
> Prompt: "Write backend/tests/test_integration_phase4.py: create a patient and a doctor, grant access with consent text, submit a chief complaint and assert relevant records are returned, revoke access, and assert the doctor's next request to view records is rejected with 403. Also assert audit_log has entries for every step, and add a separate test for confirm-password (correct password succeeds, wrong password returns 403)."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: this test passing, plus your ability to explain require_doctor_access() (4.5) and why the audit log is insert-only (4.2) without notes, is your definition of "Phase 4 complete."

---

### Phase 5 — Polish, CI/CD, and deployment

This phase turns a working local project into something you can point people to and reason about it as a whole. A few of these steps (5.11 especially) are less "prompt the AI" and more "you click through a platform's UI" — still walk through them deliberately.

Before starting: confirm Phase 4's integration test still passes on a clean run.

**5.1 — Config validation**
> Prompt: "Update backend/app/config.py so that missing required environment variables (DATABASE_URL, SECRET_KEY) raise a clear startup error instead of failing silently or crashing deep in the request cycle. Add a .env.example file listing every variable the app needs with placeholder values and a one-line comment explaining each."
- Model: **Gemini 3 Flash**
- Review checklist: delete `.env` temporarily and confirm the app fails immediately with a readable error message, not a cryptic traceback three layers deep.

**5.2 — Structured logging**
> Prompt: "Replace any print() statements across the backend with Python's logging module: a configured logger in backend/app/config.py, INFO level for normal operations (signup, upload, risk request), WARNING for recoverable issues (OCR low confidence, failed entity extraction), ERROR for exceptions. Don't log passwords, tokens, or raw health data content."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (the "don't log sensitive data" constraint needs real attention, not just boilerplate swap)
- Review checklist: grep the codebase yourself for `logger.` calls afterward and check none of them include a password, token, or full OCR text — spot-check this rather than trusting it was done correctly.

**5.3 — Global error handling**
> Prompt: "Add a global exception handler in backend/app/main.py that catches unhandled exceptions, returns a consistent JSON error format ({\"error\": \"...\", \"request_id\": \"...\"}), logs the full traceback server-side, and never leaks internal details (stack traces, SQL, file paths) in the response body. Explain why leaking stack traces to API responses is a real security risk here, not just an aesthetic issue."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: intentionally trigger an unhandled error (e.g. pass malformed data somewhere) and confirm the response is clean JSON, not a raw traceback.

**5.4 — CORS configuration**
> Prompt: "Add CORS middleware to backend/app/main.py that allows requests from the frontend's origin (read from an environment variable, not hardcoded), explicitly listing allowed methods and headers rather than wildcarding everything. Explain the risk of a wildcard CORS policy for an app handling health data."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: confirm you understand exactly which origin(s) are allowed and why — this is one to genuinely read, not skim.

**5.5 — Rate limiting on auth endpoints**
> Prompt: "Add basic rate limiting to the signup and login endpoints using slowapi (in-memory, no Redis needed yet) — limit to something like 5 attempts per minute per IP. Explain why login specifically needs this and what attack it mitigates."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: hit the login endpoint 6+ times quickly yourself and confirm you actually get rate-limited — don't just trust that the decorator was applied correctly.

**5.6 — Seed data script**
> Prompt: "Create backend/scripts/seed_demo_data.py that creates: one patient user, one doctor user, 2-3 family members (at least one with a matching disease entry for generational risk to show something), a couple of health records with extracted entities, risk predictions for both diseases with contributing_factors, and an active doctor_access grant. Print the demo login credentials at the end. Make it safe to run multiple times without creating duplicates."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled) (the "safe to run multiple times" requirement needs actual thought, not just a naive insert script)
- Review checklist: run it twice in a row and confirm it doesn't error or duplicate data the second time.

**5.7 — README**
> Prompt: "Write a README.md covering: project description, tech stack table, prerequisites, setup steps (venv, .env, migrations, seed data, running the server), how to run tests, project structure overview, and a 'Known limitations' section listing what's deliberately deferred (MongoDB, Celery, S3, SendGrid, embeddings-based NLP) and why, referencing that these were scoped out for a learning-focused build."
- Model: **Gemini 3 Flash**
- Review checklist: follow your own README on a clean checkout (or at least mentally walk through it) and confirm every step is actually accurate and in the right order.

**5.8 — CI pipeline**
> Prompt: "Create .github/workflows/ci.yml: on push and pull_request to main, spin up a Postgres service container, install dependencies, run alembic upgrade head, run pytest with coverage, and run ruff check plus black --check for linting. Explain what happens if a step fails — does the whole workflow stop, and does that block anything by default?"
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: push a small intentional lint violation and confirm the CI run actually fails red, not green — verify the pipeline catches what it's supposed to before trusting it long-term.

**5.9 — Dockerize (now, not earlier)**
> Prompt: "Create a Dockerfile for the backend and a docker-compose.yml that runs the API plus a Postgres service, using the .env.example variables. Keep it minimal — no Celery, Redis, or MongoDB services, matching the Phase 1-4 stack decisions. Explain what changes about local development once this exists (do I still use my venv day-to-day, or switch entirely to Docker?)."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: run `docker-compose up` from a clean state and confirm the seed script and a manual API call both work inside it before assuming it's correct.

**5.10 — Swap local file storage for a free hosted option**
> Prompt: "Refactor the file storage logic used in the upload endpoint (1.7) behind a small storage interface (a save_file(file, path) function), with two implementations: the existing local-disk one, and a new one using Cloudinary's free tier (or Supabase Storage — pick whichever has the simpler Python SDK). Select the implementation via an environment variable so local dev can keep using disk storage while deployment uses the hosted option. Explain why abstracting this behind an interface now, instead of hardcoding Cloudinary everywhere, matters."
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: upload a file through both implementations (toggle the env var) and confirm records actually resolve correctly either way — don't just trust that the abstraction is clean because it compiles.

**5.11 — Pre-deployment review pass (you, not AI)**
Go through the codebase yourself using this checklist — don't prompt AI for this step, do it:
- No hardcoded secrets or real data anywhere in git history (`git log -p | grep`-style check for anything you committed early on by accident).
- Every destructive DB operation requires auth + ownership checks (spot check 3-4 endpoints).
- `.env` is genuinely gitignored, not just listed and then committed anyway (check both backend and frontend `.env` files).
- Read your own `DECISIONS.md` — does it still accurately describe what's actually in the codebase?

**5.12 — Deploy the backend to a free platform**
> Prompt (to use as a guide, not literally paste): "Ask the agent: 'Walk me through deploying this FastAPI + Postgres app to [Render or Railway]'s free tier, including environment variable setup and running migrations post-deploy. Explain each step before I do it, don't just give me a command to paste blindly.'"
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: read each dashboard setting the agent tells you to change before changing it — deployment platforms are exactly the place where "just paste this" habits cause real damage (e.g. exposing a database publicly).

**5.13 — Build and deploy the React frontend**
> Prompt (to use as a guide, not literally paste): "Ask the agent: 'Walk me through building this Vite React app for production and deploying it to Vercel or Netlify's free tier, including setting VITE_API_BASE_URL to point at my deployed backend from 5.12, and configuring the backend's CORS (from 5.4) to allow the deployed frontend's actual domain.'"
- Model: **Gemini 3 Pro** (or Claude Sonnet with Thinking enabled)
- Review checklist: after deploying, open the browser console on the live site and confirm there are no CORS errors — if there are, it's almost always because 5.4's allowed-origins list still points at localhost.

**5.14 — Full-system manual QA**
No prompt — do this yourself, end to end, against the deployed version: signup → add family members → invite and accept → upload a record → see OCR + entities → see risk with contributing factors and generational explanation → grant doctor access → doctor views chief-complaint-matched records → revoke access → confirm doctor is blocked. If anything breaks only in the deployed environment and not locally, that's almost always an environment variable or CORS issue — check those first.

**5.15 — Final reflection entry**
Write one last entry in `DECISIONS.md`: what you'd do differently if starting over, which parts you still don't fully understand and want to revisit, and which of the originally-deferred pieces (MongoDB, Celery, S3/AWS, SendGrid, transformer-based NLP) are actually worth adding now versus staying deferred indefinitely.

---

That's the full build, phases 0 through 5, each one small enough to review and each one building on something you actually understand rather than something that just happened to run. From here, optional stretch work — swapping the rule-based NER for ClinicalBERT, adding async processing with Celery, a proper family-tree visualization, a real (non-console-log) email provider — is genuinely optional, not required to call this project done. If you want prompts for any of those later, ask in the same format and I'll scope them the same way.
