# EduGrowth — Student Performance Analytics Platform

An end-to-end data-science platform that turns raw, messy student records into
**actionable academic insights**: cleaned data, dimensionality reduction, CGPA
prediction, risk detection, and **automatic mentor assignment** — exposed through
a FastAPI service and an ML library.

- **Data →** clean the raw cohort → engineered feature tables.
- **Models →** PCA, CGPA regression, per-subject risk classifiers, KMeans mentor clustering.
- **Serve →** FastAPI endpoints (`/api/v1/...`) for CGPA & risk predictions, mentor plans, and student CRUD.
- **No fragile model files for mentors:** the mentor engine re-fits in ~5 s.

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/cybodexx/edu-growth">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render" height="40">
  </a>
</p>

---

## 1. What the project contains

| Area | What it does | Where |
|---|---|---|
| **Data cleaning** | de-duplicate, fix wrong values, handle outliers, fill missing, repair grades | `notebooks/01_eda_data_cleaning.ipynb` |
| **Dimensionality reduction** | standardise features, inspect explained variance, PCA transform | `notebooks/02_pca_dimensionality_reduction.ipynb` |
| **CGPA prediction** | XGBoost regressor → predicted final grade + confidence | `notebooks/03_cgpa_prediction_model.ipynb`, `artifacts/student_grade_predictor.pkl` |
| **Mentor assignment** | unit/subject/lab analysis, KMeans risk clustering, hardcoded mentor ranking, peer matching | `notebooks/04_mentor_clustering_model.ipynb`, `ml_pipeline/` |
| **Risk prediction** | per-subject XGBoost risk classifiers, served live by the API | `notebooks/05_risk_prediction.ipynb`, `app/services/risk_service.py`, `artifacts/*_risk.pkl` |
| **Serving layer** | FastAPI app: CGPA + risk + mentor + students CRUD endpoints | `app/` |
| **Database layer** | Neon / PostgreSQL adapter (**required**; all reads/writes + auto tables) | `ml_pipeline/db_backend.py` |
| **Desktop UI** | JavaFX client (planned / scaffold) | `frontend_javafx/` |

---

## 2. End-to-end data & model pipeline

```mermaid
flowchart TD
    RAW["raw data<br/>(offline notebooks)"] --> NB1["01 · EDA &amp; Data Cleaning"]
    NB1 --> PROC["cleaned cohort"]
    PROC -->|"seeded once"| DB[("Neon students")]

    NB3["03 · CGPA Prediction<br/>XGBoost regressor"] --> M3["artifacts/student_grade_predictor.pkl"]

    DB --> NB4["04 · Mentor Assignment<br/>KMeans + hardcoded mentor ranking"]
    NB4 --> MA[("Neon mentor_assignments")]

    NB5["05 · Risk Prediction<br/>per-subject XGBoost"] --> M5["artifacts/*_risk.pkl (6)"]

    DB --> API["FastAPI<br/>app/"]
    M3 --> API
    M5 --> API
    API --> UI["JavaFX desktop client"]
```

---

## 3. System architecture

```mermaid
flowchart LR
    subgraph Stored["Stored data"]
        NEON["Neon DB<br/>students · mentor_assignments · risk_predictions · teacher_unit_weakness"]
        ART["artifacts/<br/>CGPA + risk pkl"]
    end

    subgraph Training["notebooks/ (offline training & analysis)"]
        N1["01 clean"]
        N2["02 PCA"]
        N3["03 CGPA"]
        N4["04 mentor"]
        N5["05 risk"]
    end

    subgraph Runtime["ml_pipeline/ (importable library)"]
        CFG["config.py"]
        MA["mentor_assigner.py"]
        DB["db_backend.py"]
    end

    subgraph Service["app/ (FastAPI)"]
        MAIN["main.py"]
        CGP["POST /cgpa/predict"]
        RIS["POST /risk/predict"]
        MEN["mentor endpoints"]
        STD["students CRUD"]
    end

    subgraph Client["Clients"]
        JFX["frontend_javafx (JavaFX)"]
        DOCS["Swagger /docs"]
    end

    N1 --> NEON
    N2 --> ART
    N3 --> ART
    N4 --> NEON
    N5 --> ART
    ART --> CGP
    ART --> RIS
    CFG --> MA
    NEON --> DB
    DB --> MA
    MA --> MEN
    MAIN --> CGP
    MAIN --> RIS
    MAIN --> MEN
    MAIN --> STD
    CGP --> JFX
    RIS --> JFX
    MEN --> JFX
    STD --> JFX
    MAIN --> DOCS
```

