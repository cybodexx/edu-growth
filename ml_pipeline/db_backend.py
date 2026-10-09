"""
Neon (PostgreSQL) backend adapter  --  the ONLY file that talks to the database.

Setup (one time)
----------------
1. Put the connection string in ``.env``::

       DATABASE_URL=postgresql://user:password@ep-xxx.aws.neon.tech/edu_growth?sslmode=require

2. Create the tables::

       python -m ml_pipeline.db_backend --init

After that every part of the project (mentor engine, API) reads and writes only
the database. There is no CSV dependency anywhere in the runtime code.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

import pandas as pd
import psycopg2
from psycopg2.extras import Json, RealDictCursor, execute_values


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
def _load_dotenv() -> None:
    """Minimal ``.env`` loader (no external dependency)."""
    for path in (Path.cwd() / ".env", Path(__file__).resolve().parents[1] / ".env"):
        if not path.exists():
            continue
        for raw in path.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


class BackendNotConfigured(RuntimeError):
    """Raised when ``DATABASE_URL`` is not set."""


def backend_enabled() -> bool:
    """True when a database connection string is configured."""
    return bool(DATABASE_URL)


def get_connection():
    """Returns a new psycopg2 connection to Neon."""
    if not DATABASE_URL:
        raise BackendNotConfigured("DATABASE_URL is not set. Fill it in .env (see .env.example).")
    return psycopg2.connect(DATABASE_URL)


@contextmanager
def _connect():
    """Opens a connection, commits on success, and ALWAYS closes it.

    (``with psycopg2.connect(...)`` only commits/rolls back -- it does not close,
    which leaks connections and makes the Neon pooler drop us.)
    """
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Schema (created automatically)
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
    id                   BIGSERIAL PRIMARY KEY,
    roll_no              TEXT NOT NULL,
    student_name         TEXT,
    class_section        TEXT,
    risk_level           TEXT,
    priority_rank        INTEGER,
    subject_type         TEXT,          -- 'theory' | 'lab'
    subject_name         TEXT,
    subject_score_pct    DOUBLE PRECISION,
    weak_units           TEXT,
    primary_weak_unit    TEXT,
    current_teacher      TEXT,
    assigned_mentor_name TEXT,
    mentor_score         DOUBLE PRECISION,
    peer_mentor_roll     TEXT,
    peer_mentor_name     TEXT,
    assignment_reason    TEXT,
    previous_cgpa        DOUBLE PRECISION,
    attendance_pct       DOUBLE PRECISION,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (roll_no, subject_type, subject_name)
);

CREATE TABLE IF NOT EXISTS teacher_unit_weakness (
    id                BIGSERIAL PRIMARY KEY,
    subject           TEXT,
    unit_or_component TEXT,
    teacher_name      TEXT,
    note              TEXT,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
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


def ensure_schema() -> None:
    """Creates every table if it does not exist yet."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute(SCHEMA_SQL)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _clean(value):
    """pandas/numpy scalar -> plain Python value (NaN -> None)."""
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


# ---------------------------------------------------------------------------
# Students: import (one time) + read
# ---------------------------------------------------------------------------
_STUDENT_COLUMNS = ["roll_no", "full_name", "class_section",
                    "previous_cgpa", "overall_attendance_pct", "payload"]
_STUDENT_SQL = f"""
    INSERT INTO students ({", ".join(_STUDENT_COLUMNS)})
    VALUES %s
    ON CONFLICT (roll_no) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        class_section = EXCLUDED.class_section,
        previous_cgpa = EXCLUDED.previous_cgpa,
        overall_attendance_pct = EXCLUDED.overall_attendance_pct,
        payload = EXCLUDED.payload,
        updated_at = now();
"""


