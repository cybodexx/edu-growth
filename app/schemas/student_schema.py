"""
Pydantic schemas for student input.

* ``StudentRollInput`` -- body of ``POST /api/v1/cgpa/predict`` (roll number only).
* ``StudentCreate``    -- body of ``POST /api/v1/students`` (any original column).
* ``StudentUpdate``    -- body of ``PUT  /api/v1/students/{roll_no}`` (partial).

Create/update accept *any* of the dataset's columns; extra keys are kept in the
student's ``payload`` JSONB, so the schema never has to list all ~100 columns.
"""
from pydantic import BaseModel, ConfigDict, Field


class StudentRollInput(BaseModel):
    roll_no: str = Field(..., description="Student roll number, e.g. 210029038252")


class StudentCreate(BaseModel):
    """Add (or upsert) one student. Only ``roll_no`` is required."""

    model_config = ConfigDict(extra="allow")

    roll_no: str = Field(..., description="Student roll number, e.g. 210029038252")


class StudentUpdate(BaseModel):
    """Partial update -- send only the fields you want to change."""

    model_config = ConfigDict(extra="allow")
