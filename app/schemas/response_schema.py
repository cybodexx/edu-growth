"""
Response schemas for CGPA Prediction API.
"""
from pydantic import BaseModel


class CGPAPredictionResponse(BaseModel):
    predicted_grade: float
    confidence_score: float
    confidence_display: str
