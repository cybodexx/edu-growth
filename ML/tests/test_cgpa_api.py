"""
Tests for POST /api/v1/cgpa/predict and application documentation.

The DB layer is faked in ``conftest.py`` (reads the cleaned cohort CSV), so no
database is required. Run using: pytest tests/test_cgpa_api.py -v
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)
PREDICT_URL = "/api/v1/cgpa/predict"


def _sample_roll(cohort) -> str:
    return str(cohort["roll_no"].iloc[0])


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_docs_page():
    assert client.get("/docs").status_code == 200


def test_valid_prediction(cohort):
    response = client.post(PREDICT_URL, json={"roll_no": _sample_roll(cohort)})
    assert response.status_code == 200, response.text
    data = response.json()
    assert 0.0 <= data["predicted_grade"] <= 10.0
    assert 65.0 <= data["confidence_score"] <= 98.0
    assert data["confidence_display"] == f"{data['confidence_score']}%"


def test_unknown_student_returns_404():
    response = client.post(PREDICT_URL, json={"roll_no": "does-not-exist"})
    assert response.status_code == 404


def test_missing_roll_no_fails_validation():
    response = client.post(PREDICT_URL, json={})
    assert response.status_code == 422
