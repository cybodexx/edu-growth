"""
FastAPI application main entrypoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router

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


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy", "service": "edu_growth_api"}
