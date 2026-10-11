"""
Tests for the mentor assignment endpoints:
    GET  /api/v1/mentor/{student_id}
    GET  /api/v1/mentor/{student_id}/report
    POST /api/v1/mentor/analyze

The DB layer is faked in ``conftest.py`` (reads the cleaned cohort CSV), so no
database is required. Run using: pytest tests/test_mentor_api.py -v
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _sample_roll(cohort) -> str:
    return str(cohort["roll_no"].iloc[0])


def test_mentor_analysis(cohort):
    roll = _sample_roll(cohort)
    response = client.get(f"/api/v1/mentor/{roll}")
    assert response.status_code == 200, response.text
    data = response.json()
    assert str(data["roll_no"]) == roll
    assert data["subjects"], "expected subject analysis"
    assert "report_text" in data


def test_mentor_post_matches_get(cohort):
    roll = _sample_roll(cohort)
    get_response = client.get(f"/api/v1/mentor/{roll}")
    post_response = client.post("/api/v1/mentor/analyze", json={"student_id": roll})
    assert post_response.status_code == 200
    assert post_response.json() == get_response.json()


def test_mentor_report(cohort):
    roll = _sample_roll(cohort)
    response = client.get(f"/api/v1/mentor/{roll}/report")
    assert response.status_code == 200, response.text
    data = response.json()
    assert str(data["roll_no"]) == roll
    assert data["report_text"]


def test_mentor_unknown_student_returns_404():
    assert client.get("/api/v1/mentor/does-not-exist").status_code == 404
