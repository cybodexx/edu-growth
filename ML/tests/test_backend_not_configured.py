"""
The public data endpoints must answer 503 (service unavailable) — never a bare
500 — when the database layer is not configured.

``ml_pipeline.db_backend`` raises ``BackendNotConfigured`` when ``DATABASE_URL``
is missing (or psycopg2 is absent). ``app.main`` registers a global exception
handler that turns that into a clear 503 with an actionable message.

The autouse ``fake_database`` fixture in ``conftest.py`` normally replaces the
DB helpers; each test below re-patches a single helper to raise, so the real
endpoint → handler path is exercised.
"""
from fastapi.testclient import TestClient

from app.main import app
from ml_pipeline import db_backend
from ml_pipeline.db_backend import BackendNotConfigured

client = TestClient(app)

MESSAGE = "DATABASE_URL is not set. Fill it in .env (see .env.example)."


def _not_configured(*_args, **_kwargs):
    raise BackendNotConfigured(MESSAGE)


def test_list_students_returns_503_when_db_missing(monkeypatch):
    monkeypatch.setattr(db_backend, "fetch_students", _not_configured)
    res = client.get("/api/v1/students")
    assert res.status_code == 503
    assert res.json()["detail"] == MESSAGE


def test_get_student_returns_503_when_db_missing(monkeypatch):
    monkeypatch.setattr(db_backend, "fetch_student", _not_configured)
    res = client.get("/api/v1/students/210029023375")
    assert res.status_code == 503
    assert res.json()["detail"] == MESSAGE


def test_cgpa_returns_503_when_db_missing(monkeypatch):
    monkeypatch.setattr(db_backend, "fetch_student", _not_configured)
    res = client.post("/api/v1/cgpa/predict", json={"roll_no": "210029023375"})
    assert res.status_code == 503
    assert res.json()["detail"] == MESSAGE


def test_risk_returns_503_when_db_missing(monkeypatch):
    monkeypatch.setattr(db_backend, "fetch_student", _not_configured)
    res = client.get("/api/v1/risk/210029023375")
    assert res.status_code == 503
    assert res.json()["detail"] == MESSAGE
