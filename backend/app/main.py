from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import init_db
from app.routers import dashboard, feedback, jobs, profile, searches


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="JobMatch AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(profile.router)
app.include_router(jobs.router)
app.include_router(jobs.meta_router)
app.include_router(feedback.router)
app.include_router(searches.router)
app.include_router(dashboard.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "embedding_provider": get_settings().embedding_provider}