def reset_students() -> None:
    """Deletes every student + mentor assignment (fresh start)."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE students, mentor_assignments RESTART IDENTITY;")


def import_students(df: pd.DataFrame, chunk_size: int = 500,
                    sample: int | None = None, seed: int = 42) -> int:
    """Bulk-inserts / updates student rows from a DataFrame (one-time seed).

    The full original row is stored in ``payload`` (JSONB); a few columns are
    also promoted for indexing / quick lookups. Idempotent: safe to re-run.

    ``sample`` : when set, only that many rows are picked at random.
    """
    if sample and len(df) > sample:
        df = df.sample(n=sample, random_state=seed).reset_index(drop=True)
    records = []
    for _, row in df.iterrows():
        payload = {key: _clean(value) for key, value in row.to_dict().items()}
        records.append((
            str(row["roll_no"]),
            _clean(row.get("full_name")),
            _clean(row.get("class_section")),
            _clean(row.get("previous_cgpa")),
            _clean(row.get("overall_attendance_pct")),
            Json(payload),
        ))

    conn = get_connection()
    cur = conn.cursor()
    done = 0
    try:
        for start in range(0, len(records), chunk_size):
            chunk = records[start:start + chunk_size]
            attempts = 0
            while True:
                try:
                    execute_values(cur, _STUDENT_SQL, chunk, page_size=chunk_size)
                    conn.commit()
                    break
                except (psycopg2.OperationalError, psycopg2.InterfaceError):
                    attempts += 1
                    if attempts > 3:
                        raise
                    try:  # reconnect and retry the same chunk (upsert is idempotent)
                        cur.close()
                    except Exception:
                        pass
                    conn.close()
                    conn = get_connection()
                    cur = conn.cursor()
            done += len(chunk)
            if done % 2500 == 0 or done == len(records):
                print(f"  imported {done}/{len(records)}")
    finally:
        try:
            cur.close()
        except Exception:
            pass
        conn.close()
    return len(records)


def fetch_students(limit: int | None = None, offset: int = 0) -> pd.DataFrame:
    """Loads students as a DataFrame (full original row from ``payload``).

    ``limit`` is optional -- when omitted every student is returned.
    """
    query = "SELECT payload FROM students ORDER BY roll_no"
    params: list = []
    if limit is not None:
        query += " LIMIT %s OFFSET %s"
        params = [int(limit), int(offset)]
    with _connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            rows = cur.fetchall()
    return pd.DataFrame([r["payload"] for r in rows]) if rows else pd.DataFrame()


def fetch_student(identifier: str) -> dict | None:
    """Fetches one student by roll number OR full name (else ``None``)."""
    identifier = str(identifier).strip()
    query = """
        SELECT payload
        FROM students
        WHERE roll_no = %s OR lower(full_name) = lower(%s)
        ORDER BY (roll_no = %s) DESC
        LIMIT 1;
    """
    with _connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (identifier, identifier, identifier))
            row = cur.fetchone()
    return dict(row["payload"]) if row else None


def count_students() -> int:
    """Number of student rows currently stored."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM students;")
            return int(cur.fetchone()[0])


def upsert_student(record: dict, merge: bool = True) -> dict:
    """Inserts or updates ONE student and returns the stored payload.

    ``record`` may carry any of the original columns; unknown ones live in
    ``payload``. With ``merge=True`` (default) incoming fields are merged onto
    the existing row, so a partial update never wipes the other columns.
    """
    roll_no = str(record.get("roll_no", "")).strip()
    if not roll_no:
        raise ValueError("roll_no is required")

    incoming = {k: _clean(v) for k, v in record.items() if v is not None}
    incoming["roll_no"] = roll_no
    existing = fetch_student(roll_no) if merge else None
    payload = {**(existing or {}), **incoming}

    with _connect() as conn:
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
                    _clean(payload.get("full_name")),
                    _clean(payload.get("class_section")),
                    _clean(payload.get("previous_cgpa")),
                    _clean(payload.get("overall_attendance_pct")),
                    Json(payload),
                ),
            )
    return payload


def delete_student(roll_no: str) -> bool:
    """Deletes one student and all derived rows. True when the row existed."""
    roll_no = str(roll_no).strip()
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM mentor_assignments WHERE roll_no = %s;", (roll_no,))
            cur.execute("DELETE FROM risk_predictions WHERE roll_no = %s;", (roll_no,))
            cur.execute("DELETE FROM students WHERE roll_no = %s;", (roll_no,))
            return cur.rowcount > 0


