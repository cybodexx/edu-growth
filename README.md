# EduGrowth

EduGrowth is an end-to-end student-performance platform made of **three**
independently runnable services:

| Part | Tech | Purpose | Local URL |
|------|------|---------|-----------|
| [`frontend/`](frontend) | React 19 + Vite + Tailwind 4 | Student & faculty dashboards, login, password reset | https://edu-growth-frontend.onrender.com/ |
| [`backend/`](backend) | Express 5 + MongoDB + JWT | Authentication (students & faculty), password reset, logout | https://edu-growth-auth.onrender.com/ |
| [`ML/`](ML/README.md) | FastAPI + XGBoost/KMeans on PostgreSQL (Neon) | CGPA prediction, at-risk detection, mentor assignment, student CRUD | https://edu-growth-api.onrender.com/docs#/
|

The frontend calls **both** backends: authentication goes to the Express service
(`VITE_AUTH_BASE_URL`) and analytics goes to the FastAPI service
(`VITE_API_BASE_URL`). The analytics API is public; only auth is token-protected.

## Quick start

Run the three services in three terminals.

**1 · Analytics API (`ML/`)**

```bash
cd ML
python -m pip install -r requirements.txt   # or: poetry install
cp .env.example .env                        # set DATABASE_URL (Neon Postgres)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**2 · Auth service (`backend/`)**

```bash
cd backend
npm install
cp .env.example .env                        # set MONGO_URI + JWT_SECRET
npm run dev                                 # listens on 5001 by default
```

**3 · Frontend (`frontend/`)**

```bash
cd frontend
npm install
cp .env.example .env                        # VITE_API_BASE_URL + VITE_AUTH_BASE_URL
npm run dev                                 # http://localhost:5173
```

> No MongoDB handy? The frontend ships a zero-dependency auth **mock** that
> mirrors the real backend contract: `npm run auth:mock` (from `frontend/`).

## Authentication at a glance

- **Students** identify themselves by 12-digit roll number (or email).
  - Self-registered students log in with the password they chose (bcrypt-hashed).
  - Roster students imported from the roll-number list have no stored password;
    their password is derived by the backend as `<full name>@123`
    (e.g. `Aarav Rao@123`).
  - Roster students whose name is blank or `Unknown` in the source data are
    imported with the **roll number as the name**, so their password is
    `<roll_no>@123` (e.g. `210029013131@123`).
- **Faculty** log in with `email` + password. The seeded admin account is
  `faculty@college.edu` / `teacher123` (change it for any real deployment). The
  Faculty dashboard reads the **whole roster from the analytics API**, so one
  teacher login can see every student.
- **Password reset** emails a `FRONTEND_URL/reset-password?token=...` link; the
  frontend `ResetPassword` page consumes the token. Roster students without an
  email on file get a generic response (nothing to send to).
- Logout revokes the JWT server-side (`RevokedToken` collection).

### Roster sync (Neon → MongoDB)

The analytics service reads the authoritative roster from Neon; the auth service
authenticates against MongoDB. To copy every Neon student into MongoDB (so they
can log in), run:

```bash
# 1. Neon -> CSV   (reads DATABASE_URL from ML/.env)
cd ML
python -m scripts.export_roster_csv roster.csv

