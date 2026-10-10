# EduGrowth — Presentation Content (PPT / PDF ready)

> Slide-by-slide content for the final semester project presentation.
> All output examples below use **real data** from the live Neon database
> (student `210029023375`, Aarav Rao, CS-DS).
>
> Tip: keep slides light — the two real API responses (Risk + CGPA) and one
> mentor report screenshot make the biggest impact. Show `/docs` (Swagger UI)
> live during the demo.

---

## Slide 1 — Title
- **EduGrowth — Intelligent Student Performance Analytics**
- Subtitle: CGPA Prediction · Mentor Assignment · At-Risk Alerting
- Team / Guide name / Course / Semester
- **Visual:** clean title slide, EduGrowth logo, one-row tagline: "Predict. Mentor. Alert."
- **Note:** 15-second pitch in one line: "We turn one semester of raw exam + assignment
  marks into three live decisions — predicted CGPA, a mentor for every weak area, and
  per-subject at-risk flags."

## Slide 2 — Problem
- Teachers see marks, but not **what to do** with them.
- No early warning → weak students are discovered too late.
- Mentor allocation is manual, slow, and biased.
- CGPA estimation at semester-end is a guess.
- **Visual:** 4 boxes: "No early warning", "Manual mentoring", "Lots of marks, few insights", "One-size-fits-all".
- **Note:** frame it in one sentence — "Marks are collected, but they are not being turned into action."

## Slide 3 — Solution
- One FastAPI backend + one Neon database + trained ML models.
- **CGPA prediction** → predicted final grade + confidence.
- **Risk prediction** → per-subject at-risk flags (6 subjects).
- **Mentor assignment** → unit/subject/lab-wise analysis + a mentor for every weak area.
- **Visual:** 3 feature cards (CGPA / Risk / Mentor) with one-line description each.
- **Note:** all three features read the same student record — one database, one pipeline.

## Slide 4 — Tech Stack
| Layer | Choice |
|---|---|
| Backend API | Python · FastAPI · Uvicorn |
| Database | Neon (serverless PostgreSQL) |
| ML | pandas, numpy, scikit-learn, XGBoost |
| Models | joblib `.pkl` artifacts (CGPA + 6 risk bundles) |
| Deploy | Render (Blueprint, Root Directory `ML/`) |
| Frontend (separate) | desktop client on top of this API |
- **Visual:** logo strip / table.
- **Note:** emphasise "100% database-backed — the API never reads CSV files at runtime."

## Slide 5 — End-to-End Pipeline
```
raw marks ──> 01 data cleaning ──> clean cohort ──> 02 PCA analysis
                                                      │
                       ┌──────────────────────────────┤
                       ▼                              ▼
                 03 CGPA model                  05 risk models (x6)
                       │                              │
                       ▼                              ▼
              artifacts/*.pkl  <── joblib ──  FastAPI (app/)  ──> Neon DB
                       │
                       ▼
                 04 mentor engine (KMeans + ranking)
```
- **Visual:** the diagram above (mermaid or drawn boxes).
- **Note:** notebooks 01–05 are offline training; runtime uses only the exported pkls + DB.

## Slide 6 — Data
- ~2,000 students, seeded from the cleaned cohort.
- Per student: roll no, name, section, unit-wise marks for 6 subjects
  (PUT/ST1/ST2), lab marks, sports, attendance.
- One clean CSV (`data/processed/edu_growth_cleaned.csv`) → Neon `students` table.
- 6 subjects: COA, Maths-4, DSTL, DS, Python, Cyber.
- **Visual:** sample row table + small donut of subjects.
- **Note:** cleaning notebook de-duplicates, fixes wrong values, handles outliers,
  fills missing, repairs grades (e.g. `&` → `,` marks).

## Slide 7 — Database Design (Neon)
- 4 tables, auto-created by the backend:
  1. `students` — cohort (~2,000 rows)
  2. `mentor_assignments` — engine output per student (~4,800 rows)
  3. `risk_predictions` — per-student per-subject risk flags
  4. `teacher_unit_weakness` — weak units per subject, per section
- `DATABASE_URL` via env; adapter in `ml_pipeline/db_backend.py`.
- **Visual:** simple ERD with 4 boxes.
- **Note:** only ONE DB implementation file — intentionally simple so the ML team
  can read and extend it.

## Slide 8 — CGPA Prediction Model (03)
- XGBoost regressor trained on ~2,000 students.
- 63 features (58 numeric + 5 sports one-hots).
- Output: predicted grade (out of 10) + confidence score.
- **Real output:**
  ```json
  { "predicted_grade": 6.27, "confidence_score": 81.7, "confidence_display": "81.7%" }
  ```
