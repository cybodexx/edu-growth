"""
Neon (PostgreSQL) backend adapter  --  the ONLY file that talks to the database.

Setup (one time)
----------------
1. Put the connection string in ``.env``::

    1. Copy ``.env.example`` to ``.env`` and set ``DATABASE_URL`` to the Neon
       connection string, e.g.
           DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/edu_growth?sslmode=require
    2. (optional) run this file directly to create the tables:
           python -m ml_pipeline.db_backend --init
    3. Import the students into the ``students`` table and the ML team's
       ``mentor_assign.csv`` will be written back automatically.

If ``DATABASE_URL`` is not configured, every function raises
``BackendNotConfigured`` and the analysis pipeline transparently falls back to
the local CSV dataset, so nothing here blocks offline development.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Iterable

import pandas as pd

try:  # psycopg2 is the driver used for Neon
    import psycopg2
    from psycopg2.extras import Json, RealDictCursor, execute_values

    _PSYCOPG2_AVAILABLE = True
except Exception:  # pragma: no cover - driver missing
    _PSYCOPG2_AVAILABLE = False


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------
def _load_dotenv() -> None:
    """Minimal .env loader (no external dependency).

    Looks for a .env in the current working directory and in the repository
    root. Existing environment variables are never overwritten.
    """
    candidates = [Path.cwd() / ".env", Path(__file__).resolve().parents[1] / ".env"]
    for path in candidates:
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            key, value = key.strip(), value.strip().strip('"').strip("'")
            os.environ.setdefault(key, value)


_load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


class BackendNotConfigured(RuntimeError):
    """Raised when the database URL / driver is unavailable."""


def backend_enabled() -> bool:
    """True when a Neon connection string and the psycopg2 driver are ready."""
    return bool(DATABASE_URL) and _PSYCOPG2_AVAILABLE


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS students (
    roll_no                TEXT PRIMARY KEY,
    full_name              TEXT,
    class_section          TEXT,
    previous_cgpa          DOUBLE PRECISION,
    overall_attendance_pct DOUBLE PRECISION,
    payload                JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mentor_assignments (
    id                  BIGSERIAL PRIMARY KEY,
    roll_no             TEXT NOT NULL,
    student_name        TEXT,
    class_section       TEXT,
    risk_level          TEXT,
    priority_rank       INTEGER,
    subject_type        TEXT,          -- 'theory' | 'lab'
    subject_name        TEXT,
    subject_score_pct   DOUBLE PRECISION,
    weak_units          TEXT,
    primary_weak_unit   TEXT,
    current_teacher     TEXT,
    assigned_mentor_name TEXT,
    mentor_score        DOUBLE PRECISION,
    peer_mentor_roll    TEXT,
    peer_mentor_name    TEXT,
    assignment_reason   TEXT,
    previous_cgpa       DOUBLE PRECISION,
    attendance_pct      DOUBLE PRECISION,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (roll_no, subject_type, subject_name)
);

CREATE TABLE IF NOT EXISTS teacher_unit_weakness (
    id                  BIGSERIAL PRIMARY KEY,
    subject             TEXT,
    unit_or_component   TEXT,
    teacher_name        TEXT,
    note                TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (subject, unit_or_component, teacher_name)
);

CREATE TABLE IF NOT EXISTS risk_predictions (
    roll_no            TEXT PRIMARY KEY,
    weak_subject_count INTEGER,
    weak_lab_count     INTEGER,
    total_risk_count   INTEGER,
    risk_subjects      TEXT,
    risk_labs          TEXT,
    payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


# ---------------------------------------------------------------------------
# Connection
# ---------------------------------------------------------------------------
def get_connection():
    """Returns a new psycopg2 connection to Neon."""
    if not _PSYCOPG2_AVAILABLE:
        raise BackendNotConfigured("psycopg2 is not installed (pip install psycopg2-binary).")
    if not DATABASE_URL:
        raise BackendNotConfigured("DATABASE_URL is not set. Fill it in .env (see .env.example).")
    return psycopg2.connect(DATABASE_URL)


def ensure_schema() -> None:
    """Creates all tables if they do not exist yet."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)
        conn.commit()