# 2. CSV -> MongoDB (reads MONGO_URI from backend/.env) — insert-only, idempotent
cd ../backend
node scripts/importStudents.js ../ML/roster.csv --apply --unknown-as-roll
```

## What is where

| Path | What |
|------|------|
| [`ML/README.md`](ML/README.md) | Full analytics docs (pipeline, models, API, deploy) |
| [`ML/app/`](ML/app) | FastAPI service (CGPA + risk + mentor + students CRUD) |
| [`ML/ml_pipeline/`](ML/ml_pipeline) | Runtime library: DB backend + models |
| [`ML/notebooks/`](ML/notebooks) | Offline training & analysis notebooks (01–05) |
| [`ML/artifacts/`](ML/artifacts) | Trained models (`*.pkl`) |
| [`backend/controllers/`](backend/controllers) | Student/faculty auth, password reset, logout |
| [`backend/scripts/importStudents.js`](backend/scripts/importStudents.js) | Safe, idempotent roster CSV importer |
| [`ML/scripts/export_roster_csv.py`](ML/scripts/export_roster_csv.py) | Export the Neon roster to CSV (Neon → Mongo sync step 1) |
| [`frontend/src/api/`](frontend/src/api) | `client.js` (analytics) + `auth.js` (auth service) |
| [`render.yaml`](render.yaml) | Render Blueprint — deploys **all three** services in one click |

## System workflow & architecture

This section is the full end-to-end picture: every part on its own, all parts
combined, both databases, the mentor engine internals, the key request flows, the
Render topology, and the complete endpoint reference.

### 0 · Bird's-eye view — everything combined

```mermaid
flowchart TB
    subgraph Client["Browser"]
        UI["React SPA<br/>React 19 + Vite + Tailwind 4"]
    end

    subgraph Render["Render — one Blueprint, three services"]
        FE["edu-growth-frontend<br/>static site"]
        AUTH["edu-growth-auth<br/>Express 5 + JWT · Node web service"]
        MLAPI["edu-growth-api<br/>FastAPI · Python web service"]
    end

    subgraph MLCore["ML internals"]
        PIPE["ml_pipeline<br/>MentorAssigner + db_backend"]
        ART["artifacts/*.pkl<br/>CGPA + 6 risk models"]
    end

    NEON[("Neon PostgreSQL<br/>students · mentor_assignments<br/>risk_predictions · teacher_unit_weakness")]
    MONGO[("MongoDB Atlas<br/>students · faculties<br/>passwordresets · revokedtokens")]
    SMTP["Gmail SMTP"]
    CSV["roster.csv"]

    UI --> FE
    FE -->|"VITE_AUTH_BASE_URL<br/>login · register · logout · password reset"| AUTH
    FE -->|"VITE_API_BASE_URL<br/>CGPA · risk · mentor · students CRUD"| MLAPI
    AUTH --> MONGO
    AUTH --> SMTP
    MLAPI --> PIPE
    PIPE --> ART
    PIPE --> NEON
    NEON -->|"export_roster_csv.py"| CSV
    CSV -->|"importStudents.js"| MONGO
```

**One-line summary of responsibility:**

| Piece | Owns | Source of truth |
|-------|------|-----------------|
| `frontend/` | UI, charts, session storage (`localStorage`) | — |
| `backend/` | Identity, login, JWT, password reset, logout | **MongoDB** |
| `ML/` | CGPA prediction, risk flags, mentor assignment, student CRUD | **Neon PostgreSQL** |

---

### 1 · Frontend workflow (React SPA)

```mermaid
flowchart TB
    START(["App.jsx"]) --> TOKEN{"token in<br/>localStorage?"}
    TOKEN -->|no| LOGIN["Login.jsx"]
    TOKEN -->|yes| RESTORE["restore identity"]

    URL{"URL has<br/>/reset-password<br/>or ?token=?"} -->|yes| RESET["ResetPassword.jsx"]
    URL -->|no| TOKEN

    LOGIN -->|"student login"| ASTUD["auth.js loginStudent()"]
    LOGIN -->|"faculty login"| AFAC["auth.js loginFaculty()"]
    LOGIN -->|"offline demo"| DEMO["identities.js DEMO_CREDENTIALS"]

    ASTUD --> SAVE["saveSession token + identity"]
    AFAC --> SAVE
    DEMO --> SAVE
    SAVE --> ROLE{"identity.role"}

    ROLE -->|student| SDASH["Student.jsx"]
    ROLE -->|teacher| TDASH["Teacher.jsx"]

    SDASH --> SAPI["client.js<br/>getStudentAnalysis · predictCgpa<br/>getMentorReport · getStudent"]
    TDASH --> TAPI["client.js<br/>listStudents · getMentorAnalysis<br/>createStudent · updateStudent · deleteStudent"]
    SAPI --> ML2(["FastAPI :8000"])
    TAPI --> ML2

    SDASH -.->|"logout"| LOGOUT["logoutStudent / logoutFaculty"]
    TDASH -.->|"logout"| LOGOUT
    LOGOUT --> CLEAR["clearSession"]