# ---------------------------------------------------------------------------
# Mentor assignments
# ---------------------------------------------------------------------------
def fetch_assignment_keys() -> set[tuple[str, str, str]]:
    """Returns (roll_no, subject_type, subject_name) already stored."""
    with _connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT roll_no, subject_type, subject_name FROM mentor_assignments;")
            return {(str(r[0]), str(r[1]), str(r[2])) for r in cur.fetchall()}


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
    records = [tuple(_clean(row.get(col)) for col in columns) for _, row in df.iterrows()]
    update_cols = [c for c in columns if c not in ("roll_no", "subject_type", "subject_name")]
    sql = f"""
        INSERT INTO mentor_assignments ({", ".join(columns)})
        VALUES %s
        ON CONFLICT (roll_no, subject_type, subject_name) DO UPDATE SET
            {", ".join(f"{c} = EXCLUDED.{c}" for c in update_cols)},
            created_at = now();
    """
    with _connect() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, records, page_size=500)
    return len(records)


# ---------------------------------------------------------------------------
# Teacher-unit weakness overrides
# ---------------------------------------------------------------------------
def load_teacher_unit_weakness() -> list[dict]:
    """Returns the teacher+unit weakness override rows."""
    with _connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT subject, unit_or_component, teacher_name, note "
                "FROM teacher_unit_weakness;"
            )
            return [dict(r) for r in cur.fetchall()]


def save_teacher_unit_weakness(records: list[dict]) -> int:
    """Upserts teacher+unit weakness override rows."""
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
    with _connect() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows)
    return len(rows)


# ---------------------------------------------------------------------------
# Risk predictions (per-student; the risk endpoint will read/write this)
# ---------------------------------------------------------------------------
def save_risk_predictions(df: pd.DataFrame) -> int:
    """Stores per-student risk output (notebook 05)."""
    if df is None or df.empty:
        return 0
    rows = []
    for _, row in df.iterrows():
        data = {k: _clean(v) for k, v in row.to_dict().items()}
        rows.append((
            str(data.get("roll_no")),
            _clean(row.get("weak_subject_count")),
            _clean(row.get("weak_lab_count")),
            _clean(row.get("total_risk_count")),
            _clean(row.get("risk_subjects")),
            _clean(row.get("risk_labs")),
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
    with _connect() as conn:
        with conn.cursor() as cur:
            execute_values(cur, sql, rows, page_size=500)
    return len(rows)


def fetch_risk_predictions() -> pd.DataFrame:
    """Loads the risk table as a DataFrame."""
    with _connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT payload FROM risk_predictions ORDER BY roll_no;")
            rows = cur.fetchall()
    return pd.DataFrame([r["payload"] for r in rows]) if rows else pd.DataFrame()


# ---------------------------------------------------------------------------
# CLI
#   python -m ml_pipeline.db_backend --init
#   python -m ml_pipeline.db_backend --status
#   python -m ml_pipeline.db_backend --reset
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Neon backend helper")
    parser.add_argument("--init", action="store_true", help="create tables if missing")
    parser.add_argument("--status", action="store_true", help="print row counts")
    parser.add_argument("--reset", action="store_true", help="delete all students + assignments")
    args = parser.parse_args()

    if not backend_enabled():
        print("Backend NOT configured. Set DATABASE_URL in .env and retry.")
    elif args.init:
        ensure_schema()
        print("Tables created / verified.")
    elif args.reset:
        reset_students()
        print("Cleared students + assignments.")
    elif args.status:
        with _connect() as conn:
            with conn.cursor() as cur:
                counts = {}
                for table in ("students", "mentor_assignments",
                              "risk_predictions", "teacher_unit_weakness"):
                    cur.execute(f"SELECT count(*) FROM {table};")
                    counts[table] = cur.fetchone()[0]
        for table, n in counts.items():
            print(f"{table:<22}: {n}")
    else:
        print("Backend configured. Use --init, --status or --reset.")
