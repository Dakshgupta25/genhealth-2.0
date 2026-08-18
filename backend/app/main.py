from fastapi import FastAPI
from app.config import settings
from app.routers import auth

app = FastAPI(title="GenHealth API")

app.include_router(auth.router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
