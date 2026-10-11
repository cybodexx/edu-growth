"""
Student management service -- writes go straight to the Neon ``students`` table.

There is no CSV anywhere: the database is the single source of truth. Whenever a
student is added or updated the mentor engine is refit from the DB and that
student's mentor assignments are recomputed, so brand-new rows also get a mentor.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

# Make the repo root importable so ``ml_pipeline`` resolves wherever the server runs.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline import db_backend  # noqa: E402

from app.services import mentor_service  # noqa: E402


class StudentServiceError(Exception):
    """Raised for invalid student operations (surfaced as HTTP 400/404)."""


def _clean_value(value):
    """Convert pandas/numpy scalars to JSON-safe values (NaN -> None)."""
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:  # noqa: BLE001 - fall back to the raw value
            return value
    return value


def _clean_records(df: pd.DataFrame) -> list[dict]:
    """DataFrame rows -> plain dicts with no NaN / numpy scalars."""
    if df is None or df.empty:
        return []
    return [
        {key: _clean_value(value) for key, value in row.items()}
        for row in df.to_dict("records")
    ]


def add_student(record: dict) -> dict:
    """Upserts one student and returns the stored row.

    Mentor assignment is intentionally *not* done here: it is a heavy cohort-wide
    refit, so the endpoint schedules it as a background task instead. We do drop
    the cached engine immediately so any mentor read that arrives before the
    background refit finishes rebuilds on fresh data instead of serving a stale
    cohort (which would 404 for the brand-new row).
    """
    saved = db_backend.upsert_student(record, merge=True)
    mentor_service.refresh_assigner()
    return saved


def update_student(roll_no: str, record: dict) -> dict:
    """Partial update of one student. Mentor re-assignment runs in the background."""
    if not db_backend.fetch_student(roll_no):
        raise StudentServiceError(f"No student found for '{roll_no}'.")
    saved = db_backend.upsert_student({**record, "roll_no": roll_no}, merge=True)
    mentor_service.refresh_assigner()
    return saved


def assign_mentor(roll_no: str) -> None:
    """Best-effort mentor (re)assignment. Safe to run after the response is sent."""
    mentor_service.reassign_student(roll_no)


def get_student(roll_no: str) -> dict | None:
    """One student's full row (from the DB), or ``None``."""
    return db_backend.fetch_student(roll_no)


def list_students(limit: int = 50, offset: int = 0, search: str | None = None) -> dict:
    """A page of students plus the total count (optionally filtered by ``search``)."""
    df = db_backend.fetch_students(limit=limit, offset=offset, search=search)
    return {
        "count": int(len(df)),
        "total": db_backend.count_students(search=search),
        "limit": limit,
        "offset": offset,
        "search": (search or "").strip() or None,
        "students": _clean_records(df),
    }


def delete_student(roll_no: str) -> bool:
    """Deletes one student and all derived rows. True when it existed."""
    return db_backend.delete_student(roll_no)
