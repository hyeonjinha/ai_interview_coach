from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.models.db import create_db_and_tables
from app.api.routers.health import router as health_router
from app.api.routers.experiences import router as experiences_router
from app.api.routers.jobs import router as jobs_router
from app.api.routers.recommendations import router as rec_router
from app.api.routers.interview import router as interview_router
from app.api.routers.auth import router as auth_router
from app.api.routers.dashboard import router as dashboard_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    yield
    # Shutdown


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

# CORS for frontend - 개발 환경에서는 모든 origin 허용
if settings.env == "dev":
    origins = ["*"]  # 개발 환경에서는 모든 origin 허용
else:
    origins = [settings.frontend_origin] if settings.frontend_origin else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/health", tags=["health"]) 
app.include_router(experiences_router, prefix="/experiences", tags=["experiences"]) 
app.include_router(jobs_router, prefix="/jobs", tags=["jobs"]) 
app.include_router(rec_router, prefix="/recommendations", tags=["recommendations"]) 
app.include_router(interview_router, prefix="/interviews", tags=["interviews"]) 
app.include_router(auth_router, prefix="/auth", tags=["auth"]) 
app.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"]) 


@app.get("/")
def root():
    return {"message": "AI Interview Coach API"}

