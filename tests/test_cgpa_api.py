"""
Tests for POST /api/v1/cgpa/predict and application documentation.
Run using: pytest tests/test_cgpa_api.py -v
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.student_schema import StudentCGPAInput

client = TestClient(app)
PREDICT_URL = "/api/v1/cgpa/predict"


def get_valid_payload() -> dict:
    """Returns a valid input payload complying with StudentCGPAInput."""
    payload = {}
    for name in StudentCGPAInput.model_fields:
        if name.endswith("_attendance_pct"):
            payload[name] = 85.0
        elif name == "previous_cgpa":
            payload[name] = 7.5
        elif name == "medical_leave_days":
            payload[name] = 1.0
        elif name.endswith("_delay_hours"):
            payload[name] = 4.0
        elif name == "society_participation_pc":
            payload[name] = 60.0
        else:
            payload[name] = 70.0
    payload["sports_activity_level"] = "moderate"
    return payload


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_docs_page():
    response = client.get("/docs")
    assert response.status_code == 200


def test_valid_prediction():
    response = client.post(PREDICT_URL, json=get_valid_payload())
    assert response.status_code == 200, response.text
    data = response.json()
    assert "predicted_grade" in data
    assert "confidence_score" in data
    assert "confidence_display" in data

    assert 0.0 <= data["predicted_grade"] <= 10.0
    assert 65.0 <= data["confidence_score"] <= 98.0
    assert data["confidence_display"] == f"{data['confidence_score']}%"


def test_missing_field_fails_validation():
    payload = get_valid_payload()
    del payload["previous_cgpa"]
    response = client.post(PREDICT_URL, json=payload)
    assert response.status_code == 422


def test_attendance_over_100_fails_validation():
    payload = get_valid_payload()
    payload["overall_attendance_pct"] = 150.0
    response = client.post(PREDICT_URL, json=payload)
    assert response.status_code == 422


def test_cgpa_over_10_fails_validation():
    payload = get_valid_payload()
    payload["previous_cgpa"] = 10.5
    response = client.post(PREDICT_URL, json=payload)
    assert response.status_code == 422


def test_invalid_data_type_fails_validation():
    payload = get_valid_payload()
    payload["coa_quiz_score"] = "not_a_number"
    response = client.post(PREDICT_URL, json=payload)
    assert response.status_code == 422


def test_invalid_sports_level_fails_validation():
    payload = get_valid_payload()
    payload["sports_activity_level"] = "invalid_level"
    response = client.post(PREDICT_URL, json=payload)
    assert response.status_code == 422


def test_extra_forbidden_field_fails_validation():
    payload = get_valid_payload()
    payload["unexpected_field"] = "value"
    response = client.post(PREDICT_URL, json=payload)
    assert response.status_code == 422
