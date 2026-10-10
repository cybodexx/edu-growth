# EduGrowth

EduGrowth = CGPA prediction + Mentor assignment + At-Risk detection, served by a
single FastAPI backend on top of a Neon (PostgreSQL) database.

> **Note:** all project code, docs and artifacts now live inside the
> **[`ML/`](ML/README.md)** folder. This root only keeps the deploy/navigation
> files, so Render's Blueprint (Root Directory = `ML`) keeps working.

## What is where

| Path | What |
|------|------|
| [`ML/README.md`](ML/README.md) | Full project docs (pipeline, API, setup, deploy) |
| [`ML/app/`](ML/app) | FastAPI service (CGPA + risk + mentor + students CRUD) |
| [`ML/ml_pipeline/`](ML/ml_pipeline) | Runtime library: DB backend + models (`db_backend.py`, `config.py`, `mentor_assigner.py`) |
| [`ML/notebooks/`](ML/notebooks) | Offline training & analysis notebooks (01–05) |
| [`ML/artifacts/`](ML/artifacts) | Trained models (`*.pkl`) |
| [`render.yaml`](render.yaml) | Render Blueprint (Root Directory `ML`) |

## Quick start

```bash
cd ML
python -m pip install -r requirements.txt   # or: poetry install
cp .env.example .env                        # set DATABASE_URL
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Deploy (Render)

1. Connect this repo (or the `PRANAV-PRAJAPATI` branch) with the Blueprint.
2. Verify the service uses `rootDir: ML` and the start command
   `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
3. Set `DATABASE_URL` in the Dashboard → Environment.
4. Check the build log for `POETRY DEPS OK` before opening the URL.