"""Export the Neon ``students`` roster to a CSV for the Mongo auth service.

The Express auth service (``backend/``) keeps its own student list in MongoDB
and authenticates students against it. The analytics service (``app/``) reads
the authoritative roster from Neon PostgreSQL. To let every Neon student log in,
run this exporter and then the Mongo importer:

    # 1. Neon -> CSV (reads DATABASE_URL from ML/.env)
    python -m scripts.export_roster_csv roster.csv

    # 2. CSV -> MongoDB (reads MONGO_URI from backend/.env)
    cd ../backend
    node scripts/importStudents.js ../ML/roster.csv --apply --unknown-as-roll

``--unknown-as-roll`` imports students whose Neon name is blank/"Unknown" using
their roll number as the name, so their derived login password is unique:
``<roll_no>@123`` (instead of a shared ``Unknown@123``).

Usage:
    python -m scripts.export_roster_csv [output.csv]
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

# Make ``ml_pipeline`` importable when run from the ML/ directory.
REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from ml_pipeline.db_backend import get_connection  # noqa: E402


def export(output_path: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT roll_no, full_name FROM students ORDER BY roll_no;")
            rows = cur.fetchall()

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["roll_no", "name"])
        for roll_no, full_name in rows:
            writer.writerow([(roll_no or "").strip(), (full_name or "").replace("\n", " ").strip()])

    blank = sum(1 for _, name in rows if not (name or "").strip())
    print(f"exported rows : {len(rows)}")
    print(f"blank names   : {blank}")
    print(f"csv           : {out.resolve()}")


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "roster.csv"
    export(target)