# ---------------------------------------------------------------------------
# Read helpers
# ---------------------------------------------------------------------------
def fetch_students(limit: int | None = None, offset: int = 0) -> pd.DataFrame:
    """Loads students as a DataFrame (full original row from ``payload``).

    ``limit``/``offset`` are optional paging arguments; omit ``limit`` to load
    the whole cohort.
    """
    query = "SELECT roll_no, full_name, class_section, payload FROM students ORDER BY roll_no"
    params: list = []
    if limit is not None:
        query += " LIMIT %s OFFSET %s"
        params = [int(limit), int(offset)]
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()

    if not rows:
        return pd.DataFrame()

    records = []
    for row in rows:
        payload = row.get("payload") or {}
        if isinstance(payload, str):
            payload = json.loads(payload)
        # Keep the indexed columns authoritative over the JSON payload.
        payload.setdefault("roll_no", row["roll_no"])
        payload["roll_no"] = row["roll_no"]
        payload["full_name"] = row.get("full_name") or payload.get("full_name")
        payload["class_section"] = row.get("class_section") or payload.get("class_section")
        records.append(payload)
    return pd.DataFrame(records)


def fetch_student(identifier: str) -> dict | None:
    """Fetches a single student by roll number OR full name.

    Returns a plain dict (all original columns) or ``None`` when not found.
    """
    identifier = str(identifier).strip()
    query = """
        SELECT roll_no, full_name, class_section, payload
        FROM students
        WHERE roll_no = %s OR lower(full_name) = lower(%s)
        ORDER BY (roll_no = %s) DESC
        LIMIT 1;
    """
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (identifier, identifier, identifier))
            row = cur.fetchone()

    if not row:
        return None
    payload = row.get("payload") or {}
    if isinstance(payload, str):
        payload = json.loads(payload)
    payload.setdefault("roll_no", row["roll_no"])
    payload["roll_no"] = row["roll_no"]
    payload["full_name"] = row.get("full_name") or payload.get("full_name")
    payload["class_section"] = row.get("class_section") or payload.get("class_section")
    return payload


def count_students() -> int:
    """Number of student rows currently stored."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM students;")
            return int(cur.fetchone()[0])


def upsert_student(record: dict, merge: bool = True) -> dict:
    """Inserts or updates ONE student and returns the stored payload.

    ``record`` may carry any of the original columns; unknown ones are kept in
    ``payload``. With ``merge=True`` (default) incoming fields are merged onto
    the existing row, so a partial update never wipes the other columns.
    """
    roll_no = str(record.get("roll_no", "")).strip()
    if not roll_no:
        raise ValueError("roll_no is required")

    incoming = {k: _coerce(v) for k, v in record.items() if v is not None}
    incoming["roll_no"] = roll_no
    existing = fetch_student(roll_no) if merge else None
    payload = {**(existing or {}), **incoming}

    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO students
                    (roll_no, full_name, class_section, previous_cgpa,
                     overall_attendance_pct, payload)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (roll_no) DO UPDATE SET
                    full_name = EXCLUDED.full_name,
                    class_section = EXCLUDED.class_section,
                    previous_cgpa = EXCLUDED.previous_cgpa,
                    overall_attendance_pct = EXCLUDED.overall_attendance_pct,
                    payload = EXCLUDED.payload,
                    updated_at = now();
                """,
                (
                    roll_no,
                    _coerce(payload.get("full_name")),
                    _coerce(payload.get("class_section")),
                    _coerce(payload.get("previous_cgpa")),
                    _coerce(payload.get("overall_attendance_pct")),
                    Json(payload),
                ),
            )
        conn.commit()
    return payload


def delete_student(roll_no: str) -> bool:
    """Deletes one student and all derived rows. True when the row existed."""
    roll_no = str(roll_no).strip()
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM mentor_assignments WHERE roll_no = %s;", (roll_no,))
            cur.execute("DELETE FROM risk_predictions WHERE roll_no = %s;", (roll_no,))
            cur.execute("DELETE FROM students WHERE roll_no = %s;", (roll_no,))
            deleted = cur.rowcount > 0
        conn.commit()
    return deleted


