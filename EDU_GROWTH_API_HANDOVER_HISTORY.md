# EduGrowth CGPA Prediction API Handover & History

## 1. Overview & What Was Implemented
Implemented the dedicated FastAPI microservice for predicting a student's final semester grade (CGPA) and confidence score based on the trained XGBoost model from `03_cgpa_prediction_model.ipynb`.

Key components implemented:
- **FastAPI Application (`app/main.py`)**: Root app with CORS middleware, `/docs` Swagger UI, and `/health` check.
- **API Routing (`app/api/v1/router.py`, `app/api/v1/endpoints/cgpa.py`)**: Defines route `POST /api/v1/cgpa/predict`.
- **Validation Schemas (`app/schemas/student_schema.py`, `app/schemas/response_schema.py`)**:
  - `StudentCGPAInput`: Validates all required student numerical inputs and `sports_activity_level` (`"high"`, `"low"`, `"moderate"`, `"none"`, `"unknown"`), with extra fields strictly forbidden (`extra="forbid"`).
  - `CGPAPredictionResponse`: Outputs the exact response schema:
    ```json
    {
      "predicted_grade": 7.5,
      "confidence_score": 82.2,
      "confidence_display": "82.2%"
    }
    ```
- **Prediction Service (`app/services/prediction_service.py`)**:
  - Loads the bundle from `artifacts/student_grade_predictor.pkl` using `joblib`.
  - Reconstructs the exact `StudentGradePredictor` class structure used in the notebook.
  - Dynamically encodes `sports_activity_level` into the 5 one-hot features (`sports_high`, `sports_low`, `sports_moderate`, `sports_none`, `sports_unknown`).
  - Converts input into the exact 63 model features in their verified feature order without altering or retraining the model.
  - Computes predictions clipped to `[0.0, 10.0]` and calculates the confidence percentage based on distance from median and historical benchmark MAE.
- **Test Suite (`tests/test_cgpa_api.py`)**:
  - Validates health check, docs, successful prediction payload, boundary checks, data type validations, and invalid one-hot values.

---

## 2. Model Path
- **Path**: `artifacts/student_grade_predictor.pkl`
- **Features Expected**: 63 features in exact order (58 numerical academic/attendance/delay features + 5 one-hot sports features).
- **PCA / Modifications**: None (model used exactly as trained).

---

## 3. Endpoint Details
- **Route**: `POST /api/v1/cgpa/predict`
- **Interactive Documentation**: `http://127.0.0.1:8000/docs`
- **Request Format**:
  JSON object with student academic, attendance, marks, lab, assignment delay features, and `sports_activity_level` (`"high"` | `"low"` | `"moderate"` | `"none"` | `"unknown"`).
- **Response Format**:
  ```json
  {
    "predicted_grade": 9.21,
    "confidence_score": 81.2,
    "confidence_display": "81.2%"
  }
  ```

---

## 4. Folder Structure
The implementation follows the exact required folder structure inside the project root:

```
edu_growth_fast_api/
│
├── artifacts/
│   └── student_grade_predictor.pkl
│
├── app/
│   ├── __init__.py
│   │
│   ├── main.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── router.py
│   │       └── endpoints/
│   │           ├── __init__.py
│   │           └── cgpa.py
│   │
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── student_schema.py
│   │   └── response_schema.py
│   │
│   └── services/
│       ├── __init__.py
│       └── prediction_service.py
│
├── tests/
│   └── test_cgpa_api.py
│
└── EDU_GROWTH_API_HANDOVER_HISTORY.md
```

---

## 5. How to Run
From the project root (`c:\Users\this pc\OneDrive\Desktop\edu_growth_fast_api`):

```bash
uvicorn app.main:app --reload
```

Interactive Swagger UI:
- Open `http://127.0.0.1:8000/docs` in your browser.

---

## 6. Testing Status
- **Automated Tests**: 9/9 tests in `tests/test_cgpa_api.py` passed (`pytest tests/test_cgpa_api.py -v`).
  - `/health` check: PASSED
  - `/docs` Swagger page loads: PASSED
  - Valid prediction request returns `predicted_grade`, `confidence_score`, and `confidence_display`: PASSED
  - Missing field rejection (HTTP 422): PASSED
  - Attendance > 100% rejection (HTTP 422): PASSED
  - CGPA > 10 rejection (HTTP 422): PASSED
  - Non-numeric field validation rejection (HTTP 422): PASSED
  - Invalid `sports_activity_level` rejection (HTTP 422): PASSED
  - Unknown/extra field rejection (HTTP 422): PASSED
- **Live HTTP Execution**: Tested live uvicorn server with HTTP requests:
  - `GET /docs` returned HTTP 200.
  - `POST /api/v1/cgpa/predict` returned valid prediction and confidence score.
  - Invalid payload returned HTTP 422 with detailed field validation errors.

---

## 7. Remaining Issues
- None. The CGPA prediction endpoint, pickle integration, feature encoding, validation, and documentation are verified and operational.
