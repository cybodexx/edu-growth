"""
Student management service -- writes go straight to the Neon ``students`` table.

There is no CSV anywhere: the database is the single source of truth. Whenever a
student is added or updated the mentor engine is refit from the DB and that
student's mentor assignments are recomputed, so brand-new rows also get a mentor.
"""
from __future__ import annotations

import sys
from pathlib import Path

# Make the repo root importable so ``ml_pipeline`` resolves wherever the server runs.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline import db_backend  # noqa: E402

from app.services import mentor_service  # noqa: E402


class StudentServiceError(Exception):
    """Raised for invalid student operations (surfaced as HTTP 400/404)."""


def add_student(record: dict) -> dict:
    """Upserts one student, then assigns a mentor. Returns the stored row."""
    saved = db_backend.upsert_student(record, merge=True)
    mentor_service.reassign_student(saved["roll_no"])
    return saved


def update_student(roll_no: str, record: dict) -> dict:
    """Partial update of one student, then re-assigns their mentor."""
    if not db_backend.fetch_student(roll_no):
        raise StudentServiceError(f"No student found for '{roll_no}'.")
    saved = db_backend.upsert_student({**record, "roll_no": roll_no}, merge=True)
    mentor_service.reassign_student(roll_no)
    return saved


def get_student(roll_no: str) -> dict | None:
    """One student's full row (from the DB), or ``None``."""
    return db_backend.fetch_student(roll_no)


def list_students(limit: int = 50, offset: int = 0) -> dict:
    """A page of students plus the total count."""
    df = db_backend.fetch_students(limit=limit, offset=offset)
    return {
        "count": int(len(df)),
        "total": db_backend.count_students(),
        "limit": limit,
        "offset": offset,
        "students": df.to_dict("records"),
    }


def delete_student(roll_no: str) -> bool:
    """Deletes one student and all derived rows. True when it existed."""
    return db_backend.delete_student(roll_no)
