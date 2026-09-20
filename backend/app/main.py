from fastapi import FastAPI
from app.database.database import Base, engine

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicFlow API",
    description="Location-Aware Civic Intelligence Platform",
    version="1.0.0"
)


@app.get("/")
def root():
    return {
        "message": "CivicFlow API is running",
        "status": "success"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }