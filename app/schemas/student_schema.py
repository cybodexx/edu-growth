"""
Pydantic input schema for POST /api/v1/cgpa/predict.

Field names and count come from the trained model's own feature list
(student_grade_predictor.pkl -> feature_columns): 63 model features.
58 are numerical; the other 5 are the one-hot columns:
sports_high / sports_low / sports_moderate / sports_none / sports_unknown.
The client passes `sports_activity_level` (or the 5 flags if needed),
and the service ensures the exact 63 features are constructed in order.
"""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SportsLevel = Literal["high", "low", "moderate", "none", "unknown"]


class StudentCGPAInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall_attendance_pct: float = Field(..., ge=0, le=100)
    theory_attendance_pct: float = Field(..., ge=0, le=100)
    practical_attendance_pct: float = Field(..., ge=0, le=100)
    previous_cgpa: float = Field(..., ge=0, le=10)
    medical_leave_days: float = Field(..., ge=0)
    society_participation_pc: float = Field(...)
    lab_ds_attendance_pct: float = Field(..., ge=0, le=100)
    lab_python_attendance_pct: float = Field(..., ge=0, le=100)
    lab_coa_attendance_pct: float = Field(..., ge=0, le=100)
    lab_cyber_attendance_pct: float = Field(..., ge=0, le=100)
    coa_st1_marks: float = Field(...)
    coa_st2_marks: float = Field(...)
    coa_put_marks: float = Field(...)
    coa_assignment_score: float = Field(...)
    coa_assignment_delay_hours: float = Field(...)
    coa_quiz_score: float = Field(...)
    maths4_st1_marks: float = Field(...)
    maths4_st2_marks: float = Field(...)
    maths4_put_marks: float = Field(...)
    maths4_assignment_score: float = Field(...)
    maths4_assignment_delay_hours: float = Field(...)
    maths4_quiz_score: float = Field(...)
    dstl_st1_marks: float = Field(...)
    dstl_st2_marks: float = Field(...)
    dstl_put_marks: float = Field(...)
    dstl_assignment_score: float = Field(...)
    dstl_assignment_delay_hours: float = Field(...)
    dstl_quiz_score: float = Field(...)
    ds_st1_marks: float = Field(...)
    ds_st2_marks: float = Field(...)
    ds_put_marks: float = Field(...)
    ds_assignment_score: float = Field(...)
    ds_assignment_delay_hours: float = Field(...)
    ds_quiz_score: float = Field(...)
    python_st1_marks: float = Field(...)
    python_st2_marks: float = Field(...)
    python_put_marks: float = Field(...)
    python_assignment_score: float = Field(...)
    python_assignment_delay_hours: float = Field(...)
    python_quiz_score: float = Field(...)
    cyber_st1_marks: float = Field(...)
    cyber_st2_marks: float = Field(...)
    cyber_put_marks: float = Field(...)
    cyber_assignment_score: float = Field(...)
    cyber_assignment_delay_hours: float = Field(...)
    cyber_quiz_score: float = Field(...)
    lab_ds_execution_score: float = Field(...)
    lab_ds_viva_score: float = Field(...)
    lab_ds_submission_delay_hours: float = Field(...)
    lab_python_execution_score: float = Field(...)
    lab_python_viva_score: float = Field(...)
    lab_python_submission_delay_hours: float = Field(...)
    lab_coa_execution_score: float = Field(...)
    lab_coa_viva_score: float = Field(...)
    lab_coa_submission_delay_hours: float = Field(...)
    lab_cyber_execution_score: float = Field(...)
    lab_cyber_viva_score: float = Field(...)
    lab_cyber_submission_delay_hours: float = Field(...)
    sports_activity_level: SportsLevel = Field(..., description="high | low | moderate | none | unknown")
