from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .database import Base, SessionLocal, engine
from .demo_data import seed_demo_tickets
from .knowledge import seed_knowledge_base
from .ml import get_classifier
from .routes import ai, analytics, demo, tickets

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRONTEND_DIR = PROJECT_ROOT / "frontend"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_knowledge_base(db)
        if settings.auto_seed_demo:
            seed_demo_tickets(db)
    get_classifier()
    yield


app = FastAPI(
    title=settings.app_name,
    version="1.1.0",
    description=(
        "AI-assisted IT helpdesk with ticket classification, transparent priority rules, "
        "knowledge retrieval, technician workflows, similar-incident search and analytics."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def disable_browser_cache_for_local_demo(request, call_next):
    """Keep HTML/JS/CSS fresh while the portfolio project is being iterated locally."""
    response = await call_next(request)
    if request.url.path in {"/", "/technician"} or request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response

app.include_router(tickets.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(demo.router)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.get("/", include_in_schema=False)
def customer_portal():
    return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/technician", include_in_schema=False)
def technician_dashboard():
    return FileResponse(FRONTEND_DIR / "technician.html")


@app.get("/health", tags=["System"])
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": "1.1.0",
        "features": [
            "ticket-management",
            "ml-classification",
            "priority-rules",
            "knowledge-retrieval",
            "technician-dashboard",
            "similar-incidents",
            "analytics",
        ],
    }