---

## 4. Notebooks

| # | Notebook | Input | Output |
|---|---|---|---|
| 01 | `01_eda_data_cleaning.ipynb` | raw CSV (offline) | cleaned CSV (offline) |
| 02 | `02_pca_dimensionality_reduction.ipynb` | cleaned CSV (offline) | PCA CSV (offline) |
| 03 | `03_cgpa_prediction_model.ipynb` | cleaned CSV (offline) | `artifacts/student_grade_predictor.pkl` |
| 04 | `04_mentor_clustering_model.ipynb` | Neon `students` | Neon `mentor_assignments` |
| 05 | `05_risk_prediction.ipynb` | cleaned CSV (offline) | `artifacts/*_risk.pkl` (6 per-subject XGBoost bundles) |

Notebooks 01/02/03/05 are **offline** training/analysis (the running app never
invokes them). Only notebook 04 touches the DB.

**01 — EDA & Cleaning.** Load raw → check duplicates → column lists → missing
values → clean text → fix wrong values → detect outliers → fill missing text
numbers → repair final grade → univariate / bivariate / multivariate plots → save.

**02 — PCA.** `StandardScaler` + `PCA`, explained-variance plots, component
weights, transformed feature matrix saved for downstream use.

**03 — CGPA model.** One-hot encodes `sports_activity_level`, drops outlier /
grade-missing rows, trains an **XGBoost regressor** (with a RandomForest section),
evaluates MAE/RMSE/R², and persists the 63-feature predictor bundle to
`artifacts/`.

**04 — Mentor.** KMeans risk clustering + hardcoded mentor ranking + mentor
plans (detailed in §5).

**05 — Risk.** Builds binary risk labels per subject (`< 65 %`), trains an
**XGBoost** classifier per subject, tunes each decision threshold, and writes six
per-subject bundles (`artifacts/coa_risk.pkl`, `maths4_risk.pkl`,
`dstl_risk.pkl`, `ds_risk.pkl`, `python_risk.pkl`, `cyber_risk.pkl`) that the
FastAPI risk endpoint loads at runtime.

---

## 5. Mentor assignment subsystem (deep dive)

Fully implemented in `ml_pipeline/` and usable at runtime (no notebook needed).

### 5.1 Pipeline

```mermaid
flowchart TD
    S1["1 · Load cohort from Neon<br/>(DATABASE_URL required)"] --> S2
    S2["2 · prepare_features()<br/>marks → unit % · subject % · lab %<br/>weakness counts · progress score"] --> S3
    S3["3 · _train_clusters()<br/>StandardScaler + KMeans(k=4)<br/>Need Help / Fell Down / Normal / Topper"] --> S4
    S4["4 · MENTOR_RANKING (config)<br/>hardcoded best→worst teacher per subject/lab<br/>+ hardcoded weak overrides"] --> S5
    S5["5 · _build_peer_map()<br/>top-5 non-weak peers per section"] --> S6
    S6["6 · analyze_student(roll_no_or_name)<br/>units · subjects · labs · mentors · peers"] --> S7["JSON dict + report_text"]
    S6 --> S8["assign_all() → flat assignment table"]
```

### 5.2 How a mentor is chosen

```mermaid
flowchart TD
    A["Student + subject/unit"] --> B{"score or any unit<br/>below 40%?"}
    B -- No --> C["No intervention needed"]
    B -- Yes --> D["Look up hardcoded mentor ranking<br/>for the weakest unit"]
    D --> E{"Candidate ==<br/>own teacher?"}
    E -- Yes --> F["Skip"]
    E -- No --> G{"Hardcoded-weak?"}
    G -- Yes --> H["Keep as fallback"]
    G -- No --> I["✅ Assign best mentor"]
    F --> D
    H --> D
    D --> J{"Any candidate left?"}
    J -- "weak only" --> K["Use fallback"]
    J -- "own teacher only" --> L["Same teacher"]
    J -- none --> M["No Mentor Available"]
    I --> N["Attach peer mentor<br/>(round-robin top-5)"]
    K --> N
    L --> N
```

### 5.3 Risk clustering model

