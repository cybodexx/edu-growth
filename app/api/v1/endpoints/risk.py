"""
Student risk-alert endpoint (per-subject XGBoost risk classifiers).

    GET  /api/v1/risk/{roll_no}   -> risk flags for one student
    POST /api/v1/risk/predict     -> same, JSON body {"roll_no": "..."}

The student row is fetched from the Neon database (no CSV); see
``app/services/risk_service.py`` and ``ml_pipeline/db_backend.py``.
"""
from fastapi import APIRouter, HTTPException, Path

from app.schemas.risk_schema import RiskPredictionResponse, StudentRiskInput
from app.services.risk_service import (
    ModelNotAvailableError,
    StudentNotFoundError,
    predict_risk_by_roll,
)

router = APIRouter()


def _run(roll_no: str) -> RiskPredictionResponse:
    try:
        return RiskPredictionResponse(**predict_risk_by_roll(roll_no))
    except StudentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ModelNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get(
    "/{roll_no}",
    response_model=RiskPredictionResponse,
    summary="Risk flags for one student",
)
def predict_risk(
    roll_no: str = Path(..., description="Student roll number, e.g. 210029023375"),
):
    """Fetch the student from the DB and score every subject risk model."""
    return _run(roll_no)


@router.post(
    "/predict",
    response_model=RiskPredictionResponse,
    summary="Risk flags for one student (JSON body)",
)
def predict_risk_post(payload: StudentRiskInput):
    """Body-based variant of the risk endpoint."""
    return _run(payload.roll_no)
