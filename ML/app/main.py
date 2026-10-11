"""
FastAPI application main entrypoint.
"""
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router

# Make the repo root importable so ``ml_pipeline`` resolves wherever the server
# is launched from (same pattern as the service modules).
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline.db_backend import BackendNotConfigured  # noqa: E402

app = FastAPI(
    title="EduGrowth Student Analytics API",
    description=(
        "Unified student analytics API: CGPA prediction, per-subject risk "
        "prediction and dynamic mentor assignment (unit/subject/lab-wise analysis). "
        "All data is read from the Neon PostgreSQL database. Authentication is "
        "handled by the separate MongoDB + JS auth service (teacher/student panels)."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 router
app.include_router(api_router, prefix="/api/v1")


@app.exception_handler(BackendNotConfigured)
async def backend_not_configured_handler(_request, exc: BackendNotConfigured):
    """Return 503 (not 500) when the database is unreachable / misconfigured.

    ``ml_pipeline.db_backend`` raises this when ``DATABASE_URL`` is missing or
    psycopg2 is absent, so every data endpoint fails with a clear, actionable
    message instead of a generic Internal Server Error.
    """
    return JSONResponse(status_code=503, content={"detail": str(exc)})


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "edu_growth_api"}