```mermaid
flowchart LR
    F["7 features<br/>avg_pct · min_pct · bad_subjects · bad_labs<br/>attendance · previous_cgpa · progress_score"] --> SC["StandardScaler"]
    SC --> KM["KMeans(k=4, seed=42)"]
    KM --> G0["Need Help · priority 1"]
    KM --> G1["Fell Down · priority 2"]
    KM --> G2["Normal · priority 3"]
    KM --> G3["Topper · priority 4"]
```

> This in-process KMeans clustering (used for mentor priority) is separate from
> the six per-subject risk classifiers persisted as `artifacts/*_risk.pkl` and
> served at `/api/v1/risk/...`.

### 5.4 Example mentor report

```text
Kavya Verma | 210029038252 | CSE-A
Need Help | priority 1
'Need Help' (priority 1). 10 mentor intervention(s) required.
COA 21.8 % | weak: Unit 1, Unit 2, Unit 3, Unit 4, Unit 5 | mentor: Dr. Ananya
MATHS4 33.9 % | weak: Unit 2, Unit 3, Unit 4, Unit 5 | mentor: Prof. Sneha
DSTL 15.8 % | weak: Unit 1, Unit 2, Unit 3, Unit 4, Unit 5 | mentor: Prof. Khan
DS 6.5 % | weak: Unit 1, Unit 2, Unit 3, Unit 4, Unit 5 | mentor: Dr. Kapoor
PYTHON 8.4 % | weak: Unit 1, Unit 2, Unit 3, Unit 4, Unit 5 | mentor: Dr. Nair
CYBER 21.9 % | weak: Unit 1, Unit 2, Unit 3, Unit 4, Unit 5 | mentor: Dr. Malhotra
DS LAB 34.9 % | weak: Execution, Viva | mentor: Dr. Kapoor
PYTHON LAB 33.3 % | weak: Execution, Viva | mentor: Dr. Nair
COA LAB 18.8 % | weak: Execution, Viva | mentor: Prof. Verma
CYBER LAB 19.4 % | weak: Execution, Viva | mentor: Prof. Tiwari
```

```python
from ml_pipeline import get_student_mentor, get_student_report

get_student_report("210029038252")   # the text report above
get_student_mentor("210029038252")   # full detailed dict (for the API)
get_student_mentor("Kavya Verma")    # name lookup works too
```

---

## 6. Repository structure

> **Everything lives in the `ML/` folder** (ML + DB + FastAPI + notebooks +
> models + tests). The repo root only keeps `README.md` (navigation),
> `render.yaml` (Render Blueprint with `rootDir: ML`) and `.gitignore`.
> The tree below is relative to `ML/`.

```text
ML/
├── ml_pipeline/                 # importable runtime library
│   ├── config.py                # subjects, thresholds, hardcoded mentor ranking, overrides
│   ├── mentor_assigner.py       # mentor engine (KMeans + hardcoded ranking + assignment)
│   ├── db_backend.py            # Neon/PostgreSQL adapter (auto tables, DB-only)
│   └── __init__.py              # public exports
├── notebooks/                   # offline training & analysis
│   ├── 01_eda_data_cleaning.ipynb
│   ├── 02_pca_dimensionality_reduction.ipynb
│   ├── 03_cgpa_prediction_model.ipynb
│   ├── 04_mentor_clustering_model.ipynb
│   └── 05_risk_prediction.ipynb
├── app/                         # FastAPI service
│   ├── main.py
│   ├── api/v1/router.py
│   ├── api/v1/endpoints/        # cgpa + risk + mentor + students (done), velocity/pca (stubs)
│   ├── schemas/                 # pydantic models (student, mentor, risk, response)
│   ├── services/                # prediction_service + risk_service + mentor_service + student_service
│   └── core/                    # config/database/security (stubs)
├── data/processed/edu_growth_cleaned.csv  # kept for offline notebooks only; runtime never reads CSVs
├── artifacts/                   # trained models: CGPA predictor + 6 risk bundles (*_risk.pkl)
├── frontend_javafx/             # desktop client (scaffold)
├── test/FRONTEND_API_DETAILS.txt # API spec handed to the frontend team
├── tests/                       # pytest: CGPA + risk API tests
├── render.yaml                  # Render blueprint (one-click deploy)
├── runtime.txt                  # pins Python 3.11.9 for Render builds
├── pyproject.toml               # Poetry manifest (Render installs deps via Poetry)
├── requirements.txt             # pip mirror of the same dependencies
├── .env.example                 # environment template
├── WORK_DONE.md                 # ML vs backend work split
└── README.md
```

