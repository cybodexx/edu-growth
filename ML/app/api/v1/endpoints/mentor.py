"""
Dynamic mentor assignment endpoint.

    GET  /api/v1/mentor/{student_id}          -> full analysis (JSON)
    GET  /api/v1/mentor/{student_id}/report   -> printable text report
    POST /api/v1/mentor/analyze               -> full analysis (JSON, body)

``student_id`` is a roll number (e.g. ``210029038252``) or a full name.
"""
from fastapi import APIRouter, HTTPException, Path

from app.schemas.mentor_schema import (
    MentorAnalysisResponse,
    MentorQuery,
    MentorReportResponse,
)
from app.services.mentor_service import (
    MentorEngineNotAvailableError,
    StudentNotFoundError,
    get_mentor_analysis,
    get_mentor_report,
)

router = APIRouter()


@router.get(
    "/{student_id}",
    response_model=MentorAnalysisResponse,
    summary="Full mentor analysis for a student",
)
def analyze_student(
    student_id: str = Path(..., description="Roll number or full name"),
):
    """
    Runs unit/subject/lab-wise analysis, picks the hardcoded best mentor for
    every weak area and returns the full nested result (plus ``report_text``).
    """
    try:
        return MentorAnalysisResponse(**get_mentor_analysis(student_id))
    except StudentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MentorEngineNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.get(
    "/{student_id}/report",
    response_model=MentorReportResponse,
    summary="Printable text mentor report",
)
def student_report(
    student_id: str = Path(..., description="Roll number or full name"),
):
    """Same data as the analysis endpoint, centred on the printable text."""
    try:
        return MentorReportResponse(**get_mentor_report(student_id))
    except StudentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MentorEngineNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))


@router.post(
    "/analyze",
    response_model=MentorAnalysisResponse,
    summary="Full mentor analysis (JSON body)",
)
def analyze_student_post(payload: MentorQuery):
    """Body-based variant, handy for names containing spaces or slashes."""
    try:
        return MentorAnalysisResponse(**get_mentor_analysis(payload.student_id))
    except StudentNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except MentorEngineNotAvailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
