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
