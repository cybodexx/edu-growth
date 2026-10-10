"""
Tests for the risk endpoints:
    GET  /api/v1/risk/{roll_no}
    POST /api/v1/risk/predict

The DB layer is faked in ``conftest.py`` (reads the cleaned cohort CSV), so no
database is required. Run using: pytest tests/test_risk_api.py -v
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

SUBJECTS = {"coa", "maths4", "dstl", "ds", "python", "cyber"}


def _sample_roll(cohort) -> str:
    return str(cohort["roll_no"].iloc[0])


def test_risk_predict_post(cohort):
    response = client.post("/api/v1/risk/predict", json={"roll_no": _sample_roll(cohort)})
    assert response.status_code == 200, response.text
    data = response.json()

    assert set(data["at_risk_subjects"]).issubset(SUBJECTS)
    assert len(data["predictions"]) == len(SUBJECTS)
    assert {p["subject"] for p in data["predictions"]} == SUBJECTS
    assert data["risk_count"] == sum(p["prediction"] for p in data["predictions"])

    for prediction in data["predictions"]:
        assert prediction["prediction"] in (0, 1)
        assert prediction["status"] in ("At Risk", "Safe")
        assert 0.0 <= prediction["probability"] <= 1.0


def test_risk_get_matches_post(cohort):
    roll_no = _sample_roll(cohort)
    get_response = client.get(f"/api/v1/risk/{roll_no}")
    post_response = client.post("/api/v1/risk/predict", json={"roll_no": roll_no})
    assert get_response.status_code == 200
    assert get_response.json() == post_response.json()


def test_risk_unknown_student_returns_404():
    assert client.get("/api/v1/risk/does-not-exist").status_code == 404


def test_risk_missing_roll_no_fails_validation():
    assert client.post("/api/v1/risk/predict", json={}).status_code == 422
