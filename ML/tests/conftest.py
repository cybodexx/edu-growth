"""
Shared pytest fixtures.

The runtime is 100% database-backed, but the test-suite must run offline, so the
DB layer (``ml_pipeline.db_backend``) is monkeypatched with an in-memory reader
over the cleaned cohort CSV. This exercises the real models and endpoints
without needing a live Postgres/Neon connection.
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


@pytest.fixture(autouse=True)
def fake_database(monkeypatch, cohort):
    """Replaces DB reads/writes so the API works with no database."""

    def fetch_student(identifier: str):
        identifier = str(identifier).strip()
        rows = cohort[cohort["roll_no"] == identifier]
        if rows.empty:
            rows = cohort[cohort["full_name"].str.lower() == identifier.lower()]
        if rows.empty:
            return None
        return {
            key: (None if pd.isna(value) else value)
            for key, value in rows.iloc[0].to_dict().items()
        }

    monkeypatch.setattr(db_backend, "fetch_student", fetch_student)
    monkeypatch.setattr(db_backend, "save_risk_predictions", lambda *args, **kwargs: 0)
    yield
