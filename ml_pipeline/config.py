from pathlib import Path
SUBJECT_LIST = ["coa", "maths4", "dstl", "ds", "python", "cyber"]
LAB_LIST = ["ds", "python", "coa", "cyber"]
FAIL_MARKS=40.0
GOOD_MARKS=75.0
DEFAULT_DATA_PATH = Path("data/processed/edu_growth_cleaned.csv")
DEFAULT_ARTIFACTS_DIR = Path("artifacts")
MODEL_SAVE_PATH = DEFAULT_ARTIFACTS_DIR / "mentor_models.pkl"
ASSIGNMENTS_CSV_PATH = DEFAULT_ARTIFACTS_DIR / "mentor_assign.csv"
TEACHER_RANKING_CSV_PATH = DEFAULT_ARTIFACTS_DIR / "teacher_ranking.csv"
TEACHER_DATA={
    "coa": {
        "Dr. Sharma": ["CSE-A", "CSE-B", "IT-A"],
        "Prof. Verma": ["CSE-C", "IT-B"],
        "Dr. Ananya": ["CS-AI", "CS-DS"]
    },
    "maths4": {
        "Dr. Rajesh": ["CSE-A", "CSE-C", "CS-AI"],
        "Prof. Sneha": ["CSE-B", "IT-B"],
        "Dr. Mehta": ["IT-A", "CS-DS"]
    },
    "dstl": {
        "Prof. Gupta": ["CSE-A", "IT-B"],
        "Dr. Iyer": ["CSE-B", "CSE-C", "CS-DS"],
        "Prof. Khan": ["IT-A", "CS-AI"]
    },
    "ds": {
        "Dr. Singhal": ["CSE-A", "CSE-B"],
        "Prof. Mishra": ["CSE-C", "IT-A", "CS-AI"],
        "Dr. Kapoor": ["IT-B", "CS-DS"]
    },
    "python": {
        "Prof. Joshi": ["CSE-A", "CS-DS"],
        "Dr. Nair": ["CSE-B", "CSE-C", "IT-A"],
        "Prof. Bansal": ["IT-B", "CS-AI"]
    },
    "cyber": {
        "Dr. Saxena": ["CSE-A", "CSE-C"],
        "Prof. Tiwari": ["CSE-B", "IT-B", "CS-AI"],
        "Dr. Malhotra": ["IT-A", "CS-DS"]
    }
}