"""
Mentor assignment engine.

One class, :class:`MentorAssigner`, owns the whole mentor flow:

    raw student row (CSV *or* Neon)
        -> feature engineering (subject % / unit % / lab %)
        -> KMeans risk clustering
        -> hardcoded mentor preference (per subject / lab)
        -> peer-mentor lookup
        -> unit-wise, subject-wise mentor assignment
        -> detailed analysis dict + flat assignment rows

Public entry points
-------------------
* ``MentorAssigner().fit(df)``                 train on the whole cohort
* ``assigner.analyze_student("210029...")``    full analysis for one roll-no/name
* ``assigner.assign_all(df)``                  flat mentor-assignment table
* ``assigner.ensure_assignments(df)``         create only the still-missing rows
* ``run_pipeline()``                           end-to-end CSV run (artifacts)
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

from .config import (
    SUBJECT_LIST,
    LAB_LIST,
    UNITS,
    SUBJECT_LABELS,
    LAB_LABELS,
    FAIL_MARKS,
    INTENSIVE_MARKS,
    N_CLUSTERS,
    RANDOM_STATE,
    KMEANS_FEATURES,
    PRIORITY_MAPPING,
    TEACHER_DATA,
    MENTOR_RANKING,
    HARDCODED_WEAK_TEACHER_UNITS,
    DEFAULT_DATA_PATH,
    DEFAULT_ARTIFACTS_DIR,
    ASSIGNMENTS_CSV_PATH,
)
from . import db_backend


def _round(value, digits=2):
    try:
        if pd.isna(value):
            return None
        return round(float(value), digits)
    except (TypeError, ValueError):
        return value


class MentorAssigner:
    """End-to-end mentor analysis + assignment engine."""

    def __init__(self):
        self.scaler = StandardScaler()
        self.kmeans = KMeans(n_clusters=N_CLUSTERS, random_state=RANDOM_STATE, n_init=10)
        self.group_mapping: dict[int, str] = {}
        self.cluster_profiles: dict[int, dict] = {}
        self.priority_mapping = dict(PRIORITY_MAPPING)

        # Hardcoded mentor preference expanded to (category, subject, unit)
        # keys. No teacher-efficacy computation happens here.
        self.ranked_dict: dict[tuple, list[tuple]] = {}
        for _key, _teachers in MENTOR_RANKING.items():
            if _key.startswith("lab:"):
                _cat, _sub = "lab", _key[4:]
                _labels = ["lab overall"]
            else:
                _cat, _sub = "theory", _key
                _labels = [f"unit {u}" for u in UNITS] + ["overall"]
            for _label in _labels:
                self.ranked_dict[(_cat, _sub, _label)] = [
                    (t, round(9.0 - i, 2)) for i, t in enumerate(_teachers)
                ]

        self.peer_dict: dict[tuple, list[dict]] = {}

        self.max_marks: dict[str, float] = {}
        self.section_teacher_map: dict[tuple, str] = {}
        self.weak_overrides: dict[tuple, str] = {}  # (subject, unit_label) -> note

        self.data: pd.DataFrame | None = None
        self.is_fitted = False

        self._build_section_teacher_map()
        self._load_weak_overrides()

    # ------------------------------------------------------------------
    # Setup helpers
    # ------------------------------------------------------------------
    def _build_section_teacher_map(self):
        self.section_teacher_map = {}
        for subject, teachers in TEACHER_DATA.items():
            for teacher, sections in teachers.items():
                for section in sections:
                    self.section_teacher_map[(subject, section.strip().upper())] = teacher

    def _load_weak_overrides(self):
        """Loads hardcoded (and, if available, DB-stored) weak teacher+unit rows.

        Key: (subject, unit_label) -> note. ``unit_label`` is e.g. ``"unit 1"``
        for theory or ``"lab overall"`` for a lab. Teachers listed here get a
        score penalty so they are not recommended for that unit.
        """
        records = list(HARDCODED_WEAK_TEACHER_UNITS)
        if db_backend.backend_enabled():
            try:
                records += db_backend.load_teacher_unit_weakness()
            except Exception as exc:  # pragma: no cover - backend optional
                print(f"[mentor] could not load weak-teacher overrides from DB: {exc}")

        self.weak_overrides = {}
        for row in records:
            subject = str(row.get("subject", "")).strip().lower()
            unit = str(row.get("unit_or_component", "")).strip().lower()
            teacher = str(row.get("teacher_name", "")).strip()
            note = str(row.get("note", "hardcoded weak teacher/unit"))
            if subject and unit and teacher:
                self.weak_overrides[(subject, unit, teacher)] = note

        # index by (subject, unit) for quick lookup
        self._weak_by_unit: dict[tuple, set] = {}
        for (subject, unit, teacher) in self.weak_overrides:
            self._weak_by_unit.setdefault((subject, unit), set()).add(teacher)

    def _get_current_teacher(self, subject, section) -> str:
        return self.section_teacher_map.get((subject, str(section).strip().upper()), "Unknown")

    def _is_weak_override(self, subject, unit_label, teacher) -> bool:
        return teacher in self._weak_by_unit.get((subject, unit_label), set())

    # ------------------------------------------------------------------
    # Data loading
    # ------------------------------------------------------------------
    def load_data(self, data_path=None) -> pd.DataFrame:
        """Loads the cohort from CSV (offline / fallback path)."""
        path = Path(data_path or DEFAULT_DATA_PATH)
        df = pd.read_csv(path)
        self.data = df
        return df

    def load_from_backend(self) -> pd.DataFrame:
        """Loads the cohort from the Neon backend."""
        df = db_backend.fetch_students()
        if df.empty:
            raise RuntimeError("Neon backend returned no students. Import the dataset first.")
        self.data = df
        return df

    def load(self, data_path=None, prefer_backend=True) -> pd.DataFrame:
        """Loads from Neon when configured, otherwise falls back to CSV."""
        if prefer_backend and db_backend.backend_enabled():
            try:
                return self.load_from_backend()
            except Exception as exc:  # pragma: no cover - backend optional
                print(f"[mentor] backend load failed ({exc}); falling back to CSV.")
        return self.load_data(data_path)

    # ------------------------------------------------------------------
    # Feature engineering
    # ------------------------------------------------------------------
    def _calculate_max_marks(self, df):
        def _max(cols):
            cols = [c for c in cols if c in df.columns]
            if not cols:
                return 100.0
            value = pd.to_numeric(df[cols].stack(), errors="coerce").max()
            return float(value) if pd.notna(value) and value > 0 else 100.0

        self.max_marks = {
            "max_st1": _max([f"{s}_st1_marks" for s in SUBJECT_LIST]),
            "max_st2": _max([f"{s}_st2_marks" for s in SUBJECT_LIST]),
            "max_put": _max([f"{s}_put_marks" for s in SUBJECT_LIST]),
            "max_unit": _max([f"{s}_unit_{u}_marks" for s in SUBJECT_LIST for u in UNITS]),
            "max_lab_exec": _max([f"lab_{l}_execution_score" for l in LAB_LIST]),
            "max_lab_viva": _max([f"lab_{l}_viva_score" for l in LAB_LIST]),
        }

    def _num(self, df, col):
        if col not in df.columns:
            return pd.Series(0.0, index=df.index)
        return pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    def prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Adds all derived columns: component %, unit %, lab %, weakness counts."""
        df = df.copy()
        if "class_section" in df.columns:
            df["class_section"] = df["class_section"].astype(str).str.strip().str.upper()

        if not self.max_marks:
            self._calculate_max_marks(df)
        m_st1 = self.max_marks.get("max_st1", 100.0)
        m_st2 = self.max_marks.get("max_st2", 100.0)
        m_put = self.max_marks.get("max_put", 100.0)
        m_unit = self.max_marks.get("max_unit", 100.0)
        m_lexec = self.max_marks.get("max_lab_exec", 100.0)
        m_lviva = self.max_marks.get("max_lab_viva", 100.0)

        derived: dict[str, pd.Series] = {}
        subject_pct_cols = []
        for s in SUBJECT_LIST:
            st1 = self._num(df, f"{s}_st1_marks") / m_st1 * 100.0
            st2 = self._num(df, f"{s}_st2_marks") / m_st2 * 100.0
            put = self._num(df, f"{s}_put_marks") / m_put * 100.0
            derived[f"{s}_st1_pct"] = st1.round(2)
            derived[f"{s}_st2_pct"] = st2.round(2)
            derived[f"{s}_put_pct"] = put.round(2)

            unit_pcts = []
            for u in UNITS:
                pct = (self._num(df, f"{s}_unit_{u}_marks") / m_unit * 100.0).round(2)
                derived[f"{s}_unit_{u}_pct"] = pct
                derived[f"{s}_unit_{u}_bad"] = (pct < FAIL_MARKS).astype(int)
                unit_pcts.append(pct)
            unit_mean = pd.concat(unit_pcts, axis=1).mean(axis=1)

            subject_pct = ((st1 + st2 + put + unit_mean) / 4.0).round(2)
            derived[f"{s}_pct"] = subject_pct
            derived[f"{s}_bad"] = (subject_pct < FAIL_MARKS).astype(int)
            subject_pct_cols.append(f"{s}_pct")
            derived[f"{s}_teacher"] = df["class_section"].map(
                lambda sec, sub=s: self._get_current_teacher(sub, sec)
            )

        for l in LAB_LIST:
            exe = self._num(df, f"lab_{l}_execution_score") / m_lexec * 100.0
            viva = self._num(df, f"lab_{l}_viva_score") / m_lviva * 100.0
            lab_pct = ((exe + viva) / 2.0).round(2)
            derived[f"lab_{l}_exe_pct"] = exe.round(2)
            derived[f"lab_{l}_viva_pct"] = viva.round(2)
            derived[f"lab_{l}_pct"] = lab_pct
            derived[f"lab_{l}_bad"] = (lab_pct < FAIL_MARKS).astype(int)
            derived[f"lab_{l}_teacher"] = df["class_section"].map(
                lambda sec, lab=l: self._get_current_teacher(lab, sec)
            )

        # Attach all derived columns in one concat (avoids frame fragmentation).
        df = pd.concat([df, pd.DataFrame(derived, index=df.index)], axis=1)

        df["bad_subjects"] = df[[f"{s}_bad" for s in SUBJECT_LIST]].sum(axis=1)
        df["bad_labs"] = df[[f"lab_{l}_bad" for l in LAB_LIST]].sum(axis=1)
        df["total_weakness"] = df["bad_subjects"] + df["bad_labs"]
        df["avg_pct"] = df[subject_pct_cols].mean(axis=1).round(2)
        df["min_pct"] = df[subject_pct_cols].min(axis=1).round(2)

        st1_mean = df[[f"{s}_st1_pct" for s in SUBJECT_LIST]].mean(axis=1)
        st2_mean = df[[f"{s}_st2_pct" for s in SUBJECT_LIST]].mean(axis=1)
        df["progress_score"] = (st2_mean - st1_mean).round(2)
        return df

    # ------------------------------------------------------------------
    # Clustering
    # ------------------------------------------------------------------
    def _train_clusters(self, df):
        features = KMEANS_FEATURES
        scaled = self.scaler.fit_transform(df[features].fillna(0))
        df = df.copy()
        df["group_id"] = self.kmeans.fit_predict(scaled)

        stats = df.groupby("group_id")[features].mean()
        low_g = int(stats["avg_pct"].idxmin())
        high_g = int(stats["avg_pct"].idxmax())
        mid = [int(i) for i in stats.index if i not in (low_g, high_g)]
        if stats.loc[mid[0], "min_pct"] < stats.loc[mid[1], "min_pct"]:
            fell_down, normal = mid[0], mid[1]
        else:
            fell_down, normal = mid[1], mid[0]
        self.group_mapping = {
            low_g: "Need Help",
            fell_down: "Fell Down",
            normal: "Normal",
            high_g: "Topper",
        }

        df["risk_level"] = df["group_id"].map(self.group_mapping)
        df["priority_rank"] = df["risk_level"].map(self.priority_mapping)

        # Profile each cluster for reports / frontend
        self.cluster_profiles = {}
        for gid, group in df.groupby("group_id"):
            self.cluster_profiles[int(gid)] = {
                "risk_level": self.group_mapping[int(gid)],
                "size": int(len(group)),
                "share_pct": round(len(group) / len(df) * 100.0, 1),
                "avg_pct": _round(group["avg_pct"].mean(), 1),
                "min_pct": _round(group["min_pct"].mean(), 1),
                "bad_subjects": _round(group["bad_subjects"].mean(), 1),
                "bad_labs": _round(group["bad_labs"].mean(), 1),
                "attendance_pct": _round(group["overall_attendance_pct"].mean(), 1),
                "previous_cgpa": _round(group["previous_cgpa"].mean(), 2),
                "progress_score": _round(group["progress_score"].mean(), 1),
            }
        return df

    def _predict_clusters(self, df: pd.DataFrame) -> pd.DataFrame:
        """Vectorized cluster prediction for an already feature-engineered frame."""
        scaled = self.scaler.transform(df[KMEANS_FEATURES].fillna(0))
        df = df.copy()
        df["group_id"] = self.kmeans.predict(scaled)
        df["risk_level"] = df["group_id"].map(self.group_mapping)
        df["priority_rank"] = df["risk_level"].map(self.priority_mapping)
        return df

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Feature engineering + cluster/risk labels in one public call."""
        if not self.is_fitted:
            raise RuntimeError("Model is not fitted yet. Call fit() first.")
        return self._predict_clusters(self.prepare_features(df))

    def kmeans_diagnostics(self, df=None, k_range=range(2, 11), sample_size=15000) -> pd.DataFrame:
        """Inertia + silhouette per k, for the elbow chart in the notebook.

        A random sample is used by default because a full-cohort sweep is slow
        and the curve shape is stable.
        """
        df = df if df is not None else self.data
        if df is None:
            raise RuntimeError("No data loaded. Call load()/fit() first or pass df.")
        prepared = self.prepare_features(df)
        x = prepared[KMEANS_FEATURES].fillna(0)
        if sample_size and len(x) > sample_size:
            x = x.sample(n=sample_size, random_state=RANDOM_STATE)
        scaled = StandardScaler().fit_transform(x)

        rows = []
        for k in k_range:
            model = KMeans(n_clusters=k, random_state=RANDOM_STATE, n_init=5)
            labels = model.fit_predict(scaled)
            rows.append({
                "k": k,
                "inertia": round(float(model.inertia_), 1),
                "silhouette": round(float(silhouette_score(scaled, labels)), 4),
            })
        return pd.DataFrame(rows)

    # ------------------------------------------------------------------
    # Peer mentors
    # ------------------------------------------------------------------
    def _build_peer_map(self, df):
        self.peer_dict = {}
        for s in SUBJECT_LIST:
            for section in df["class_section"].unique():
                candidates = df[(df["class_section"] == section) & (df[f"{s}_bad"] == 0)]
                top = candidates.sort_values(f"{s}_pct", ascending=False).head(5)
                self.peer_dict[("theory", s, section)] = [
                    {"roll_no": str(r["roll_no"]), "name": str(r["full_name"]), "score_pct": _round(r[f"{s}_pct"], 1)}
                    for _, r in top.iterrows()
                ]
        for l in LAB_LIST:
            for section in df["class_section"].unique():
                candidates = df[(df["class_section"] == section) & (df[f"lab_{l}_bad"] == 0)]
                top = candidates.sort_values(f"lab_{l}_pct", ascending=False).head(5)
                self.peer_dict[("lab", l, section)] = [
                    {"roll_no": str(r["roll_no"]), "name": str(r["full_name"]), "score_pct": _round(r[f"lab_{l}_pct"], 1)}
                    for _, r in top.iterrows()
                ]
        return self.peer_dict

    # ------------------------------------------------------------------
    # Fit
    # ------------------------------------------------------------------
    def fit(self, df: pd.DataFrame) -> "MentorAssigner":
        self.data = df
        self._calculate_max_marks(df)
        prepared = self.prepare_features(df)
        clustered = self._train_clusters(prepared)
        self._build_peer_map(clustered)
        self.is_fitted = True
        return self

    # ------------------------------------------------------------------
    # Mentor selection
    # ------------------------------------------------------------------
    def pick_mentor(self, category, subject, unit_label, current_teacher):
        """Best available expert for a subject/unit, avoiding the current teacher."""
        candidates = self.ranked_dict.get((category, subject, unit_label), [])
        fallback = None
        for teacher, score in candidates:
            if teacher == current_teacher:
                continue
            if self._is_weak_override(subject, unit_label, teacher):
                fallback = fallback or (teacher, score)
                continue
            return {"name": teacher, "expertise_unit": unit_label, "rating": round(score, 2), "source": "hardcoded_ranking"}
        if fallback:
            return {"name": fallback[0], "expertise_unit": unit_label, "rating": round(fallback[1], 2), "source": "fallback_weak_teacher"}
        if candidates:
            teacher, score = candidates[0]
            return {"name": teacher, "expertise_unit": unit_label, "rating": round(score, 2), "source": "same_teacher_only_option"}
        return {"name": "No Mentor Available", "expertise_unit": unit_label, "rating": 0.0, "source": "none"}

    def _pick_peer(self, category, subject, section, state):
        key = (category, subject, section)
        peers = self.peer_dict.get(key, [])
        if not peers:
            return {"roll_no": None, "name": None, "score_pct": None}
        idx = state.get(key, 0) % len(peers)
        state[key] = idx + 1
        return peers[idx]

    # ------------------------------------------------------------------
    # Per-student analysis
    # ------------------------------------------------------------------
    def _analyze_processed_row(self, row, peer_state, predict_cluster=True):
        section = str(row["class_section"]).strip().upper()

        if predict_cluster:
            x = pd.DataFrame([row[KMEANS_FEATURES].fillna(0)])
            scaled = self.scaler.transform(x)
            cluster_id = int(self.kmeans.predict(scaled)[0])
            distances = self.kmeans.transform(scaled)[0]
            order = np.argsort(distances)
            own, second = float(distances[order[0]]), float(distances[order[1]])
            confidence = round(float(np.clip(100.0 * (second - own) / (second + 1e-9), 0.0, 100.0)), 1)
            cluster_distance = _round(own, 3)
        else:
            cluster_id = int(row["group_id"])
            confidence = None
            cluster_distance = None

        risk_level = self.group_mapping.get(cluster_id, "Normal")
        priority = self.priority_mapping.get(risk_level, 3)

        subjects, labs, recommendations = [], [], []

        # ---- subjects -------------------------------------------------
        for s in SUBJECT_LIST:
            current_teacher = str(row.get(f"{s}_teacher", "Unknown"))
            units = []
            weak_units = []
            lowest_unit, lowest_score = None, 1e9
            for u in UNITS:
                pct = float(row[f"{s}_unit_{u}_pct"])
                is_weak = pct < FAIL_MARKS
                units.append({"unit": f"Unit {u}", "score_pct": _round(pct, 1), "status": "weak" if is_weak else "good"})
                if is_weak:
                    weak_units.append({"unit": f"Unit {u}", "score_pct": _round(pct, 1)})
                if pct < lowest_score:
                    lowest_score, lowest_unit = pct, u

            score_pct = float(row[f"{s}_pct"])
            is_bad = int(row[f"{s}_bad"]) == 1
            mentor_needed = bool(is_bad or weak_units)

            mentor, peer = None, None
            if mentor_needed:
                unit_label = f"unit {lowest_unit}"
                mentor = self.pick_mentor("theory", s, unit_label, current_teacher)
                peer = self._pick_peer("theory", s, section, peer_state)

            if not mentor_needed:
                action = "No intervention needed"
            elif lowest_score < INTENSIVE_MARKS:
                action = "Intensive tutoring"
            else:
                action = "Expert mentoring + unit revision"

            subjects.append({
                "subject": s,
                "label": SUBJECT_LABELS.get(s, s),
                "score_pct": _round(score_pct, 1),
                "status": "weak" if is_bad else "good",
                "current_teacher": current_teacher,
                "attendance_pct": _round(row.get(f"{s}_attendance_pct"), 1),
                "components": {
                    "st1_pct": _round(row.get(f"{s}_st1_pct"), 1),
                    "st2_pct": _round(row.get(f"{s}_st2_pct"), 1),
                    "put_pct": _round(row.get(f"{s}_put_pct"), 1),
                    "unit_avg_pct": _round(np.mean([u["score_pct"] for u in units]), 1),
                    "assignment_score": _round(row.get(f"{s}_assignment_score"), 1),
                    "assignment_delay_hours": _round(row.get(f"{s}_assignment_delay_hours"), 1),
                    "quiz_score": _round(row.get(f"{s}_quiz_score"), 1),
                },
                "units": units,
                "weak_units": weak_units,
                "lowest_unit": f"Unit {lowest_unit}",
                "mentor_needed": mentor_needed,
                "mentor": mentor,
                "peer_mentor": peer,
                "suggested_action": action,
                "reason": (
                    f"{s.upper()} overall {score_pct:.1f}% - weak units: "
                    + ", ".join(f"{w['unit']} ({w['score_pct']}%)" for w in weak_units)
                    if weak_units else f"{s.upper()} overall {score_pct:.1f}% is below {FAIL_MARKS}%"
                ) if mentor_needed else f"{s.upper()} is on track ({score_pct:.1f}%)",
            })

            if mentor_needed:
                recommendations.append({
                    "type": "theory",
                    "subject": s,
                    "priority": priority,
                    "score_pct": _round(score_pct, 1),
                    "focus": mentor["expertise_unit"],
                    "mentor": mentor["name"],
                    "mentor_rating": mentor["rating"],
                    "peer_mentor": (peer or {}).get("name"),
                    "action": action,
                })

        # ---- labs -----------------------------------------------------
        for l in LAB_LIST:
            current_teacher = str(row.get(f"lab_{l}_teacher", "Unknown"))
            exe = float(row[f"lab_{l}_exe_pct"])
            viva = float(row[f"lab_{l}_viva_pct"])
            score_pct = float(row[f"lab_{l}_pct"])
            is_bad = int(row[f"lab_{l}_bad"]) == 1
            parts = []
            for part_name, part_score in (("Execution", exe), ("Viva", viva)):
                parts.append({
                    "part": part_name,
                    "score_pct": _round(part_score, 1),
                    "status": "weak" if part_score < FAIL_MARKS else "good",
                })
            weak_parts = [p for p in parts if p["status"] == "weak"]
            mentor_needed = bool(is_bad)

            mentor, peer = None, None
            if mentor_needed:
                mentor = self.pick_mentor("lab", l, "lab overall", current_teacher)
                peer = self._pick_peer("lab", l, section, peer_state)

            if not mentor_needed:
                action = "No intervention needed"
            elif score_pct < INTENSIVE_MARKS:
                action = "Intensive lab practice"
            else:
                action = "Lab mentoring + pair practice"

            labs.append({
                "lab": l,
                "label": LAB_LABELS.get(l, l),
                "score_pct": _round(score_pct, 1),
                "status": "weak" if is_bad else "good",
                "current_teacher": current_teacher,
                "attendance_pct": _round(row.get(f"lab_{l}_attendance_pct"), 1),
                "parts": parts,
                "weak_parts": [p["part"] for p in weak_parts],
                "mentor_needed": mentor_needed,
                "mentor": mentor,
                "peer_mentor": peer,
                "suggested_action": action,
                "reason": (
                    f"{l.upper()} lab {score_pct:.1f}% below {FAIL_MARKS}%"
                    if mentor_needed else f"{l.upper()} lab is on track ({score_pct:.1f}%)"
                ),
            })

            if mentor_needed:
                recommendations.append({
                    "type": "lab",
                    "subject": l,
                    "priority": priority,
                    "score_pct": _round(score_pct, 1),
                    "focus": "Lab overall",
                    "mentor": mentor["name"],
                    "mentor_rating": mentor["rating"],
                    "peer_mentor": (peer or {}).get("name"),
                    "action": action,
                })

        needs_intervention = bool(recommendations) or risk_level in ("Need Help", "Fell Down")
        recommendations.sort(key=lambda r: (r["priority"], r["score_pct"]))

        return {
            "roll_no": str(row.get("roll_no")),
            "full_name": str(row.get("full_name")),
            "class_section": section,
            "risk_level": risk_level,
            "priority_rank": priority,
            "needs_intervention": needs_intervention,
            "clustering": {
                "cluster_id": cluster_id,
                "risk_level": risk_level,
                "distance_to_centroid": cluster_distance,
                "assignment_confidence_pct": confidence,
                "cluster_profile": self.cluster_profiles.get(cluster_id),
            },
            "academic_metrics": {
                "average_percentage": _round(row["avg_pct"], 1),
                "lowest_subject_percentage": _round(row["min_pct"], 1),
                "progress_trend_st1_to_st2": _round(row["progress_score"], 1),
                "weak_subjects_count": int(row["bad_subjects"]),
                "weak_labs_count": int(row["bad_labs"]),
                "total_weak_areas": int(row["total_weakness"]),
                "previous_cgpa": _round(row.get("previous_cgpa"), 2),
                "overall_attendance_pct": _round(row.get("overall_attendance_pct"), 1),
            },
            "subjects": subjects,
            "labs": labs,
            "recommendations": recommendations,
            "recommendation_summary": (
                f"'{risk_level}' (priority {priority}). {len(recommendations)} mentor intervention(s) required."
                if needs_intervention
                else "Student is performing well across all subjects and labs."
            ),
        }

    def _resolve_raw_student(self, identifier):
        ident = str(identifier).strip()
        if db_backend.backend_enabled():
            try:
                student = db_backend.fetch_student(ident)
                if student:
                    return student
            except Exception as exc:  # pragma: no cover - backend optional
                print(f"[mentor] backend lookup failed ({exc}); using loaded data.")
        if self.data is not None:
            match = self.data[
                (self.data["roll_no"].astype(str) == ident)
                | (self.data["full_name"].astype(str).str.lower() == ident.lower())
            ]
            if not match.empty:
                return match.iloc[0].to_dict()
        raise LookupError(f"No student found for '{identifier}'.")

    def format_report(self, analysis: dict) -> str:
        """Human-readable text report (same style as the notebook output)."""
        lines = [
            f"{analysis['full_name']} | {analysis['roll_no']} | {analysis['class_section']}",
            f"{analysis['risk_level']} | priority {analysis['priority_rank']}",
            analysis["recommendation_summary"],
        ]
        for s in analysis["subjects"]:
            weak = ", ".join(w["unit"] for w in s["weak_units"]) or "-"
            mentor = (s["mentor"] or {}).get("name", "-")
            lines.append(f"{s['subject'].upper()} {s['score_pct']} % | weak: {weak} | mentor: {mentor}")
        for l in analysis["labs"]:
            weak = ", ".join(l["weak_parts"]) or "-"
            mentor = (l["mentor"] or {}).get("name", "-")
            lines.append(f"{l['lab'].upper()} LAB {l['score_pct']} % | weak: {weak} | mentor: {mentor}")
        return "\n".join(lines)

    def analyze_student(self, identifier, persist=False) -> dict:
        """Full unit-wise / subject-wise analysis for one roll-number OR name."""
        if not self.is_fitted:
            raise RuntimeError("Model is not fitted yet. Call fit() first.")
        raw = self._resolve_raw_student(identifier)
        prepared = self.prepare_features(pd.DataFrame([raw]))
        analysis = self._analyze_processed_row(prepared.iloc[0], peer_state={}, predict_cluster=True)
        analysis["report_text"] = self.format_report(analysis)
        if persist and analysis["needs_intervention"]:
            self._persist_records(self._assignment_records_from_analysis(analysis))
        return analysis

    # ------------------------------------------------------------------
    # Flat assignment table
    # ------------------------------------------------------------------
    def _assignment_records_from_analysis(self, analysis):
        records = []
        base = {
            "roll_no": analysis["roll_no"],
            "student_name": analysis["full_name"],
            "class_section": analysis["class_section"],
            "risk_level": analysis["risk_level"],
            "priority_rank": analysis["priority_rank"],
            "previous_cgpa": analysis["academic_metrics"].get("previous_cgpa"),
            "attendance_pct": analysis["academic_metrics"].get("overall_attendance_pct"),
        }
        for subject in analysis["subjects"]:
            if not subject["mentor_needed"]:
                continue
            weak = ", ".join(f"{w['unit']} ({w['score_pct']}%)" for w in subject["weak_units"])
            records.append({
                **base,
                "subject_type": "theory",
                "subject_name": subject["subject"],
                "subject_score_pct": subject["score_pct"],
                "weak_units": weak or subject["lowest_unit"],
                "primary_weak_unit": subject["lowest_unit"],
                "current_teacher": subject["current_teacher"],
                "assigned_mentor_name": (subject["mentor"] or {}).get("name", "No Mentor Available"),
                "mentor_score": (subject["mentor"] or {}).get("rating", 0.0),
                "peer_mentor_roll": (subject["peer_mentor"] or {}).get("roll_no"),
                "peer_mentor_name": (subject["peer_mentor"] or {}).get("name"),
                "assignment_reason": subject["reason"],
            })
        for lab in analysis["labs"]:
            if not lab["mentor_needed"]:
                continue
            records.append({
                **base,
                "subject_type": "lab",
                "subject_name": lab["lab"],
                "subject_score_pct": lab["score_pct"],
                "weak_units": ", ".join(lab["weak_parts"]) or "Lab overall",
                "primary_weak_unit": "Lab overall",
                "current_teacher": lab["current_teacher"],
                "assigned_mentor_name": (lab["mentor"] or {}).get("name", "No Mentor Available"),
                "mentor_score": (lab["mentor"] or {}).get("rating", 0.0),
                "peer_mentor_roll": (lab["peer_mentor"] or {}).get("roll_no"),
                "peer_mentor_name": (lab["peer_mentor"] or {}).get("name"),
                "assignment_reason": lab["reason"],
            })
        return records

    def assign_all(self, df=None, output_path=None, persist=False) -> pd.DataFrame:
        """Builds the flat mentor-assignment table for the whole cohort."""
        if not self.is_fitted:
            df = df if df is not None else self.load()
            self.fit(df)
        prepared = self.prepare_features(df if df is not None else self.data)
        prepared = self._predict_clusters(prepared)

        peer_state = {}
        records = []
        for _, row in prepared.iterrows():
            analysis = self._analyze_processed_row(row, peer_state, predict_cluster=False)
            records.extend(self._assignment_records_from_analysis(analysis))

        assign_df = pd.DataFrame(records)
        if not assign_df.empty:
            assign_df = assign_df.sort_values(
                ["priority_rank", "subject_score_pct"], ascending=[True, True]
            ).reset_index(drop=True)

        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            assign_df.to_csv(output_path, index=False)
            print(f"Exported {len(assign_df)} assignments to {output_path}")

        if persist:
            self._persist_records(assign_df.to_dict("records"))
        return assign_df

    # backward-compatible alias
    def generate_assignments_csv(self, df=None, output_path=None):
        return self.assign_all(df=df, output_path=output_path)

    def _persist_records(self, records):
        if not records:
            return
        if db_backend.backend_enabled():
            try:
                n = db_backend.save_mentor_assignments(pd.DataFrame(records))
                print(f"[mentor] persisted {n} assignment rows to Neon.")
                return
            except Exception as exc:  # pragma: no cover - backend optional
                print(f"[mentor] could not persist to Neon ({exc}); writing CSV instead.")
        df = pd.DataFrame(records)
        ASSIGNMENTS_CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(ASSIGNMENTS_CSV_PATH, index=False)

    def ensure_assignments(self, df=None, persist=True) -> pd.DataFrame:
        """Creates assignments for students who need one but don't have one yet.

        Matches the requirement: when a new/extra student appears and the DB
        already holds data, only the missing, condition-satisfying assignments
        are generated.
        """
        if not self.is_fitted:
            df = df if df is not None else self.load()
            self.fit(df)
        prepared = self.prepare_features(df if df is not None else self.data)
        prepared = self._predict_clusters(prepared)

        existing = set()
        if db_backend.backend_enabled():
            try:
                existing = db_backend.fetch_assignment_keys()
            except Exception as exc:  # pragma: no cover - backend optional
                print(f"[mentor] could not read existing assignments ({exc}).")

        peer_state = {}
        records = []
        for _, row in prepared.iterrows():
            analysis = self._analyze_processed_row(row, peer_state, predict_cluster=False)
            for record in self._assignment_records_from_analysis(analysis):
                key = (str(record["roll_no"]), str(record["subject_type"]), str(record["subject_name"]))
                if key in existing:
                    continue
                records.append(record)

        new_df = pd.DataFrame(records)
        if persist and not new_df.empty:
            self._persist_records(records)
        print(f"[mentor] ensure_assignments: {len(new_df)} new assignment(s) created.")
        return new_df

    # ------------------------------------------------------------------
    # Persistence: none. The model is cheap to rebuild (~5s), so instead of
    # saving a .pkl file we simply call fit(df) whenever we need the engine.
    # ------------------------------------------------------------------


def build_assigner(data_path=None, prefer_backend=True) -> MentorAssigner:
    """Loads the cohort (Neon -> CSV) and fits the engine.

    No pickle/model file is used: fitting on the full dataset takes a few
    seconds, so we just rebuild it on demand.
    """
    assigner = MentorAssigner()
    assigner.load(data_path, prefer_backend=prefer_backend)
    assigner.fit(assigner.data)
    return assigner


def get_student_mentor(identifier, data_path=None) -> dict:
    """Convenience entry point for the future API.

    ``get_student_mentor("210029027561")`` or ``get_student_mentor("Kavya Verma")``
    returns the full analysis dict produced by :meth:`MentorAssigner.analyze_student`.
    """
    return build_assigner(data_path).analyze_student(identifier)


def get_student_report(identifier, data_path=None) -> str:
    """Same as :func:`get_student_mentor` but returns the printable text report."""
    return build_assigner(data_path).analyze_student(identifier)["report_text"]


def run_pipeline(data_path=DEFAULT_DATA_PATH, artifacts_dir=DEFAULT_ARTIFACTS_DIR, persist_db=False):
    """End-to-end CSV run: fit + export mentor assignments."""
    artifacts_dir = Path(artifacts_dir)
    print("=" * 60)
    print("Starting Mentor Pipeline...")
    assigner = MentorAssigner()
    df = assigner.load_data(data_path)
    print(f"Dataset loaded: {len(df)} students, {df.shape[1]} columns")
    assigner.fit(df)

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    assigner.assign_all(df, output_path=artifacts_dir / "mentor_assign.csv", persist=persist_db)

    sample = df.iloc[0]["roll_no"]
    analysis = assigner.analyze_student(sample)
    print(f"Sample analysis -> {analysis['roll_no']} | risk={analysis['risk_level']} "
          f"| interventions={len(analysis['recommendations'])}")
    print("=" * 60)
    return assigner


if __name__ == "__main__":
    run_pipeline()