```

**Pages & navigation**

| File | Role | Tabs / purpose |
|------|------|----------------|
| `App.jsx` | router + session | restores JWT, detects `/reset-password`, picks Student vs Teacher |
| `Login.jsx` | login/register | student & faculty login, register, forgot-password, offline demo fallback |
| `Student.jsx` | student dashboard | 1 Overview · 2 Marks Analytics · 3 Attendance · 4 Risk Alerts · 5 CGPA Predictor · 6 Allocated Mentors · 7 Study Station · 8 My Profile |
| `Teacher.jsx` | faculty dashboard | 1 Class Overview · 2 Student Insights · 3 Assigned & Internals · 4 Mentorship Hub · 5 Student Directory |
| `ResetPassword.jsx` | password reset | consumes `?token=` and posts the new password |
| `CgpaPredictor.jsx` | standalone predictor | calls `POST /api/v1/cgpa/predict` |

**API clients**

| Module | Talks to | Base URL env var |
|--------|----------|------------------|
| `src/api/client.js` | FastAPI analytics | `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`) |
| `src/api/auth.js` | Express auth | `VITE_AUTH_BASE_URL` (default `http://localhost:5001`) |

---

### 2 · Auth backend workflow (Express + MongoDB + JWT)

```mermaid
flowchart LR
    REQ(["HTTP request"]) --> CORS["CORS + JSON<br/>+ request logger"]
    CORS --> ROUTES{"route"}
    ROUTES -->|/api/students/*| SR["studentRoutes.js"]
    ROUTES -->|/api/faculty/*| FR["facultyRoutes.js"]

    SR --> CTRL["studentController<br/>facultyController<br/>passwordResetController<br/>logoutController"]
    FR --> CTRL

    CTRL --> GUARD{"protected?"}
    GUARD -->|yes| PROT["protect:<br/>Bearer token →<br/>RevokedToken check →<br/>jwt.verify → user lookup"]
    PROT --> ROLE["authorizeRoles<br/>student | faculty"]
    GUARD -->|no| MODELS
    ROLE --> MODELS

    MODELS["Mongoose models"] --> MONGO[("MongoDB")]
    CTRL -->|forgot-password| EMAIL["emailService → Gmail SMTP"]
    CTRL -->|login| JWT["generateToken<br/>JWT { id, role }"]
```

**Student login — how the password is verified**

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant FE as Frontend
    participant AU as Auth API
    participant DB as MongoDB
    S->>FE: roll_no + password
    FE->>AU: POST /api/students/login
    AU->>DB: find by roll_no (or email)
    DB-->>AU: student document
    alt self-registered (bcrypt hash stored)
        AU->>AU: bcrypt.compare(password, hash)
    else roster import (no stored hash)
        AU->>AU: case-insensitive match "<name>@123"
    end
    alt valid
        AU->>AU: sign JWT { id, role: student }
        AU-->>FE: { token, student }
        FE->>FE: saveSession(token, identity)
    else invalid
        AU-->>FE: 401 Invalid roll number or password
    end
```

**Password reset + logout**

```mermaid
sequenceDiagram
    autonumber
    actor S as Student
    participant FE as Frontend
    participant AU as Auth API
    participant DB as MongoDB
    participant SM as Gmail SMTP

    S->>FE: "forgot password"
    FE->>AU: POST /api/students/forgot-password
    AU->>DB: find student, store sha256(token), expiresAt=+15m
    AU->>SM: email FRONTEND_URL/reset-password?token=...
    AU-->>FE: generic "if an account exists..." (no leak)

    S->>FE: opens reset link, new password
    FE->>AU: POST /api/students/reset-password { token, newPassword }
    AU->>DB: match hashed, unexpired token
    AU->>DB: bcrypt hash new password, delete reset token
    AU-->>FE: 200 password reset

    Note over S,DB: Logout revokes the JWT
    FE->>AU: POST /api/students/logout (Bearer)
    AU->>DB: insert token into revokedtokens
