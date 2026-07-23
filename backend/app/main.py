from fastapi import FastAPI
from app.config import settings

app = FastAPI(title="GenHealth API")


@app.get("/health")
def health_check():
    return {"status": "ok"}
