"""
Shared pytest fixtures.

The runtime is 100% database-backed, but the test-suite must run offline, so the
DB layer (``ml_pipeline.db_backend``) is monkeypatched with an in-memory reader
over the cleaned cohort CSV. This exercises the real models and endpoints
without needing a live Postgres/Neon connection.

Reads come from the CSV cohort; writes (create/update/delete) go to a small
in-memory store so the students CRUD endpoints can be tested too.
"""
from pathlib import Path

import pandas as pd
import pytest

from ml_pipeline import db_backend

CSV_PATH = Path(__file__).resolve().parents[1] / "data" / "processed" / "edu_growth_cleaned.csv"


@pytest.fixture(scope="session")
def cohort() -> pd.DataFrame:
    """The cleaned cohort used as a stand-in for the ``students`` table."""
    return pd.read_csv(CSV_PATH, dtype={"roll_no": str})


def _row_to_dict(row: pd.Series) -> dict:
    """Turn a CSV row into the plain-dict shape ``fetch_student`` returns."""
    return {
        key: (None if pd.isna(value) else value)
        for key, value in row.to_dict().items()
    }


@pytest.fixture(autouse=True)
def fake_database(monkeypatch, cohort):
    """Replaces DB reads/writes so the API works with no database."""
    store: dict[str, dict] = {}

    def fetch_student(identifier: str):
        identifier = str(identifier).strip()
        rows = cohort[cohort["roll_no"] == identifier]
        if rows.empty:
            rows = cohort[cohort["full_name"].str.lower() == identifier.lower()]
        if not rows.empty:
            return _row_to_dict(rows.iloc[0])
        return store.get(identifier)

    def fetch_students(limit=None, offset=0, search=None):
        frame = cohort
        if search:
            term = str(search).strip().lower()
            mask = (
                frame["roll_no"].astype(str).str.lower().str.contains(term, regex=False)
                | frame["full_name"].astype(str).str.lower().str.contains(term, regex=False)
            )
            frame = frame[mask]
        if offset:
            frame = frame.iloc[int(offset):]
        if limit is not None:
            frame = frame.iloc[: int(limit)]
        return frame.reset_index(drop=True)

    def upsert_student(record: dict, merge: bool = True) -> dict:
        roll = str(record.get("roll_no", "")).strip()
        existing = store.get(roll, {}) if merge else {}
        saved = {**existing, **record, "roll_no": roll}
        store[roll] = saved
        return saved

    def delete_student(roll_no: str) -> bool:
        return store.pop(str(roll_no).strip(), None) is not None

    def count_students(search=None):
        if search:
            term = str(search).strip().lower()
            mask = (
                cohort["roll_no"].astype(str).str.lower().str.contains(term, regex=False)
                | cohort["full_name"].astype(str).str.lower().str.contains(term, regex=False)
            )
            return int(mask.sum()) + len(store)
        return int(len(cohort)) + len(store)

    monkeypatch.setattr(db_backend, "fetch_student", fetch_student)
    monkeypatch.setattr(db_backend, "fetch_students", fetch_students)
    monkeypatch.setattr(db_backend, "count_students", count_students)
    monkeypatch.setattr(db_backend, "upsert_student", upsert_student)
    monkeypatch.setattr(db_backend, "delete_student", delete_student)
    monkeypatch.setattr(db_backend, "fetch_assignment_keys", lambda: set())
    monkeypatch.setattr(db_backend, "load_teacher_unit_weakness", lambda: [])
    monkeypatch.setattr(db_backend, "save_risk_predictions", lambda *args, **kwargs: 0)
    monkeypatch.setattr(db_backend, "save_mentor_assignments", lambda *args, **kwargs: 0)
    monkeypatch.setattr(db_backend, "save_teacher_unit_weakness", lambda *args, **kwargs: 0)
    monkeypatch.setattr(db_backend, "ensure_schema", lambda: None)
    yield