---

## 7. Quickstart

```bash
# Run everything from inside the ML/ folder (this is the project root now):
cd ML

# --- 1) Neon setup (one time) --------------------------------------------
copy .env.example .env          # then set DATABASE_URL (Neon connection string)
python -m ml_pipeline.db_backend --init
python -m ml_pipeline.db_backend --status      # cleaned cohort already seeded (2000 rows)

# The CGPA model is loaded from artifacts/student_grade_predictor.pkl.
# To (re)build it, run notebook 03 (offline).

# --- 2) Mentor engine (reads Neon, writes mentor_assignments) -------------
python -c "from ml_pipeline import run_pipeline; run_pipeline()"
python -c "from ml_pipeline import get_student_report; print(get_student_report('<roll_no>'))"

# --- 3) FastAPI service ---------------------------------------------------
uvicorn app.main:app --reload
# docs: http://127.0.0.1:8000/docs
```

### One-click deploy on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/cybodexx/edu-growth)

1. Click the **Deploy to Render** button (repo `cybodexx/edu-growth`).
2. Render reads `render.yaml` and creates the Web Service automatically. The
   Blueprint sets **Root Directory = `ML`** (`rootDir`), so the build and start
   commands run inside `ML/`: Python **3.11.9** (`ML/runtime.txt`),
   dependencies via **Poetry** (`ML/pyproject.toml`), start command
   `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`, `/health` probe.
3. Set the env var **`DATABASE_URL`** to your Neon connection string.
4. **Apply / Deploy** → live in ~2–3 minutes. Check `/health` and `/docs`.

> The button deploys from the repo's default branch (`main`). The consolidated
> `ML/` layout (all backend + ML in one folder, `rootDir: ML`) lives on branch
> `PRANAV-PRAJAPATI` — deploy that branch via the Render branch selector
> (or Manual Deploy) for the latest state.

---

## 8. API

The API is **public** — no token required. Authentication/authorization is
handled by the separate **MongoDB + JS** auth service (two panels: **teacher**
and **student**); this FastAPI only serves analytics.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | health probe |
| `POST` | `/api/v1/cgpa/predict` | body `{"roll_no": "..."}` → XGBoost CGPA + confidence |
| `GET` | `/api/v1/mentor/{student_id}` | full mentor analysis JSON (roll no **or** name) |
| `GET` | `/api/v1/mentor/{student_id}/report` | printable text report |
| `POST` | `/api/v1/mentor/analyze` | same as GET, JSON body `{"student_id": "..."}` |
| `GET` | `/api/v1/risk/{roll_no}` | per-subject risk flags (6 XGBoost classifiers) |
| `POST` | `/api/v1/risk/predict` | body `{"roll_no": "..."}` → same as GET |
| `POST` | `/api/v1/students` | add/upsert a student (any columns) → **auto mentor** |
| `PUT` | `/api/v1/students/{roll_no}` | partial update → **re-assign mentor** |
| `GET` | `/api/v1/students` | list students (paged: `?limit=&offset=`) |
| `GET` | `/api/v1/students/{roll_no}` | one student's full row |
| `DELETE` | `/api/v1/students/{roll_no}` | delete a student + all derived rows |
| — | `/api/v1/pca/...`, `/api/v1/velocity/...` | ⬜ stubs |

### Data source

The engine reads **only** `DATABASE_URL` (Neon). The cleaned cohort was seeded
**once** into the `students` table (2000 rows); there is **no CSV dependency** in
the code or at runtime. New students are added/updated straight through the
`/api/v1/students` endpoints and immediately get a mentor. Mentor choices come
from the hardcoded rankings in `ml_pipeline/config.py`. The trained CGPA model is
loaded from `artifacts/student_grade_predictor.pkl`; the six per-subject risk
models from `artifacts/*_risk.pkl`. See `ml_pipeline/db_backend.py`.

```bash
uvicorn app.main:app --reload
# CGPA: send just the roll number
curl -X POST http://127.0.0.1:8000/api/v1/cgpa/predict -H "Content-Type: application/json" -d "{\"roll_no\":\"210029038252\"}"
curl http://127.0.0.1:8000/api/v1/risk/210029038252
curl -X POST http://127.0.0.1:8000/api/v1/risk/predict -H "Content-Type: application/json" -d "{\"roll_no\":\"210029038252\"}"
curl http://127.0.0.1:8000/api/v1/mentor/210029038252
curl http://127.0.0.1:8000/api/v1/mentor/210029038252/report
# OpenAPI docs: http://127.0.0.1:8000/docs
```

