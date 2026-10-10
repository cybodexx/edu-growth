"""
CGPA Prediction endpoint: POST /api/v1/cgpa/predict

Body: {"roll_no": "210029038252"}
The student is fetched from the Neon database, then their final grade is predicted.
"""
from fastapi import APIRouter, HTTPException

from app.schemas.response_schema import CGPAPredictionResponse
from app.schemas.student_schema import StudentRollInput
from app.services.prediction_service import (
    ModelNotAvailableError,
    StudentNotFoundError,
    predict_cgpa_by_roll,
)

router = APIRouter()


@router.post("/predict", response_model=CGPAPredictionResponse)
def predict(payload: StudentRollInput):
    """Fetch the student from the DB, predict the CGPA, return grade + confidence."""
    try:
        return CGPAPredictionResponse(**predict_cgpa_by_roll(payload.roll_no))
    except StudentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
