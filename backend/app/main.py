from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy import text
from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered
from app.routers import auth
from app.routers import ingestion
from app.routers import family
from app.routers import clinical
from app.routers import claims


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables and columns exist in database on startup
    try:
        Base.metadata.create_all(bind=engine)
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE report_results ADD COLUMN IF NOT EXISTS is_duplicate_same_date BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20) DEFAULT 'unspecified';"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_placeholder BOOLEAN DEFAULT FALSE;"))
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL;"))
            conn.execute(text("ALTER TABLE family_relationships ADD COLUMN IF NOT EXISTS link_group_id UUID;"))
            conn.execute(text("ALTER TABLE family_relationships ADD COLUMN IF NOT EXISTS share_clinical_data BOOLEAN DEFAULT TRUE;"))
            conn.commit()
    except Exception as e:
        print(f"Warning: Could not connect or migrate database on startup: {e}")
    yield


app = FastAPI(title="GenHealth API", lifespan=lifespan)

# Allow CORS for frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(ingestion.router)
app.include_router(family.router)
app.include_router(clinical.router)
app.include_router(claims.router)


@app.get("/")
def root():
    return {
        "service": "GenHealth AI API",
        "status": "online",
        "version": "2.0.0",
        "docs_url": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}