- **Visual:** the JSON snippet + a grade histogram behind it.
- **Note:** `confidence_score` comes from the model's internal probability spread —
  "how sure the model is about this student".

## Slide 9 — Risk Prediction Model (05)
- One XGBoost **classifier per subject** (6 bundles: coa, maths4, dstl, ds,
  python, cyber) — 74 features each.
- Per-subject probability + threshold (e.g. COA threshold 0.4).
- A student is "at risk" in a subject when the probability crosses its threshold.
- **Real output (student `210029023375`):** 6/6 subjects at risk; COA probability `0.9279`
  with threshold `0.4`.
- **Visual:** 6 small gauge cards (red/amber/green).
- **Note:** this is the **live risk feature** — separate from the mentor KMeans
  clustering; risk = per-subject classifiers, mentor = behaviour clusters + ranking.

## Slide 10 — Mentor Assignment (04)
- KMeans clustering (k=4, seed 42) over performance features:
  - Cluster 2 → **Need Help** · high priority (1)
  - Cluster 3 → **Fell Down**
  - Cluster 4 → **Normal**
  - Cluster 5 → **Topper**
- Then a **hardcoded mentor ranking** (`ml_pipeline/config.py`) picks the best
  mentor per weak unit/subject/lab.
- Output written to `mentor_assignments` (~4,800 rows).
- **Real output for Aarav Rao:** `risk_level: "Need Help"`, `priority_rank: 1`,
  `needs_intervention: true`, `cluster_id: 2`.
- **Visual:** 4-cluster scatter + mentor-card mock.
- **Note:** first call fits the engine (~5 s), then it is cached in-process via `lru_cache`.

## Slide 11 — One Backend, Three Features
```
POST /api/v1/cgpa/predict   {"roll_no": "..."}
GET  /api/v1/risk/{roll_no}            -> per-subject flags
GET  /api/v1/mentor/{student_id}       -> full analysis + report
     (+ mentor /report & /analyze, students CRUD)
```
- All read the same `students` row from Neon.
- Plus Swagger UI at `/docs` — clickable, no client needed.
- **Visual:** route-map / 3 arrows into the API box.
- **Note:** frontend team was handed `test/FRONTEND_API_DETAILS.txt` — a one-page API spec.

## Slide 12 — Students CRUD
- `GET/POST/PUT/DELETE /api/v1/students/**` — full CRUD against Neon.
- Needed so new students can be added without re-running notebooks.
- **Real output:** `GET /api/v1/students/210029023375` → full row (ds_put_marks 44.2,
  coa_st1_marks 14.1, lab + unit marks…).
- **Visual:** table of a student row.
- **Note:** this API surface is what the teacher panel calls for lookups.

