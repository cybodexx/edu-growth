"""
Tests for the students CRUD endpoints:
    GET    /api/v1/students
    GET    /api/v1/students/{roll_no}
    POST   /api/v1/students
    PUT    /api/v1/students/{roll_no}
    DELETE /api/v1/students/{roll_no}

The DB layer is faked in ``conftest.py`` (cohort CSV reads + an in-memory write
store), so no database is required. Run using:
    pytest tests/test_students_api.py -v
"""
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def _sample_roll(cohort) -> str:
    return str(cohort["roll_no"].iloc[0])


def test_list_students(cohort):
    response = client.get("/api/v1/students?limit=5&offset=0")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["count"] == 5
    assert data["limit"] == 5
    assert data["total"] >= data["count"]
    assert len(data["students"]) == 5


def test_get_student(cohort):
    roll = _sample_roll(cohort)
    response = client.get(f"/api/v1/students/{roll}")
    assert response.status_code == 200, response.text
    assert str(response.json()["roll_no"]) == roll


def test_get_unknown_student_returns_404():
    assert client.get("/api/v1/students/does-not-exist").status_code == 404


def test_create_update_delete_student():
    payload = {
        "roll_no": "999900001111",
        "full_name": "Integration Test",
        "class_section": "CS-DS",
    }

    created = client.post("/api/v1/students", json=payload)
    assert created.status_code == 200, created.text
    assert str(created.json()["roll_no"]) == "999900001111"

    updated = client.put("/api/v1/students/999900001111", json={"class_section": "CS-AI"})
    assert updated.status_code == 200, updated.text
    assert updated.json()["class_section"] == "CS-AI"

    deleted = client.delete("/api/v1/students/999900001111")
    assert deleted.status_code == 200
    assert client.delete("/api/v1/students/999900001111").status_code == 404