The mentor endpoints wrap the same engine used by notebook 04
(`ml_pipeline.get_student_mentor`). The fitted engine is cached in-process
(`lru_cache`), so the first request pays the ~5 s fit and the rest are fast.
Unknown roll numbers return **404**; if the engine cannot be fitted, **503**.
The risk endpoints behave the same way (404 unknown roll, 503 model files
missing).

---

## 9. Data & artifacts

| Path | Description |
|---|---|
| `artifacts/student_grade_predictor.pkl` | CGPA model bundle (63 features); loaded by the app for CGPA prediction |
| `artifacts/*_risk.pkl` | six per-subject XGBoost risk bundles (coa / maths4 / dstl / ds / python / cyber); loaded by `/api/v1/risk/...` |
| `data/processed/edu_growth_cleaned.csv` | cleaned cohort (kept for offline notebooks only — the running app never reads CSV) |

### Database (required)

`DATABASE_URL` must be set. Everything (notebook 04, mentor engine, API) reads
and writes **only** Neon. Tables (auto-created by `--init`):

| Table | Holds |
|---|---|
| `students` | the cleaned cohort (2000 rows; full original row in `payload` JSONB) |
| `mentor_assignments` | one row per student + weak subject/lab (4813 rows) |
| `teacher_unit_weakness` | manual teacher/unit overrides |
| `risk_predictions` | per-student risk output (written by `/api/v1/risk/...`) |

### Deploy on Render

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/cybodexx/edu-growth)
&nbsp;·&nbsp; manual: `https://render.com/deploy?repo=https://github.com/cybodexx/edu-growth`

`render.yaml` is a ready blueprint: Python 3.11.9 (`runtime.txt`), dependencies
installed via Poetry (`pyproject.toml`), start command
`python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`, `/health` probe,
and `DATABASE_URL` read from the dashboard (set it to your Neon string). No CSV
or local data file is used at runtime.

```mermaid
flowchart LR
    SEED["cleaned cohort<br/>(seeded once)"] --> NEON[("Neon PostgreSQL<br/>students (2000 rows)")]
    NEON --> ENGINE["mentor engine + API<br/>(reads students)"]
    ENGINE -->|"assignments"| NEON
    API["/api/v1/students"] -->|"add / update"| NEON
    PKL[("artifacts/*.pkl")] --> PRED["CGPA predictor"]
```

---

## 10. Configuration (`ml_pipeline/config.py`)

| Constant | Value | Meaning |
|---|---|---|
| `SUBJECT_LIST` | coa, maths4, dstl, ds, python, cyber | theory subjects |
| `LAB_LIST` | ds, python, coa, cyber | labs |
| `UNITS` | 1–5 | unit numbers |
| `FAIL_MARKS` | `40.0` | below → weak (mentor needed) |
| `GOOD_MARKS` | `75.0` | at/above → "topper" band |
| `INTENSIVE_MARKS` | `20.0` | below → intensive tutoring |
| `N_CLUSTERS` | `4` | risk levels |
| `RANDOM_STATE` | `42` | reproducibility |
| `TEACHER_DATA` | class-section → teacher map | who teaches what |
| `MENTOR_RANKING` | best→worst teacher per subject/lab | hardcoded mentor preference (no analysis) |
| `HARDCODED_WEAK_TEACHER_UNITS` | 2 placeholder rows | manual "teacher weak at unit" overrides |

---

## 11. Tech stack

`Python 3.11` · `pandas` · `numpy` · `scikit-learn` (PCA, KMeans, LogisticRegression,
StandardScaler) · `xgboost` (CGPA + risk) · `matplotlib` / `seaborn` (notebook
charts) · `psycopg2` (Neon/PostgreSQL) · `FastAPI` + `uvicorn` (API) · `pytest`
(API tests) · `Pydantic` (schemas) · `joblib` (model persistence) · `Jupyter`
(notebooks) · `JavaFX` (desktop client).

---

## 12. Developer notes

The mentor engine is documented **line by line** in a local developer guide
(kept out of version control — see `.gitignore`):

- `tests/MENTOR_GUIDE.md` — every mentor file, the notebook, and how to build the
  FastAPI mentor endpoint.
- `BACKEND_SETUP.md` — Neon setup steps.
