"""
API v1 main router.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import cgpa, mentor, students

api_router = APIRouter()
api_router.include_router(cgpa.router, prefix="/cgpa", tags=["CGPA Prediction"])
api_router.include_router(mentor.router, prefix="/mentor", tags=["Mentor Assignment"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
