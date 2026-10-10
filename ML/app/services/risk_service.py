"""
Risk prediction service (per-subject XGBoost classifiers).

Inference flow:
  1. Receive a student roll number.
  2. Fetch that student's full row from the Neon database (``db_backend.fetch_student``).
  3. Build the exact feature matrix the model expects (74 columns; missing -> 0).
  4. Apply the bundle's ``StandardScaler`` (the notebook scaled features before
     training XGBoost, so inference must scale too).
  5. ``predict_proba >= threshold`` -> per-subject "At Risk" / "Safe" flag.
  6. Best-effort: persist the summary to the ``risk_predictions`` table.

There is no CSV dependency anywhere -- the database is the single source of truth.
"""
from __future__ import annotations

import sys
from functools import lru_cache
from pathlib import Path

import joblib
import pandas as pd

# Make the repo root importable so ``ml_pipeline`` resolves wherever the server runs.
REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline import db_backend  # noqa: E402

ARTIFACTS_DIR = REPO_ROOT / "artifacts"

# subject key -> trained artifact file
RISK_MODEL_FILES = {
    "coa": "coa_risk.pkl",
    "maths4": "maths4_risk.pkl",
    "dstl": "dstl_risk.pkl",
    "ds": "ds_risk.pkl",
    "python": "python_risk.pkl",
    "cyber": "cyber_risk.pkl",
}

SUBJECT_LABELS = {
    "coa": "Computer Organization & Architecture",
    "maths4": "Mathematics IV",
    "dstl": "Discrete Structures & Theory of Logic",
    "ds": "Data Structures",
    "python": "Python Programming",
    "cyber": "Cyber Security",
}


class ModelNotAvailableError(Exception):
    """Raised when a risk model artifact is missing or cannot be loaded."""


class StudentNotFoundError(Exception):
    """Raised when the roll number is not present in the database."""


@lru_cache(maxsize=1)
def load_risk_bundles() -> dict:
    """Loads the six per-subject bundles (model + scaler + features + threshold)."""
    bundles: dict = {}
    for subject, filename in RISK_MODEL_FILES.items():
        path = ARTIFACTS_DIR / filename
        if not path.exists():
            raise ModelNotAvailableError(f"No risk model file at: {path}")
        try:
            bundles[subject] = joblib.load(path)
        except Exception as exc:  # noqa: BLE001 - surfaced to the client as HTTP 503
            raise ModelNotAvailableError(
                f"Could not load risk model '{subject}': {exc}"
            ) from exc
    return bundles


def _build_feature_frame(record: dict, features: list) -> pd.DataFrame:
    """Builds a 1-row DataFrame with the exact model features from a DB row.

    Missing / non-numeric values become 0 (the notebook filled NaNs with 0).
    """
    row = {name: pd.to_numeric(record.get(name), errors="coerce") for name in features}
    return pd.DataFrame([row], columns=features).fillna(0.0)


def predict_risk_by_roll(roll_no: str) -> dict:
    """Fetches the student from the database and scores every subject risk model."""
    record = db_backend.fetch_student(roll_no)
    if not record:
        raise StudentNotFoundError(f"No student found for '{roll_no}'.")

    bundles = load_risk_bundles()
    predictions = []
    for subject, bundle in bundles.items():
        features = list(bundle["features"])
        matrix = _build_feature_frame(record, features)

        scaler = bundle.get("scaler")
        if scaler is not None:
            matrix = pd.DataFrame(scaler.transform(matrix), columns=features)

        probability = float(bundle["model"].predict_proba(matrix)[0, 1])
        threshold = float(bundle["threshold"])
        prediction = int(probability >= threshold)

        predictions.append(
            {
                "subject": subject,
                "label": SUBJECT_LABELS.get(subject, subject),
                "probability": round(probability, 4),
                "threshold": threshold,
                "prediction": prediction,
                "status": "At Risk" if prediction == 1 else "Safe",
            }
        )

    at_risk = [p["subject"] for p in predictions if p["prediction"] == 1]

    result = {
        "roll_no": str(record.get("roll_no", roll_no)),
        "full_name": record.get("full_name"),
        "class_section": record.get("class_section"),
        "risk_count": len(at_risk),
        "at_risk_subjects": at_risk,
        "predictions": predictions,
    }
    _persist(result)
    return result


def _persist(result: dict) -> None:
    """Best-effort write of the per-student risk summary (never breaks a read)."""
    try:
        frame = pd.DataFrame(
            [
                {
                    "roll_no": result["roll_no"],
                    "weak_subject_count": result["risk_count"],
                    "weak_lab_count": 0,
                    "total_risk_count": result["risk_count"],
                    "risk_subjects": ", ".join(result["at_risk_subjects"]),
                    "risk_labs": "",
                }
            ]
        )
        db_backend.save_risk_predictions(frame)
    except Exception as exc:  # noqa: BLE001 - best effort
        print(f"[risk] could not persist risk prediction: {exc}")
