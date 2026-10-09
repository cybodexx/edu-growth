"""
Mentor assignment service.

Wraps the importable ``ml_pipeline`` engine (the same one notebook 04 uses).
Fitting the engine on the whole cohort takes ~5 s, but answering a single
student takes milliseconds, so the fitted assigner is cached in-process with
``lru_cache`` -- the same pattern as ``prediction_service``.

Data source: the Neon ``students`` table (see ``ml_pipeline/db_backend.py``).
"""
from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path

# Make the repo root importable so ``ml_pipeline`` resolves no matter where the
# server is launched from.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline import MentorAssigner, build_assigner  # noqa: E402


class StudentNotFoundError(Exception):
    """Raised when the roll number / name is not present in the cohort."""


class MentorEngineNotAvailableError(Exception):
    """Raised when the mentor engine could not be loaded or fitted."""


@lru_cache(maxsize=1)
def get_assigner() -> MentorAssigner:
    """Fit the mentor engine once per process and reuse it."""
    try:
        return build_assigner()
    except Exception as exc:  # noqa: BLE001 - surfaced to the client as HTTP 503
        raise MentorEngineNotAvailableError(f"Could not load mentor engine: {exc}") from exc


def refresh_assigner() -> None:
    """Drops the cached engine so the next call refits on fresh DB data."""
    get_assigner.cache_clear()


def reassign_student(roll_no: str) -> dict | None:
    """Refits the engine on the current DB and persists this student's mentors.

    Called after a student is added/updated, so a new row gets a mentor too.
    Best-effort: a failure here never breaks the write that already succeeded.
    """
    refresh_assigner()
    try:
        return get_assigner().analyze_student(roll_no, persist=True)
    except Exception as exc:  # noqa: BLE001 - best effort
        print(f"[mentor] could not assign '{roll_no}': {exc}")
        return None


def get_mentor_analysis(student_id: str) -> dict:
    """Full nested mentor analysis for one roll number or name."""
    assigner = get_assigner()
    try:
        return assigner.analyze_student(student_id)
    except LookupError as exc:
        raise StudentNotFoundError(str(exc)) from exc


def get_mentor_report(student_id: str) -> dict:
    """Compact payload centred on the printable text report."""
    analysis = get_mentor_analysis(student_id)
    return {
        "roll_no": analysis["roll_no"],
        "full_name": analysis.get("full_name"),
        "class_section": analysis.get("class_section"),
        "risk_level": analysis["risk_level"],
        "priority_rank": analysis.get("priority_rank"),
        "report_text": analysis["report_text"],
    }
