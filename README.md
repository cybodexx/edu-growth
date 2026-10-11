# EduGrowth

EduGrowth is an end-to-end student-performance platform made of **three**
independently runnable services:

| Part | Tech | Purpose | Local URL |
|------|------|---------|-----------|
| [`frontend/`](frontend) | React 19 + Vite + Tailwind 4 | Student & faculty dashboards, login, password reset | http://localhost:5173 |
| [`backend/`](backend) | Express 5 + MongoDB + JWT | Authentication (students & faculty), password reset, logout | http://localhost:5001 |
| [`ML/`](ML/README.md) | FastAPI + XGBoost/KMeans on PostgreSQL (Neon) | CGPA prediction, at-risk detection, mentor assignment, student CRUD | http://127.0.0.1:8000 |

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
