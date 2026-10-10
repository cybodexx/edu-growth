"""
CGPA prediction service.

Inference flow:
  1. Receive a student roll number.
  2. Fetch that student's full row from the Neon database.
  3. Build the model's exact 63 features (58 numeric + 5 sports one-hots).
  4. Run get_prediction_confidence() from student_grade_predictor.pkl.
  5. Return predicted_grade, confidence_score, confidence_display.
"""
from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline import db_backend  # noqa: E402

MODEL_PATH = REPO_ROOT / "artifacts" / "student_grade_predictor.pkl"
SPORTS_LEVELS = ["high", "low", "moderate", "none", "unknown"]


class StudentGradePredictor:
    """
    Mirror of the StudentGradePredictor class from 03_cgpa_prediction_model.ipynb.
    Required by joblib/pickle unpickler to reconstruct the saved bundle.
    """

    def __init__(self, model, feature_columns, benchmark_err=0.0):
        self.model = model
        self.feature_columns = feature_columns
        self.benchmark_err = benchmark_err

    def get_prediction_confidence(self, student_data):
        data_aligned = student_data[self.feature_columns]
        preds = self.model.predict(data_aligned)

        results = []
        for pred in preds:
            grade_clipped = float(np.clip(pred, 0.0, 10.0))
            dist_from_median = abs(grade_clipped - 7.5) / 5.0
            confidence = 100.0 * (
                1.0 - (self.benchmark_err / 2.0) - (0.05 * dist_from_median)
            )
            confidence = float(np.clip(confidence, 65.0, 98.0))

            results.append(
                {
                    "Predicted_Grade": round(grade_clipped, 2),
                    "Confidence_Score": f"{round(confidence, 1)}%",
                }
            )

        return pd.DataFrame(results)


class ModelNotAvailableError(Exception):
    """Raised when the model file is missing or cannot be loaded."""


class StudentNotFoundError(Exception):
    """Raised when the roll number / name is not in the database."""


@lru_cache(maxsize=1)
def load_predictor() -> StudentGradePredictor:
    """Loads the predictor bundle from the local artifacts/*.pkl file."""
    # Inject StudentGradePredictor into __main__ so pickle resolves the notebook's __main__ reference
    import __main__
    if not hasattr(__main__, "StudentGradePredictor"):
        __main__.StudentGradePredictor = StudentGradePredictor

    if not MODEL_PATH.exists():
        raise ModelNotAvailableError(f"No model file at: {MODEL_PATH}")
    try:
        return joblib.load(MODEL_PATH)
    except Exception as exc:
        raise ModelNotAvailableError(f"Could not load model artifact: {exc}") from exc


def build_feature_row(record: dict, feature_columns: list) -> pd.DataFrame:
    """Builds a 1-row DataFrame with the exact model features from a DB row."""
    missing = [c for c in feature_columns if not c.startswith("sports_") and c not in record]
    if missing:
        raise ModelNotAvailableError(f"Student row is missing model features: {missing}")

    # Coerce every numeric feature to float (None / "" / strings -> NaN) so the
    # XGBoost model always receives numeric dtypes.
    row = {
        c: pd.to_numeric(record.get(c), errors="coerce")
        for c in feature_columns
        if not c.startswith("sports_")
    }
    level = record.get("sports_activity_level")
    for name in SPORTS_LEVELS:
        row[f"sports_{name}"] = int(level == name)

    return pd.DataFrame([row])[feature_columns]


def predict_cgpa_by_roll(roll_no: str) -> dict:
    """Fetches the student from the database and predicts their final grade."""
    record = db_backend.fetch_student(roll_no)
    if not record:
        raise StudentNotFoundError(f"No student found for '{roll_no}'.")

    predictor = load_predictor()
    row = build_feature_row(record, predictor.feature_columns)
    result = predictor.get_prediction_confidence(row).iloc[0]

    confidence_display = str(result["Confidence_Score"])
    confidence_score = float(confidence_display.rstrip("%"))

    return {
        "predicted_grade": float(result["Predicted_Grade"]),
        "confidence_score": confidence_score,
        "confidence_display": confidence_display,
    }
