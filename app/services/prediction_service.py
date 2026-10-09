"""
CGPA prediction service.

Inference flow:
  1. Validates and receives student input data.
  2. Encodes sports activity level using the 5 one-hot features:
     sports_high, sports_low, sports_moderate, sports_none, sports_unknown.
  3. Builds a single-row DataFrame aligned with the model's exact 63 features.
  4. Calls get_prediction_confidence() from student_grade_predictor.pkl.
  5. Returns predicted_grade, confidence_score, and confidence_display.
"""
from functools import lru_cache
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.schemas.student_schema import StudentCGPAInput

MODEL_PATH = Path(__file__).resolve().parents[2] / "artifacts" / "student_grade_predictor.pkl"
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


@lru_cache(maxsize=1)
def load_predictor() -> StudentGradePredictor:
    """Loads the predictor pickle once and caches it in memory."""
    if not MODEL_PATH.exists():
        raise ModelNotAvailableError(f"Model file not found at: {MODEL_PATH}")

    # Inject StudentGradePredictor into __main__ so pickle resolves the notebook's __main__ reference
    import __main__
    if not hasattr(__main__, "StudentGradePredictor"):
        __main__.StudentGradePredictor = StudentGradePredictor

    try:
        return joblib.load(MODEL_PATH)
    except Exception as exc:
        raise ModelNotAvailableError(f"Could not load model artifact: {exc}") from exc


def build_feature_row(student: StudentCGPAInput, feature_columns: list) -> pd.DataFrame:
    """Converts student input into a 1-row DataFrame matching the exact 63 features."""
    data = student.model_dump()
    level = data.pop("sports_activity_level")
    for name in SPORTS_LEVELS:
        data[f"sports_{name}"] = int(level == name)

    row = pd.DataFrame([data])
    missing = [c for c in feature_columns if c not in row.columns]
    if missing:
        raise ModelNotAvailableError(f"Features missing from input row: {missing}")

    # Enforce exact feature order from the model
    return row[feature_columns]


def predict_cgpa(student: StudentCGPAInput) -> dict:
    """Predicts CGPA and computes confidence score."""
    predictor = load_predictor()
    row = build_feature_row(student, predictor.feature_columns)
    result = predictor.get_prediction_confidence(row).iloc[0]

    confidence_display = str(result["Confidence_Score"])
    confidence_score = float(confidence_display.rstrip("%"))

    return {
        "predicted_grade": float(result["Predicted_Grade"]),
        "confidence_score": confidence_score,
        "confidence_display": confidence_display,
    }
