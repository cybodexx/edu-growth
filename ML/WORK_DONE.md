# WORK DONE — edu-growth

_Last updated: 2026-10-09_
_Repo: `E:\HAPPY\edu-growth\edu-growth` · branch `PRANAV-PRAJAPATI`_

This document splits the work into the **ML side** (data, models, mentor logic)
and the **backend side** (API, database, deployment). It is written to be usable
in a project presentation.

---

## 0. Project at a glance

`edu-growth` predicts a student's **CGPA** and shows their **mentor assignment**
(a per-subject/unit intervention plan). It exposes a **FastAPI** backend that
reads student data from a **Neon PostgreSQL** database and returns predictions.
A JavaFX desktop client consumes the API (auth is handled separately by the
client's own MongoDB + JS system).

| Layer | Tech |
|---|---|
| API | FastAPI + Uvicorn |
| Database | Neon PostgreSQL (`DATABASE_URL`) |
| Models | XGBoost (CGPA); KMeans + ranking (mentor) |
| ML notebook | Jupyter (`notebooks/`) |
| Deploy target | Render (`render.yaml`) |

---

## 1. ML-side work (data + model + mentor logic)

| # | Work | File | Detail |
|---|---|---|---|
| 1 | **Mentor engine → DB only** | `ml_pipeline/mentor_assigner.py` | Algorithm unchanged (KMeans k=4 + hardcoded mentor ranking + peer round-robin). Data source changed: `load()` reads Neon `students`; `assign_all(persist=True)` writes to `mentor_assignments`; `run_pipeline()` reads/writes Neon only. Removed CSV load/fallback and CSV export helpers. |
| 2 | **Config cleanup** | `ml_pipeline/config.py` | Removed path constants (`ROOT_DIR`, `DEFAULT_DATA_PATH`, `DEFAULT_ARTIFACTS_DIR`, `ASSIGNMENTS_CSV_PATH`). Mentor ranking / thresholds unchanged. |
| 3 | **Notebook 04 → DB based** | `notebooks/04_mentor_clustering_model.ipynb` | Was CSV based, now reads `students` and writes `mentor_assignments`. |
| 4 | **Notebooks 01/02/03/05** | `notebooks/01..05` | Were temporarily moved to DB, then **reverted to original (offline CSV)** as requested. Net: unchanged. |
| 5 | **Data seeding** | Neon `students` | Cleaned cohort — 2000 rows (random, seed 42) seeded into `students`. Old CSVs (raw / cleaned / PCA / mentor_assign) deleted. |
| 6 | **Model artifact** | `artifacts/student_grade_predictor.pkl` | CGPA predictor (63 features). Pre-existing — used as-is, not retrained. Risk model not present. |

> **Important for presentation:** the mentor *algorithm* and the CGPA *model*
> were not designed/retrained here. The ML-side contribution is mainly
> **moving them onto the database**, **seeding data**, and the **notebook-04 DB
> integration**.

### Deleted data files (no longer needed)
- `data/raw/messy_edu_growth_99_columns.csv`
- `data/processed/edu_growth_cleaned.csv`
- `data/pca_transformed/edu_growth_pca.csv`
- `artifacts/mentor_assign.csv`

---

## 2. Backend-side work (API + DB + deploy)

### 2.1 Database layer — `ml_pipeline/db_backend.py`
The single file that talks to the database (Auto schema creation).

- **Tables**: `students`, `mentor_assignments`, `teacher_unit_weakness`, `risk_predictions`
- **Student CRUD**: `fetch_students`, `fetch_student`, `count_students`, `upsert_student`, `delete_student`, `import_students`
- **Mentor**: `save_mentor_assignments`, `fetch_assignment_keys`
- **Teacher overrides**: `load/save_teacher_unit_weakness`
- **Risk (reserved)**: `save_risk_predictions`, `fetch_risk_predictions`
- **CLI**: `python -m ml_pipeline.db_backend --init | --status | --reset`

### 2.2 FastAPI application — `app/`

| File | Work |
|---|---|
| `app/api/v1/endpoints/cgpa.py` | `POST /cgpa/predict` now takes `{"roll_no": ...}` → fetch from DB → predict (404/503 handling) |
| `app/services/prediction_service.py` | DB row → 63 features → `.pkl` model → prediction; **bug fix**: null `previous_cgpa` (109 students) caused HTTP 500 — now numeric-coerced |
| `app/api/v1/endpoints/mentor.py` + `app/services/mentor_service.py` | Mentor endpoints, `lru_cache`, `refresh_assigner()`, `reassign_student()` |
| `app/api/v1/endpoints/students.py` **(NEW)** + `app/services/student_service.py` **(NEW)** | add / update / list / get / delete; add & update trigger **auto mentor assignment + DB save** |
| `app/schemas/student_schema.py` | `StudentRollInput`, `StudentCreate`, `StudentUpdate` |
| `app/api/v1/router.py` | Wire the students router |
| `app/main.py` | API description (auth is separate) |
| `.env.example` | `DATABASE_URL`, `JWT_SECRET_KEY` |

### 2.3 Deployment / config
- `render.yaml` **(NEW)** — Render blueprint (`uvicorn app.main:app`, health `/health`, `DATABASE_URL`)
- `requirements.txt` **(NEW)**
- `.env.example` — Neon connection string

### 2.4 Runtime verification
- Uvicorn server restarted and live-tested: health / cgpa / mentor / students → all OK.
- CGPA prediction swept over **all 2000 students → 0 failures**.

---

## 3. API endpoints (as deployed)

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | health check |
| POST | `/api/v1/cgpa/predict` | predict final grade from a `roll_no` |
| POST | `/api/v1/mentor/analyze` | analyse an ad-hoc student payload |
| GET | `/api/v1/mentor/{student_id}` | mentor assignment for a student |
| GET | `/api/v1/mentor/{student_id}/report` | full mentor report |
| POST | `/api/v1/students` | add a student (auto mentor) |
| GET | `/api/v1/students` | list students |
| GET | `/api/v1/students/{roll_no}` | get one student |
| PUT | `/api/v1/students/{roll_no}` | update a student (re-assign mentor) |
| DELETE | `/api/v1/students/{roll_no}` | delete a student + derived rows |

Docs: `http://127.0.0.1:8000/docs`

---

## 4. Database tables (Neon)

| Table | Contents | Rows |
|---|---|---|
| `students` | cleaned cohort (full original row in `payload` JSONB) | 2000 |
| `mentor_assignments` | one row per student + weak subject/lab | 4813 |
| `teacher_unit_weakness` | manual teacher/unit overrides | 0 |
| `risk_predictions` | per-student risk output (reserved for risk endpoint) | 0 |

---

## 5. Pending / stubs (not implemented)

| File | Status |
|---|---|
| `app/api/v1/endpoints/risk.py` | stub — risk endpoint deferred |
| `app/api/v1/endpoints/velocity.py` | stub |
| `app/api/v1/endpoints/pca_analytics.py` | stub |
| `app/core/config.py`, `app/core/database.py`, `app/core/security.py` | stub |
| `app/services/pca_service.py`, `app/schemas/pca_schema.py` | stub |

**Next up:** risk prediction endpoint — needs the risk model file from the ML side.

---

## 6. How to run

```bash
# 1. environment
#   .env  ->  DATABASE_URL=postgresql://...neon.tech/edu_growth?sslmode=require

# 2. create tables (one time)
python -m ml_pipeline.db_backend --init

# 3. run the API
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 4. quick checks
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/api/v1/cgpa/predict \
     -H "Content-Type: application/json" -d "{\"roll_no\":\"210029038252\"}"
```

Deploy on Render using the blueprint in `render.yaml`.

---

## 7. File inventory (vs git HEAD)

**Modified**
```
.env.example
README.md
app/api/v1/endpoints/cgpa.py
app/api/v1/router.py
app/core/config.py
app/core/security.py
app/main.py
app/schemas/student_schema.py
app/services/mentor_service.py
app/services/prediction_service.py
ml_pipeline/config.py
ml_pipeline/db_backend.py
ml_pipeline/mentor_assigner.py
notebooks/04_mentor_clustering_model.ipynb
```

**New**
```
app/api/v1/endpoints/students.py
app/services/student_service.py
render.yaml
requirements.txt
WORK_DONE.md
```

**Deleted**
```
artifacts/mentor_assign.csv
data/pca_transformed/edu_growth_pca.csv
data/processed/edu_growth_cleaned.csv
data/raw/messy_edu_growth_99_columns.csv
```