```

---

### 3 · ML / Analytics API workflow (FastAPI + Neon + models)

```mermaid
flowchart TB
    REQ(["HTTP request"]) --> MW["CORS all origins<br/>+ BackendNotConfigured handler → 503"]
    MW --> ROUTER["/api/v1 router"]

    ROUTER --> E1["cgpa.py"]
    ROUTER --> E2["risk.py"]
    ROUTER --> E3["mentor.py"]
    ROUTER --> E4["students.py"]

    E1 --> PS["prediction_service"]
    E2 --> RS["risk_service"]
    E3 --> MS["mentor_service"]
    E4 --> SS["student_service"]

    PS --> ART1["student_grade_predictor.pkl"]
    RS --> ART2["6 × *_risk.pkl<br/>+ StandardScaler"]
    MS --> MENT["ml_pipeline.MentorAssigner<br/>KMeans + peer matching"]
    SS --> MENT

    PS --> DBF["ml_pipeline.db_backend"]
    RS --> DBF
    SS --> DBF
    DBF --> NEON[("Neon PostgreSQL")]
    MENT --> NEON
    RS -.->|"best-effort persist"| NEON
```

**Student analysis (mentor + CGPA + risk) — the core read flow**

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI
    participant SVC as Services
    participant NEON as Neon
    participant ART as artifacts

    FE->>API: GET /api/v1/mentor/{student_id}
    API->>SVC: get_mentor_analysis()
    SVC->>NEON: fetch_student()
    SVC->>SVC: get_assigner() — fit once, cached (lru_cache)
    SVC-->>API: risk_level, weak units, mentors, report_text
    API-->>FE: 200 JSON

    FE->>API: POST /api/v1/cgpa/predict { roll_no }
    API->>SVC: predict_cgpa_by_roll()
    SVC->>NEON: fetch_student()
    SVC->>ART: load student_grade_predictor.pkl
    SVC-->>FE: predicted_grade + confidence

    FE->>API: GET /api/v1/risk/{roll_no}
    API->>SVC: predict_risk_by_roll()
    SVC->>ART: load 6 subject risk bundles
    SVC-->>FE: per-subject At Risk / Safe
```

**Add / update a student — mentor assignment runs in the background**

```mermaid
sequenceDiagram
    autonumber
    participant FE as Frontend
    participant API as FastAPI
    participant SS as student_service
    participant NEON as Neon
    participant BG as BackgroundTasks

    FE->>API: POST /api/v1/students { 102 possible fields }
    API->>SS: add_student()
    SS->>NEON: upsert students (ON CONFLICT roll_no)
    SS->>SS: refresh_assigner() (drop cached engine)
    SS-->>API: saved row
    API-->>FE: 200 saved  (fast, DB-only)

    API-)BG: assign_mentor(roll_no)
    BG->>SS: mentor_service.reassign_student()
    SS->>NEON: refit engine + write mentor_assignments
    Note over BG,NEON: a brand-new student still gets a mentor,<br/>just after the response is returned
```

---

### 4 · Mentor engine internals (`ml_pipeline/MentorAssigner`)

```mermaid
flowchart TB
    COHORT[("Neon students<br/>full cohort")] --> PREP["prepare_features()"]
    PREP --> TRAIN["KMeans clustering<br/>n_clusters = N_CLUSTERS"]
    TRAIN --> PROF["profile clusters → group_mapping<br/>risk_level per cluster"]
    PROF --> PEER["build peer map<br/>theory / lab per section"]
    PEER --> ANALYZE{"analyze_student(roll_no)"}
    ANALYZE --> WEAK["weak units, subjects & labs"]
    WEAK --> RANK["rank hardcoded teachers<br/>mentor_score"]
    RANK --> PICK["pick primary mentor<br/>+ peer mentor"]
    PICK --> REPORT["build report_text<br/>+ priority_rank"]
    REPORT --> PERSIST[("mentor_assignments")]
    REPORT --> OUT(["JSON / text report"])
```

---

### 5 · Data model — both databases

**Neon PostgreSQL** (analytics — created automatically by `db_backend.ensure_schema()`):

