"""
API v1 main router.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import cgpa

api_router = APIRouter()
api_router.include_router(cgpa.router, prefix="/cgpa", tags=["CGPA Prediction"])
