from fastapi import FastAPI
from app.config import settings
from app.routers import auth
from app.routers import ingestion

app = FastAPI(title="GenHealth API")

app.include_router(auth.router)
app.include_router(ingestion.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