```mermaid
erDiagram
    STUDENTS {
        text roll_no PK
        text full_name
        text class_section
        float previous_cgpa
        float overall_attendance_pct
        jsonb payload
        timestamptz updated_at
    }
    MENTOR_ASSIGNMENTS {
        bigint id PK
        text roll_no FK
        text subject_type
        text subject_name
        text risk_level
        int priority_rank
        text assigned_mentor_name
        text peer_mentor_name
        text assignment_reason
    }
    RISK_PREDICTIONS {
        text roll_no PK
        int weak_subject_count
        int total_risk_count
        text risk_subjects
    }
    TEACHER_UNIT_WEAKNESS {
        bigint id PK
        text subject
        text unit_or_component
        text teacher_name
    }
    STUDENTS ||--o{ MENTOR_ASSIGNMENTS : "assigned"
    STUDENTS ||--|| RISK_PREDICTIONS : "summarised"
```

> The 100+ raw academic columns live inside `students.payload` (JSONB); the
> flattened API response merges `payload` back to the top level.

**MongoDB Atlas** (auth — Mongoose collections):

```mermaid
erDiagram
    STUDENT {
        ObjectId _id PK
        string roll_no
        string name
        string email
        string password
        string class_section
        date createdAt
    }
    FACULTY {
        ObjectId _id PK
        string name
        string email
        string password
        date createdAt
    }
    PASSWORD_RESET {
        ObjectId _id PK
        ObjectId userId FK
        string token
        date expiresAt
    }
    REVOKED_TOKEN {
        ObjectId _id PK
        string token
    }
    STUDENT ||--o{ PASSWORD_RESET : "requests"
    STUDENT ||--o{ REVOKED_TOKEN : "revokes"
    FACULTY ||--o{ REVOKED_TOKEN : "revokes"
```

> Mongoose pluralises the collection names: `students`, `faculties`,
> `passwordresets`, `revokedtokens`. `roll_no` and `email` are unique **partial**
> indexes (only on documents that actually have a value).

---

### 6 · Roster sync (Neon → CSV → MongoDB)

Neon is the authoritative roster; MongoDB holds the login accounts. This keeps
the two in step:

```mermaid
flowchart LR
    NEON[("Neon students")] -->|"python -m scripts.export_roster_csv roster.csv<br/>(roll_no, name)"| CSV["roster.csv"]
    CSV -->|"node scripts/importStudents.js roster.csv --apply --unknown-as-roll<br/>(dry-run by default, insert-only)"| MONGO[("MongoDB students")]
    MONGO --> LOGIN["student login<br/>password = name@123<br/>or roll_no@123 if name was blank/Unknown"]
```

---

### 7 · Deployment topology (Render — one Blueprint)

```mermaid
flowchart TB
    subgraph RB["render.yaml — one Blueprint, one click"]
        direction TB
        S1["edu-growth-frontend<br/>runtime: static<br/>rootDir: frontend"]
        S2["edu-growth-auth<br/>runtime: node<br/>rootDir: backend"]
        S3["edu-growth-api<br/>runtime: python<br/>rootDir: ML"]
    end

    S1 -->|"VITE_API_BASE_URL = fromService RENDER_EXTERNAL_URL"| S3
    S1 -->|"VITE_AUTH_BASE_URL = fromService RENDER_EXTERNAL_URL"| S2
    S2 -->|"CORS_ORIGIN + FRONTEND_URL = fromService RENDER_EXTERNAL_URL"| S1
    S3 --> NEON[("Neon")]
    S2 --> MONGO[("MongoDB Atlas")]
```

**Public URLs (as long as the names are free):**

| Service | URL |
|---------|-----|
| Frontend | `https://edu-growth-frontend.onrender.com` |
| Auth | `https://edu-growth-auth.onrender.com` |
| ML API | `https://edu-growth-api.onrender.com` · docs at `/docs` · health at `/health` |

---

### 8 · API reference (all endpoints)

**Auth service — Express (`:5001` local)**

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | — | health / "Backend is running" |
| POST | `/api/students/register` | — | create a student account |
| POST | `/api/students/login` | — | login → JWT |
| POST | `/api/students/forgot-password` | — | request reset link |
| POST | `/api/students/reset-password` | — | complete reset |
| GET | `/api/students/profile` | Bearer (student) | current student |
| POST | `/api/students/logout` | Bearer (student) | revoke token |
| POST | `/api/faculty/register` | — | create a faculty account |
| POST | `/api/faculty/login` | — | login → JWT |
| GET | `/api/faculty/profile` | Bearer (faculty) | current faculty |
| POST | `/api/faculty/logout` | Bearer (faculty) | revoke token |
| GET | `/api/protected` | Bearer | JWT sanity check |

