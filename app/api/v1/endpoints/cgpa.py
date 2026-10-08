"""
CGPA Prediction endpoint: POST /api/v1/cgpa/predict
"""
from fastapi import APIRouter, HTTPException

from app.schemas.response_schema import CGPAPredictionResponse
from app.schemas.student_schema import StudentCGPAInput
from app.services.prediction_service import ModelNotAvailableError, predict_cgpa

router = APIRouter()


@router.post("/predict", response_model=CGPAPredictionResponse)
def predict(student: StudentCGPAInput):
    """
    Validates input parameters, converts them to the exact 63 model features,
    and returns the predicted grade along with the confidence score.
    """
    try:
        result = predict_cgpa(student)
        return CGPAPredictionResponse(**result)
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
