"""
Pydantic schemas for the student risk-prediction API.

Endpoints:

    GET  /api/v1/risk/{roll_no}   -> RiskPredictionResponse
    POST /api/v1/risk/predict     -> RiskPredictionResponse
"""
from typing import List, Optional

from pydantic import BaseModel, Field


class StudentRiskInput(BaseModel):
    """Request body for POST /api/v1/risk/predict."""

    roll_no: str = Field(..., description="Student roll number, e.g. 210029023375")


class SubjectRisk(BaseModel):
    """Risk assessment for one theory subject."""

    subject: str = Field(..., description="Subject key, e.g. 'coa'")
    label: Optional[str] = Field(None, description="Human-readable subject name")
    probability: float = Field(..., description="Model probability (0-1) of being at risk")
    threshold: float = Field(..., description="Decision threshold chosen during training")
    prediction: int = Field(..., description="1 = at risk, 0 = safe")
    status: str = Field(..., description="'At Risk' or 'Safe'")


class RiskPredictionResponse(BaseModel):
    """Per-subject risk flags for a single student."""

    roll_no: str
    full_name: Optional[str] = None
    class_section: Optional[str] = None
    risk_count: int = Field(..., description="Number of subjects flagged 'At Risk'")
    at_risk_subjects: List[str] = []
    predictions: List[SubjectRisk] = []