**Analytics API — FastAPI (`:8000` local)**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | health check |
| POST | `/api/v1/cgpa/predict` | predict final grade + confidence |
| GET | `/api/v1/risk/{roll_no}` | per-subject risk flags |
| POST | `/api/v1/risk/predict` | same, JSON body |
| GET | `/api/v1/mentor/{student_id}` | full mentor analysis |
| GET | `/api/v1/mentor/{student_id}/report` | printable text report |
| POST | `/api/v1/mentor/analyze` | analysis via JSON body |
| POST | `/api/v1/students` | add / upsert a student (mentor in background) |
| PUT | `/api/v1/students/{roll_no}` | partial update (mentor in background) |
| GET | `/api/v1/students` | list (paged, `limit`/`offset`/`search`) |
| GET | `/api/v1/students/{roll_no}` | one student |
| DELETE | `/api/v1/students/{roll_no}` | delete one student |

## One-click deploy (Render)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/cybodexx/edu-growth)

The root [`render.yaml`](render.yaml) Blueprint provisions the **whole project**
in a single sync — the FastAPI analytics API, the Express auth service, and the
React frontend:

| # | Service | Type | Root dir | Public URL |
|---|---------|------|----------|------------|
| 1 | `edu-growth-api` | Python web | `ML/` | `https://edu-growth-api.onrender.com` |
| 2 | `edu-growth-auth` | Node web | `backend/` | `https://edu-growth-auth.onrender.com` |
| 3 | `edu-growth-frontend` | Static site | `frontend/` | `https://edu-growth-frontend.onrender.com` |

> The suffix is added by Render if the name is already taken; check the
> Dashboard for the exact URLs. The ML API also serves OpenAPI docs at
> `https://edu-growth-api.onrender.com/docs` and a health check at `/health`.

### What you provide (Render prompts on the first sync)

| Variable | For | Where to get it |
|----------|-----|-----------------|
| `DATABASE_URL` | ML analytics | Neon dashboard → Connection string (`...?sslmode=require`) |
| `MONGO_URI` | Auth service | MongoDB Atlas → Connect → Drivers (allow `0.0.0.0/0`) |

Everything else is wired automatically:

- **Frontend URLs** — `VITE_API_BASE_URL` and `VITE_AUTH_BASE_URL` are copied
  from the two backends' `RENDER_EXTERNAL_URL` at build time (`fromService`).
- **Auth CORS / reset links** — `CORS_ORIGIN` and `FRONTEND_URL` are copied from
  the frontend's `RENDER_EXTERNAL_URL`.
- **`JWT_SECRET`** — Render generates a strong random value.

### After the first deploy

1. **Check the three URLs** (Dashboard → each service → the `.onrender.com` link;
   ML: open `/health` and `/docs`).
2. **Create the admin faculty account** (once) — from the auth service's Shell tab
   in the Dashboard, or locally against the deployed URL:
   ```bash
   curl -X POST https://edu-growth-auth.onrender.com/api/faculty/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Rajesh Verma","email":"faculty@college.edu","password":"teacher123"}'
   ```
3. **Copy the roster into MongoDB** so students can log in (run locally — see the
   *Roster sync* section above, pointing `MONGO_URI` at the Atlas cluster).
4. **MongoDB Atlas** → Network Access → allow `0.0.0.0/0` (Render IPs are dynamic).

> **Free tier note:** free web services sleep after ~15 min idle and cold-start in
> ~30–60 s (the static frontend does not sleep). The ML mentor engine also re-fits
> on the first request after a write, so the very first mentor call may be slow.

> **If the frontend was built before the backends existed**, its baked-in API URLs
> can be empty (it then falls back to `localhost`). Fix: open the
> `edu-growth-frontend` service → **Manual Deploy → Deploy latest commit** so Vite
> re-runs with the now-populated URLs.
