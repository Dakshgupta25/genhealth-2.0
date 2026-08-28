from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
import app.models  # Ensure all models are registered
from app.routers import auth
from app.routers import ingestion
from app.routers import family
from app.routers import clinical


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure all tables exist in database on startup
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        print(f"Warning: Could not connect to database on startup: {e}")
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