## Slide 13 — API Health & Deploy
- `GET /health` → `{"status":"healthy","service":"edu_growth_api"}`
- Render Blueprint: Python 3.11.9, Poetry deps, root directory `ML/`,
  start command `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- `DATABASE_URL` set in the Dashboard → build log prints `POETRY DEPS OK`.
- **Visual:** Render dashboard screenshot.
- **Note:** one click to deploy; the whole project lives in one `ML/` folder.

## Slide 14 — Repository Structure
```
ML/                      <- everything (backend + ML) in one folder
├── app/                 FastAPI (endpoints, services, schemas)
├── ml_pipeline/         db_backend.py, config.py, mentor_assigner.py
├── notebooks/           01–05 (offline training)
├── artifacts/           model pkls (CGPA + 6 risk)
├── data/                cleaned cohort (offline notebooks only)
├── test/ tests/         API spec + pytest
└── README.md, pyproject.toml, requirements.txt, runtime.txt
(root: render.yaml + README.md + .gitignore)
```
- **Visual:** the tree above.
- **Note:** frontend is out of scope for this folder — the API is the contract.

## Slide 15 — Demo Flow
1. Open `/docs`.
2. `GET /health` → healthy.
3. `POST /cgpa/predict` (roll `210029023375`) → `6.27` with `81.7%`.
4. `GET /risk/210029023375` → 6 at-risk flags (COA 0.9279 > 0.4 …).
5. `GET /mentor/210029023375` → Need Help, priority 1, full report text.
6. Browse one student row via `/students`.
- **Visual:** 5 thumbnails (each response).
- **Note:** keep it under 3 minutes — real data beats screenshots.

## Slide 16 — Risk Deep Dive (the live feature)
- Merged from `main` — the current branch (`PRANAV-PRAJAPATI`) carries it plus
  the consolidated `ML/` layout.
- Every request hits `risk_predictions` + the 6 XGBoost bundles.
- Threshold per subject tuned so alerts are actionable, not noisy.
- **Visual:** one risk JSON card.
- **Note:** sample roll numbers for the demo: `210029023375` (all at risk),
  `210029014227` (mixed), `210029038252` (mentor sample).

## Slide 17 — Mentor Report (real)
```
Student: Aarav Rao (CS-DS) — Roll 210029023375
Risk level: Need Help · Priority rank: 1 · Intervention: YES
Weak spots: COA (unit 4), Maths-4 (unit 2), DSTL (unit 3), DS (lab)...
Mentors: assigned per weak area (from config.py ranking)
```
- **Visual:** screenshot of `GET /mentor/210029023375/report`.
- **Note:** mentors come from the hardcoded ranking; peer-matching is the
  next iteration.

## Slide 18 — Why FastAPI + Neon
- FastAPI: async, typed (pydantic), auto docs (`/docs`), tiny code.
- Neon: serverless Postgres — free tier, zero ops, one connection string.
- joblib pkls → no model server needed; loads at startup.
- **Visual:** 3 bullet cards.
- **Note:** whole runtime = ~5 Python files for services + 1 DB adapter.

## Slide 19 — Tests & Quality
- Offline pytest suite (risk + CGPA endpoints) — DB layer monkeypatched with the
  cleaned CSV so tests run without a network.
- Live smoke: health + all three predictions against the real DB.
- **Real:** CGPA test expects grade in range; risk test checks known at-risk rolls.
- **Visual:** green test run card.
- **Note:** tests live in `ML/tests/`; bring them up with `pytest tests/`.

## Slide 20 — ML vs Backend work split
| | Team | Deliverable |
|---|---|---|
| Notebooks 01–05 | ML team | cleaned data, models, pkls |
| `ml_pipeline/` | ML team | DB adapter + engine exports |
| `app/` | backend | FastAPI endpoints + services |
| tests / docs | both | pytest + README + API spec |
- **Visual:** two-column split.
- **Note:** one folder (`ML/`) keeps both halves together so nobody hunts for files.

## Slide 21 — Achievements
- CGPA predictor live: `6.27` / `81.7%` confidence for a real student.
- Risk feature live: 6 subjects scored with real thresholds (e.g. COA 0.9279 > 0.4).
- Mentor engine: ~4,800 assignments, first-call cached.
- Full CRUD + 6 API routes, deployed on Render with Poetry + Python 3.11.9.
- **Visual:** KPI cards.
- **Note:** every number on this slide was produced against the live DB minutes ago.

## Slide 22 — Path notes (repo hygiene)
- Everything consolidated under `ML/` (bug fix: earlier commit had deleted
  notebooks 01–03 + the CGPA pkl and left duplicate copies).
- Render blueprint: `rootDir: ML`; run/start from inside `ML/`.
- `.env` stays local (never committed); use `.env.example`.
- **Visual:** single screenshot of the new `ML/` tree.
- **Note:** worth saying one slide: "we fixed the structure as part of the work."

## Slide 23 — Future Work
- Peer-to-peer mentor matching (replace hardcoded ranking).
- Frontend teacher/student panels consuming this exact API.
- Rebuild risk thresholds from live semester data.
- Cohort drift monitoring + model refresh job.
- **Visual:** roadmap arrow.
- **Note:** honest next steps the team would pick if the semester continued.

## Slide 24 — Thank You / Q&A
- Demo-ready endpoints + sample roll numbers on the slide.
- QR code → GitHub branch `PRANAV-PRAJAPATI`.
- Contact: team members.
- **Visual:** QR + one-line recap: "Predict. Mentor. Alert."
- **Note:** keep the Swagger tab open for impromptu demos.

---

## Appendix A — Sample roll numbers for demos
| Roll no | What to show |
|---|---|
| `210029023375` | Aarav Rao — 6/6 at risk, CGPA 6.27, Need Help (priority 1) |
| `210029014227` | mixed risk profile |
| `210029038252` | **not** in DB → 404 (good to show error handling) |

## Appendix B — Key API responses used on slides
- Risk (COA): probability `0.9279` vs threshold `0.4` → **At Risk**
- Risk total: `risk_count: 6`, subjects `[coa, maths4, dstl, ds, python, cyber]`
- CGPA: `predicted_grade: 6.27`, `confidence_score: 81.7`
- Mentor: `risk_level: "Need Help"`, `priority_rank: 1`, `cluster_id: 2`