"""
Pydantic schemas for the mentor assignment API.

These mirror the nested dict returned by ``ml_pipeline.get_student_mentor``
(which wraps ``MentorAssigner.analyze_student``).

Endpoints:

    GET  /api/v1/mentor/{student_id}          -> MentorAnalysisResponse
    GET  /api/v1/mentor/{student_id}/report   -> MentorReportResponse
    POST /api/v1/mentor/analyze               -> MentorAnalysisResponse
"""
from typing import Any, Optional

from pydantic import BaseModel, Field


class MentorQuery(BaseModel):
    """Request body for POST /mentor/analyze."""

    student_id: str = Field(..., description="Roll number (e.g. 210029038252) or full name")


class MentorInfo(BaseModel):
    name: Optional[str] = None
    expertise_unit: Optional[str] = None
    rating: Optional[float] = None
    source: Optional[str] = None


class PeerMentor(BaseModel):
    roll_no: Optional[str] = None
    name: Optional[str] = None
    score_pct: Optional[float] = None


class UnitScore(BaseModel):
    unit: str
    score_pct: Optional[float] = None
    status: Optional[str] = None


class WeakUnit(BaseModel):
    unit: str
    score_pct: Optional[float] = None


class SubjectComponents(BaseModel):
    st1_pct: Optional[float] = None
    st2_pct: Optional[float] = None
    put_pct: Optional[float] = None
    unit_avg_pct: Optional[float] = None
    assignment_score: Optional[float] = None
    assignment_delay_hours: Optional[float] = None
    quiz_score: Optional[float] = None


class SubjectAnalysis(BaseModel):
    subject: str
    label: Optional[str] = None
    score_pct: Optional[float] = None
    status: Optional[str] = None
    current_teacher: Optional[str] = None
    attendance_pct: Optional[float] = None
    components: Optional[SubjectComponents] = None
    units: list[UnitScore] = []
    weak_units: list[WeakUnit] = []
    lowest_unit: Optional[str] = None
    mentor_needed: bool = False
    mentor: Optional[MentorInfo] = None
    peer_mentor: Optional[PeerMentor] = None
    suggested_action: Optional[str] = None
    reason: Optional[str] = None


class LabPart(BaseModel):
    part: str
    score_pct: Optional[float] = None
    status: Optional[str] = None


class LabAnalysis(BaseModel):
    lab: str
    label: Optional[str] = None
    score_pct: Optional[float] = None
    status: Optional[str] = None
    current_teacher: Optional[str] = None
    attendance_pct: Optional[float] = None
    parts: list[LabPart] = []
    weak_parts: list[str] = []
    mentor_needed: bool = False
    mentor: Optional[MentorInfo] = None
    peer_mentor: Optional[PeerMentor] = None
    suggested_action: Optional[str] = None
    reason: Optional[str] = None


class Recommendation(BaseModel):
    type: Optional[str] = None
    subject: Optional[str] = None
    priority: Optional[int] = None
    score_pct: Optional[float] = None
    focus: Optional[str] = None
    mentor: Optional[str] = None
    mentor_rating: Optional[float] = None
    peer_mentor: Optional[str] = None
    action: Optional[str] = None


class ClusteringInfo(BaseModel):
    cluster_id: int
    risk_level: str
    distance_to_centroid: Optional[float] = None
    assignment_confidence_pct: Optional[float] = None
    cluster_profile: dict[str, Any] = {}


class AcademicMetrics(BaseModel):
    average_percentage: Optional[float] = None
    lowest_subject_percentage: Optional[float] = None
    progress_trend_st1_to_st2: Optional[float] = None
    weak_subjects_count: Optional[int] = None
    weak_labs_count: Optional[int] = None
    total_weak_areas: Optional[int] = None
    previous_cgpa: Optional[float] = None
    overall_attendance_pct: Optional[float] = None


class MentorAnalysisResponse(BaseModel):
    """Full mentor analysis for a single student."""

    roll_no: str
    full_name: Optional[str] = None
    class_section: Optional[str] = None
    risk_level: str
    priority_rank: Optional[int] = None
    needs_intervention: bool = False
    clustering: Optional[ClusteringInfo] = None
    academic_metrics: Optional[AcademicMetrics] = None
    subjects: list[SubjectAnalysis] = []
    labs: list[LabAnalysis] = []
    recommendations: list[Recommendation] = []
    recommendation_summary: Optional[str] = None
    report_text: str


class MentorReportResponse(BaseModel):
    """Compact payload centred on the printable text report."""

    roll_no: str
    full_name: Optional[str] = None
    class_section: Optional[str] = None
    risk_level: str
    priority_rank: Optional[int] = None
    report_text: str
