from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, engine
from .routes import analytics, tickets

Base.metadata.create_all(bind=engine)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"

app = FastAPI(
    title=settings.app_name,
    version="0.2.0",
    description="Milestone 2: core ticket-management API plus the customer-facing support portal.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tickets.router)
app.include_router(analytics.router)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def customer_portal():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "milestone": "Customer support portal + FastAPI ticket system",
    }
