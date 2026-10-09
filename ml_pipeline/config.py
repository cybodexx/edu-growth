"""
Central configuration for the mentor assignment system.

Everything tunable lives here so the notebook, the analysis engine and the
future Neon (PostgreSQL) backend stay in sync.

Sections marked  TEMPORARY / HARDCODED  are placeholders. They will be replaced
by real values pulled from the Neon database once the backend team fills in
``ml_pipeline/db_backend.py`` (DATABASE_URL + tables).
"""
from pathlib import Path

# ---------------------------------------------------------------------------
# Subjects & labs
# ---------------------------------------------------------------------------
SUBJECT_LIST = ["coa", "maths4", "dstl", "ds", "python", "cyber"]
LAB_LIST = ["ds", "python", "coa", "cyber"]
UNITS = [1, 2, 3, 4, 5]

# Human friendly labels used in reports / frontend output
SUBJECT_LABELS = {
    "coa": "Computer Organization & Architecture",
    "maths4": "Mathematics IV",
    "dstl": "Discrete Structures & Theory of Logic",
    "ds": "Data Structures",
    "python": "Python Programming",
    "cyber": "Cyber Security",
}
LAB_LABELS = {
    "ds": "Data Structures Lab",
    "python": "Python Lab",
    "coa": "COA Lab",
    "cyber": "Cyber Security Lab",
}

# ---------------------------------------------------------------------------
# Thresholds (all percentages 0-100)
# ---------------------------------------------------------------------------
FAIL_MARKS = 40.0      # below this a unit/subject is "weak"
GOOD_MARKS = 75.0      # at or above this a student is a "topper" in that part
INTENSIVE_MARKS = 20.0  # below this => intensive tutoring required

# ---------------------------------------------------------------------------
# Clustering / risk model
# ---------------------------------------------------------------------------
N_CLUSTERS = 4
RANDOM_STATE = 42
KMEANS_FEATURES = [
    "avg_pct",
    "min_pct",
    "bad_subjects",
    "bad_labs",
    "overall_attendance_pct",
    "previous_cgpa",
    "progress_score",
]
RISK_ORDER = ["Need Help", "Fell Down", "Normal", "Topper"]
PRIORITY_MAPPING = {"Need Help": 1, "Fell Down": 2, "Normal": 3, "Topper": 4}

# ---------------------------------------------------------------------------
# Paths (absolute, resolved from the repo root so notebooks/API agree)
# ---------------------------------------------------------------------------
ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_PATH = ROOT_DIR / "data/processed/edu_growth_cleaned.csv"
DEFAULT_ARTIFACTS_DIR = ROOT_DIR / "artifacts"
ASSIGNMENTS_CSV_PATH = DEFAULT_ARTIFACTS_DIR / "mentor_assign.csv"
TEACHER_RANKING_CSV_PATH = DEFAULT_ARTIFACTS_DIR / "teacher_ranking.csv"

# ---------------------------------------------------------------------------
# Class-section -> subject/lab teacher mapping
# ---------------------------------------------------------------------------
TEACHER_DATA = {
    "coa": {
        "Dr. Sharma": ["CSE-A", "CSE-B", "IT-A"],
        "Prof. Verma": ["CSE-C", "IT-B"],
        "Dr. Ananya": ["CS-AI", "CS-DS"],
    },
    "maths4": {
        "Dr. Rajesh": ["CSE-A", "CSE-C", "CS-AI"],
        "Prof. Sneha": ["CSE-B", "IT-B"],
        "Dr. Mehta": ["IT-A", "CS-DS"],
    },
    "dstl": {
        "Prof. Gupta": ["CSE-A", "IT-B"],
        "Dr. Iyer": ["CSE-B", "CSE-C", "CS-DS"],
        "Prof. Khan": ["IT-A", "CS-AI"],
    },
    "ds": {
        "Dr. Singhal": ["CSE-A", "CSE-B"],
        "Prof. Mishra": ["CSE-C", "IT-A", "CS-AI"],
        "Dr. Kapoor": ["IT-B", "CS-DS"],
    },
    "python": {
        "Prof. Joshi": ["CSE-A", "CS-DS"],
        "Dr. Nair": ["CSE-B", "CSE-C", "IT-A"],
        "Prof. Bansal": ["IT-B", "CS-AI"],
    },
    "cyber": {
        "Dr. Saxena": ["CSE-A", "CSE-C"],
        "Prof. Tiwari": ["CSE-B", "IT-B", "CS-AI"],
        "Dr. Malhotra": ["IT-A", "CS-DS"],
    },
}

# ---------------------------------------------------------------------------
# TEMPORARY: hardcoded "this teacher's this unit is weak" overrides.
# ---------------------------------------------------------------------------
# The data-derived teacher ranking (computed inside MentorAssigner) already
# flags weak teacher+unit combinations. The entries below are an *extra*
# manual override layer used while the Neon backend is not wired up.
#
# TODO(backend): move these rows to the ``teacher_unit_weakness`` table in Neon
# and load them with ``db_backend.load_teacher_unit_weakness()``. Until then the
# engine reads them from here.
#
# Each row: subject | unit_or_component | teacher_name | note
HARDCODED_WEAK_TEACHER_UNITS = [
    # --- PLACEHOLDER ROWS (replace with real rows from the DB) --------------
    {"subject": "coa", "unit_or_component": "unit 1", "teacher_name": "Prof. Verma",
     "note": "PLACEHOLDER: unit-1 pass rate below department average"},
    {"subject": "maths4", "unit_or_component": "unit 3", "teacher_name": "Dr. Mehta",
     "note": "PLACEHOLDER: repeated low unit-3 scores"},
    # {"subject": "lab:ds", "unit_or_component": "lab overall", "teacher_name": "Dr. Kapoor",
    #  "note": "PLACEHOLDER: low lab execution scores"},
]

# Additional penalty applied to a teacher's score for an overridden unit.
# A hardcoded-weak teacher is pushed to the bottom of the recommendation queue
# unless no alternative exists.
HARDCODED_WEAK_PENALTY = 5.0

# ---------------------------------------------------------------------------
# Neon / PostgreSQL backend (fill in .env).
# ---------------------------------------------------------------------------
# The adapter is isolated in ml_pipeline/db_backend.py so the backend team only
# has to complete that one file. If DATABASE_URL is missing the pipeline
# transparently falls back to DEFAULT_DATA_PATH (CSV).
DB_ENV_VAR = "DATABASE_URL"