def fetch_assignment_keys() -> set[tuple[str, str, str]]:
    """Returns the (roll_no, subject_type, subject_name) keys already stored.

    Used by ``MentorAssigner.ensure_assignments`` to only create the assignments
    that are still missing for a student.
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT roll_no, subject_type, subject_name FROM mentor_assignments;")
            return {(str(r[0]), str(r[1]), str(r[2])) for r in cur.fetchall()}


def load_teacher_unit_weakness() -> list[dict]:
    """Returns the teacher+unit weakness override rows from Neon."""
    with get_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT subject, unit_or_component, teacher_name, note "
                "FROM teacher_unit_weakness;"
            )
            return [dict(r) for r in cur.fetchall()]


def save_risk_predictions(df: pd.DataFrame) -> int:
    """Stores per-student risk output (from the risk endpoint, best effort)."""
    if df is None or df.empty:
        return 0
    rows = []
    for _, row in df.iterrows():
        data = {k: _coerce(v) for k, v in row.to_dict().items()}
        rows.append((
            str(data.get("roll_no")),
            _coerce(data.get("weak_subject_count")),
            _coerce(data.get("weak_lab_count")),
            _coerce(data.get("total_risk_count")),
            _coerce(data.get("risk_subjects")),
            _coerce(data.get("risk_labs")),
            Json(data),
        ))
    sql = """
        INSERT INTO risk_predictions
            (roll_no, weak_subject_count, weak_lab_count, total_risk_count,
             risk_subjects, risk_labs, payload)
        VALUES %s
        ON CONFLICT (roll_no) DO UPDATE SET
            weak_subject_count = EXCLUDED.weak_subject_count,
            weak_lab_count = EXCLUDED.weak_lab_count,
            total_risk_count = EXCLUDED.total_risk_count,
            risk_subjects = EXCLUDED.risk_subjects,
            risk_labs = EXCLUDED.risk_labs,
            payload = EXCLUDED.payload,
            updated_at = now();
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows)
        conn.commit()
    return len(rows)


# ---------------------------------------------------------------------------
# Write helpers (used by the mentor engine to persist results)
# ---------------------------------------------------------------------------
def _coerce(value):
    """Converts pandas/numpy scalars to plain Python values for psycopg2."""
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if hasattr(value, "item"):
        try:
            return value.item()
        except Exception:
            return value
    return value


def _records_from_df(df: pd.DataFrame, columns: Iterable[str]) -> list[tuple]:
    out = []
    for _, row in df.iterrows():
        out.append(tuple(_coerce(row.get(col)) for col in columns))
    return out


def save_mentor_assignments(df: pd.DataFrame) -> int:
    """Upserts mentor assignments (one row per student + subject/lab)."""
    if df is None or df.empty:
        return 0
    columns = [
        "roll_no", "student_name", "class_section", "risk_level", "priority_rank",
        "subject_type", "subject_name", "subject_score_pct", "weak_units",
        "primary_weak_unit", "current_teacher", "assigned_mentor_name",
        "mentor_score", "peer_mentor_roll", "peer_mentor_name",
        "assignment_reason", "previous_cgpa", "attendance_pct",
    ]
    records = _records_from_df(df, columns)
    update_cols = [c for c in columns if c not in ("roll_no", "subject_type", "subject_name")]
    sql = f"""
        INSERT INTO mentor_assignments ({", ".join(columns)})
        VALUES %s
        ON CONFLICT (roll_no, subject_type, subject_name) DO UPDATE SET
            {", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)},
            created_at = now();
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, records)
        conn.commit()
    return len(records)


def save_teacher_unit_weakness(records: list[dict]) -> int:
    """Replaces the teacher+unit weakness override rows."""
    if not records:
        return 0
    rows = [
        (r.get("subject"), r.get("unit_or_component"), r.get("teacher_name"), r.get("note"))
        for r in records
    ]
    sql = """
        INSERT INTO teacher_unit_weakness (subject, unit_or_component, teacher_name, note)
        VALUES %s
        ON CONFLICT (subject, unit_or_component, teacher_name) DO UPDATE SET
            note = EXCLUDED.note,
            updated_at = now();
    """
    with get_connection() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows)
        conn.commit()
    return len(rows)


# ---------------------------------------------------------------------------
# CLI: python -m ml_pipeline.db_backend --init
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Neon backend helper")
    parser.add_argument("--init", action="store_true", help="create tables if missing")
    parser.add_argument("--status", action="store_true", help="print connection status")
    args = parser.parse_args()

    if not backend_enabled():
        print("Backend NOT configured.")
        print("  psycopg2 available :", _PSYCOPG2_AVAILABLE)
        print("  DATABASE_URL set   :", bool(DATABASE_URL))
        print("Fill DATABASE_URL in .env (see .env.example) and retry.")
    else:
        if args.init:
            ensure_schema()
            print("Schema created / verified.")
        elif args.status:
            with get_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT count(*) FROM students;")
                    print("students rows:", cur.fetchone()[0])
        else:
            print("Backend configured. Use --init to create tables or --status to inspect.")
