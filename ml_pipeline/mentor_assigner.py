import os
import pickle
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from .config import (
    SUBJECT_LIST,
    LAB_LIST,
    FAIL_MARKS,
    GOOD_MARKS,
    TEACHER_DATA,
    DEFAULT_DATA_PATH,
    DEFAULT_ARTIFACTS_DIR,
    MODEL_SAVE_PATH,
    ASSIGNMENTS_CSV_PATH,
    TEACHER_RANKING_CSV_PATH
)
class MentorAssigner:
    def __init__(self):
        self.scaler=StandardScaler()
        self.kmeans=KMeans(n_clusters=4,random_state=42,n_init=10)
        self.group_mapping={}
        self.priority_mapping = {"Need Help": 1, "Fell Down": 2, "Normal": 3, "Topper": 4}
        self.teacher_ranking_df=pd.DataFrame()
        self.ranked_dict={}
        self.peer_dict={}
        self.max_marks={}
        self.section_teacher_map={}
        self.is_fitted=False
        self._build_section_teacher_map()
    def _build_section_teacher_map(self):
        self.section_teacher_map={}
        for sub,teachers in TEACHER_DATA.items():
            for t_name,sections in teachers.items():
                for sec in sections:
                    self.section_teacher_map[(sub,sec.strip().upper())]=t_name
    def _get_current_teacher(self,subject,section):
        return self.section_teacher_map.get((subject, str(section).strip().upper()), "Unknown")
    def _calculate_max_marks(self,df):
        st1_cols = [f"{s}_st1_marks" for s in SUBJECT_LIST if f"{s}_st1_marks" in df.columns]
        st2_cols = [f"{s}_st2_marks" for s in SUBJECT_LIST if f"{s}_st2_marks" in df.columns]
        put_cols = [f"{s}_put_marks" for s in SUBJECT_LIST if f"{s}_put_marks" in df.columns]
        unit_cols=[]
        for s in SUBJECT_LIST:
            for u in range(1,6):
                c = f"{s}_unit_{u}_marks"
                if c in df.columns:
                    unit_cols.append(c)
        lab_exec_cols = [f"lab_{l}_execution_score" for l in LAB_LIST if f"lab_{l}_execution_score" in df.columns]
        lab_viva_cols = [f"lab_{l}_viva_score" for l in LAB_LIST if f"lab_{l}_viva_score" in df.columns]
        self.max_marks={
            "max_st1": float(df[st1_cols].max().max()) if st1_cols else 100.0,
            "max_st2": float(df[st2_cols].max().max()) if st2_cols else 100.0,
            "max_put": float(df[put_cols].max().max()) if put_cols else 100.0,
            "max_unit": float(df[unit_cols].max().max()) if unit_cols else 100.0,
            "max_lab_exec": float(df[lab_exec_cols].max().max()) if lab_exec_cols else 100.0,
            "max_lab_viva": float(df[lab_viva_cols].max().max()) if lab_viva_cols else 100.0,
        }
    def _preprocess_dataframe(self,df):
        df=df.copy()
        df["class_section"] = df["class_section"].astype(str).str.strip().str.upper()
        m_st1 = self.max_marks.get("max_st1", 100.0)
        m_st2 = self.max_marks.get("max_st2", 100.0)
        m_put = self.max_marks.get("max_put", 100.0)
        m_unit = self.max_marks.get("max_unit", 100.0)
        m_lexec = self.max_marks.get("max_lab_exec", 100.0)
        m_lviva = self.max_marks.get("max_lab_viva", 100.0)
        pct_cols=[]
        for s in SUBJECT_LIST:
            v_st1 = df[f"{s}_st1_marks"] / m_st1 * 100.0
            v_st2 = df[f"{s}_st2_marks"] / m_st2 * 100.0
            v_put = df[f"{s}_put_marks"] / m_put * 100.0
            unit_sub_cols=[]
            for u in range(1,6):
                u_col = f"{s}_unit_{u}_marks"
                pct_col = f"{s}_unit_{u}_pct"
                df[pct_col]=(df[u_col]/m_unit*100.0).round(2)
                df[f"{s}_unit_{u}_bad"] = (df[pct_col] < FAIL_MARKS).astype(int)
                unit_sub_cols.append(pct_col)
            v_unit=df[unit_sub_cols].mean(axis=1)
            df[f"{s}_pct"] = ((v_st1 + v_st2 + v_put + v_unit) / 4.0).round(2)
            pct_cols.append(f"{s}_pct")
            df[f"{s}_bad"] = (df[f"{s}_pct"] < FAIL_MARKS).astype(int)
            df[f"{s}_t"] = df["class_section"].apply(lambda sec: self._get_current_teacher(s, sec))
        for l in LAB_LIST:
            v_exec = df[f"lab_{l}_execution_score"] / m_lexec * 100.0
            v_viva = df[f"lab_{l}_viva_score"] / m_lviva * 100.0
            df[f"lab_{l}_pct"] = ((v_exec + v_viva) / 2.0).round(2)
            df[f"lab_{l}_bad"] = (df[f"lab_{l}_pct"] < FAIL_MARKS).astype(int)
            df[f"lab_{l}_t"] = df["class_section"].apply(lambda sec: self._get_current_teacher(l, sec))
        df["bad_subjects"] = df[[f"{s}_bad" for s in SUBJECT_LIST]].sum(axis=1)
        df["bad_labs"] = df[[f"lab_{l}_bad" for l in LAB_LIST]].sum(axis=1)
        df["total_weakness"] = df["bad_subjects"] + df["bad_labs"]
        df["avg_pct"] = df[pct_cols].mean(axis=1).round(2)
        df["min_pct"] = df[pct_cols].min(axis=1).round(2)
        st1_means = df[[f"{s}_st1_marks" for s in SUBJECT_LIST]].mean(axis=1) / m_st1 * 100.0
        st2_means = df[[f"{s}_st2_marks" for s in SUBJECT_LIST]].mean(axis=1) / m_st2 * 100.0
        df["progress_score"] = (st2_means - st1_means).round(2)
        return df
    def _train_clusters(self,df):
        features = ["avg_pct", "min_pct", "bad_subjects", "bad_labs", "overall_attendance_pct", "previous_cgpa", "progress_score"]
        scaled_x=self.scaler.fit_transform(df[features].fillna(0))
        df["group_id"] = self.kmeans.fit_predict(scaled_x)
        stats = df.groupby("group_id")[features].mean()
        low_g = int(stats["avg_pct"].idxmin())
        high_g = int(stats["avg_pct"].idxmax())
        mid_g=[int(i) for i in stats.index if i not in (low_g,high_g)]
        if stats.loc[mid_g[0], "min_pct"] < stats.loc[mid_g[1], "min_pct"]:
            fell_down,normal=mid_g[0],mid_g[1]
        else:
            fell_down,normal=mid_g[1],mid_g[0]
        self.group_mapping = {low_g: "Need Help", fell_down: "Fell Down", normal: "Normal", high_g: "Topper"}
        df["risk_level"] = df["group_id"].map(self.group_mapping)
        df["priority_rank"] = df["risk_level"].map(self.priority_mapping)
        return df
    def _build_rankings_and_peers(self,df):
        ranking_records=[]
        for s in SUBJECT_LIST:
            for u in range(1,6):
                unit_pct_col = f"{s}_unit_{u}_pct"
                for teacher in df[f"{s}_t"].unique():
                    if teacher == "Unknown":
                        continue
                    teacher_students = df[df[f"{s}_t"] == teacher]
                    if len(teacher_students)==0:
                        continue
                    scores=teacher_students[unit_pct_col]
                    total=len(scores)
                    fail_cnt=int((scores < FAIL_MARKS).sum())
                    topper_cnt=int((scores >=GOOD_MARKS).sum())
                    sc=5.0+5.0*(topper_cnt/total)-5.0*(fail_cnt/total)
                    sc=round(max(1.0,min(10.0,sc)),2)
                    ranking_records.append({
                        "category": "theory",
                        "subject": s,
                        "unit_or_component": f"unit {u}",
                        "teacher_name": teacher,
                        "teacher_score": sc,
                        "total_students": total,
                        "pass_rate_pct": round((1.0 - fail_cnt / total) * 100.0, 1),
                        "topper_rate_pct": round((topper_cnt / total) * 100.0, 1),
                        "sections_taught": ", ".join(TEACHER_DATA.get(s, {}).get(teacher, []))
                    })
            for teacher in df[f"{s}_t"].unique():
                if teacher == "Unknown":
                    continue
                teacher_students = df[df[f"{s}_t"] == teacher]
                if len(teacher_students)==0:
                    continue
                scores = teacher_students[f"{s}_pct"]
                total=len(scores)
                fail_cnt=int((scores < FAIL_MARKS).sum())
                topper_cnt=int((scores >=GOOD_MARKS).sum())
                sc=5.0+5.0*(topper_cnt/total)-5.0*(fail_cnt/total)
                sc=round(max(1.0,min(10.0,sc)),2)
                ranking_records.append({
                    "category": "theory",
                    "subject": s,
                    "unit_or_component": "overall",
                    "teacher_name": teacher,
                    "teacher_score": sc,
                    "total_students": total,
                    "pass_rate_pct": round((1.0 - fail_cnt / total) * 100.0, 1),
                    "topper_rate_pct": round((topper_cnt / total) * 100.0, 1),
                    "sections_taught": ", ".join(TEACHER_DATA.get(s, {}).get(teacher, []))
                })
        for l in LAB_LIST:
            for teacher in df[f"lab_{l}_t"].unique():
                if teacher == "Unknown":
                    continue
                teacher_students = df[df[f"lab_{l}_t"] == teacher]
                if len(teacher_students)==0:
                    continue
                scores = teacher_students[f"lab_{l}_pct"]
                total=len(scores)
                fail_cnt=int((scores < FAIL_MARKS).sum())
                topper_cnt=int((scores >=GOOD_MARKS).sum())
                sc=5.0+5.0*(topper_cnt/total)-5.0*(fail_cnt/total)
                sc=round(max(1.0,min(10.0,sc)),2)
                ranking_records.append({
                    "category": "lab",
                    "subject": l,
                    "unit_or_component": "lab overall",
                    "teacher_name": teacher,
                    "teacher_score": sc,
                    "total_students": total,
                    "pass_rate_pct": round((1.0 - fail_cnt / total) * 100.0, 1),
                    "topper_rate_pct": round((topper_cnt / total) * 100.0, 1),
                    "sections_taught": ", ".join(TEACHER_DATA.get(l, {}).get(teacher, []))
                })
        self.teacher_ranking_df=pd.DataFrame(ranking_records)
        if not self.teacher_ranking_df.empty:
            self.teacher_ranking_df["rank"] = (
                self.teacher_ranking_df.groupby(["category", "subject", "unit_or_component"])["teacher_score"]
                .rank(ascending=False, method="min")
                .astype(int)
            )
            self.teacher_ranking_df=self.teacher_ranking_df.sort_values(
                ["category", "subject", "unit_or_component", "rank"]
            )
        self.ranked_dict={}
        for _,row in self.teacher_ranking_df.iterrows():
            key = (row["category"], row["subject"], row["unit_or_component"])
            if key not in self.ranked_dict:
                self.ranked_dict[key]=[]
            self.ranked_dict[key].append((row["teacher_name"], float(row["teacher_score"])))
        self.peer_dict={}
        for s in SUBJECT_LIST:
            for sec in df["class_section"].unique():
                candidates = df[(df["class_section"] == sec) & (df[f"{s}_bad"] == 0)]
                top_peers = candidates.sort_values(f"{s}_pct", ascending=False).head(5)
                self.peer_dict[("theory", s, sec)] = [
                    {"roll_no": str(r["roll_no"]), "full_name": str(r["full_name"]), "score_pct": float(r[f"{s}_pct"])}
                    for _,r in top_peers.iterrows()
                ]
        for l in LAB_LIST:
            for sec in df["class_section"].unique():
                candidates = df[(df["class_section"] == sec) & (df[f"lab_{l}_bad"] == 0)]
                top_peers = candidates.sort_values(f"lab_{l}_pct", ascending=False).head(5)
                self.peer_dict[("lab", l, sec)] = [
                    {"roll_no": str(r["roll_no"]), "full_name": str(r["full_name"]), "score_pct": float(r[f"lab_{l}_pct"])}
                    for _,r in top_peers.iterrows()
                ]
    def fit(self,df):
        self._calculate_max_marks(df)
        p_df=self._preprocess_dataframe(df)
        c_df=self._train_clusters(p_df)
        self._build_rankings_and_peers(c_df)
        self.is_fitted=True
        return self
    def generate_assignments_csv(self,df,output_path=None):
        if not self.is_fitted:
            self.fit(df)
        p_df=self._preprocess_dataframe(df)
        features = ["avg_pct", "min_pct", "bad_subjects", "bad_labs", "overall_attendance_pct", "previous_cgpa", "progress_score"]
        scaled_x=self.scaler.transform(p_df[features].fillna(0))
        p_df["group_id"] = self.kmeans.predict(scaled_x)
        p_df["risk_level"] = p_df["group_id"].map(self.group_mapping)
        p_df["priority_rank"] = p_df["risk_level"].map(self.priority_mapping)
        assignments=[]
        peer_rr={}
        for _,row in p_df.iterrows():
            roll_no = str(row["roll_no"])
            student_name = str(row["full_name"])
            section = str(row["class_section"])
            risk_level = str(row["risk_level"])
            priority = int(row["priority_rank"])
            prev_cgpa = float(row.get("previous_cgpa", 0.0))
            att_pct = float(row.get("overall_attendance_pct", 0.0))
            for s in SUBJECT_LIST:
                subj_pct = float(row[f"{s}_pct"])
                is_bad_subj = int(row[f"{s}_bad"]) == 1
                weak_units=[]
                lowest_unit_num=1
                lowest_unit_score=999.0
                for u in range(1,6):
                    u_pct = float(row[f"{s}_unit_{u}_pct"])
                    if u_pct < FAIL_MARKS:
                        weak_units.append(f"Unit {u} ({u_pct:.1f}%)")
                    if u_pct < lowest_unit_score:
                        lowest_unit_score=u_pct
                        lowest_unit_num=u
                if is_bad_subj or len(weak_units) > 0:
                    current_t = str(row[f"{s}_t"])
                    primary_weak_unit = f"unit {lowest_unit_num}"
                    assigned_teacher = "No Mentor Available"
                    mentor_score=0.0
                    ranked_teachers = self.ranked_dict.get(("theory", s, primary_weak_unit), [])
                    for t_name,sc in ranked_teachers:
                        if t_name !=current_t:
                            assigned_teacher=t_name
                            mentor_score=sc
                            break
                    if assigned_teacher == "No Mentor Available" and ranked_teachers:
                        assigned_teacher=ranked_teachers[0][0]
                        mentor_score=ranked_teachers[0][1]
                    peer_key = ("theory", s, section)
                    peers=self.peer_dict.get(peer_key,[])
                    peer_roll, peer_name = "None", "None"
                    if peers:
                        c_idx=peer_rr.get(peer_key,0)
                        ch=peers[c_idx % len(peers)]
                        peer_rr[peer_key]=c_idx+1
                        peer_roll, peer_name = ch["roll_no"], ch["full_name"]
                    weak_units_str = ", ".join(weak_units) if weak_units else f"Unit {lowest_unit_num} ({lowest_unit_score:.1f}%)"
                    reason = f"{s.upper()} theory weak in {weak_units_str} (Overall: {subj_pct:.1f}%)"
                    assignments.append({
                        "roll_no": roll_no,
                        "student_name": student_name,
                        "class_section": section,
                        "risk_level": risk_level,
                        "priority_rank": priority,
                        "subject_type": "theory",
                        "subject_name": s,
                        "subject_score_pct": subj_pct,
                        "weak_units": weak_units_str,
                        "primary_weak_unit": f"Unit {lowest_unit_num}",
                        "current_teacher": current_t,
                        "assigned_mentor_name": assigned_teacher,
                        "mentor_score": mentor_score,
                        "peer_mentor_roll": peer_roll,
                        "peer_mentor_name": peer_name,
                        "assignment_reason": reason,
                        "previous_cgpa": prev_cgpa,
                        "attendance_pct": att_pct
                    })
            for l in LAB_LIST:
                lab_pct = float(row[f"lab_{l}_pct"])
                if int(row[f"lab_{l}_bad"]) == 1:
                    current_t = str(row[f"lab_{l}_t"])
                    assigned_teacher = "No Mentor Available"
                    mentor_score=0.0
                    ranked_teachers = self.ranked_dict.get(("lab", l, "lab overall"), [])
                    for t_name,sc in ranked_teachers:
                        if t_name !=current_t:
                            assigned_teacher=t_name
                            mentor_score=sc
                            break
                    if assigned_teacher == "No Mentor Available" and ranked_teachers:
                        assigned_teacher=ranked_teachers[0][0]
                        mentor_score=ranked_teachers[0][1]
                    peer_key = ("lab", l, section)
                    peers=self.peer_dict.get(peer_key,[])
                    peer_roll, peer_name = "None", "None"
                    if peers:
                        c_idx=peer_rr.get(peer_key,0)
                        ch=peers[c_idx % len(peers)]
                        peer_rr[peer_key]=c_idx+1
                        peer_roll, peer_name = ch["roll_no"], ch["full_name"]
                    assignments.append({
                        "roll_no": roll_no,
                        "student_name": student_name,
                        "class_section": section,
                        "risk_level": risk_level,
                        "priority_rank": priority,
                        "subject_type": "lab",
                        "subject_name": l,
                        "subject_score_pct": lab_pct,
                        "weak_units": "Practical Lab",
                        "primary_weak_unit": "Lab",
                        "current_teacher": current_t,
                        "assigned_mentor_name": assigned_teacher,
                        "mentor_score": mentor_score,
                        "peer_mentor_roll": peer_roll,
                        "peer_mentor_name": peer_name,
                        "assignment_reason": f"{l.upper()} lab score {lab_pct:.1f}% below threshold",
                        "previous_cgpa": prev_cgpa,
                        "attendance_pct": att_pct
                    })
        assign_df=pd.DataFrame(assignments)
        if not assign_df.empty:
            assign_df = assign_df.sort_values(["priority_rank", "subject_score_pct"], ascending=[True, True])
        if output_path:
            os.makedirs(os.path.dirname(output_path),exist_ok=True)
            assign_df.to_csv(output_path,index=False)
            print(f"Exported {len(assign_df)} assignments to {output_path}")
        return assign_df
    def analyze_single_student(self,student_data):
        if not self.is_fitted:
            raise RuntimeError("Model is not fitted yet. Call load_model() first.")
        single_df=pd.DataFrame([student_data])
        processed=self._preprocess_dataframe(single_df)
        row=processed.iloc[0]
        features = ["avg_pct", "min_pct", "bad_subjects", "bad_labs", "overall_attendance_pct", "previous_cgpa", "progress_score"]
        scaled_x=self.scaler.transform(processed[features].fillna(0))
        cluster_id=int(self.kmeans.predict(scaled_x)[0])
        risk_level = self.group_mapping.get(cluster_id, "Normal")
        priority=self.priority_mapping.get(risk_level,3)
        section = str(row["class_section"]).strip().upper()
        weak_areas=[]
        for s in SUBJECT_LIST:
            subj_pct = float(row[f"{s}_pct"])
            is_bad = int(row[f"{s}_bad"]) == 1
            weak_units=[]
            lowest_unit_num=1
            lowest_unit_score=999.0
            for u in range(1,6):
                u_pct = float(row[f"{s}_unit_{u}_pct"])
                if u_pct < FAIL_MARKS:
                    weak_units.append({"unit": f"Unit {u}", "score_pct": round(u_pct, 1)})
                if u_pct < lowest_unit_score:
                    lowest_unit_score=u_pct
                    lowest_unit_num=u
            if is_bad or len(weak_units) > 0:
                current_t=self._get_current_teacher(s,section)
                primary_unit = f"unit {lowest_unit_num}"
                ranked_teachers = self.ranked_dict.get(("theory", s, primary_unit), [])
                assigned_teacher = "Faculty Pool"
                mentor_score=0.0
                for t_name,sc in ranked_teachers:
                    if t_name !=current_t:
                        assigned_teacher=t_name
                        mentor_score=sc
                        break
                if assigned_teacher == "Faculty Pool" and ranked_teachers:
                    assigned_teacher=ranked_teachers[0][0]
                    mentor_score=ranked_teachers[0][1]
                peers = self.peer_dict.get(("theory", s, section), [])
                peer_info = peers[0] if peers else {"roll_no": "None", "full_name": "None", "score_pct": 0.0}
                weak_units_desc = ", ".join([f"{item['unit']} ({item['score_pct']}%)" for item in weak_units]) if weak_units else f"Unit {lowest_unit_num} ({lowest_unit_score:.1f}%)"
                weak_areas.append({
                    "type": "theory",
                    "subject": s,
                    "subject_score_pct": round(subj_pct, 1),
                    "weak_units": weak_units,
                    "primary_weak_unit": f"Unit {lowest_unit_num}",
                    "current_teacher": current_t,
                    "assigned_mentor": {"name": assigned_teacher, "expertise_unit": f"Unit {lowest_unit_num}", "rating_score": mentor_score},
                    "peer_mentor": {"roll_no": peer_info["roll_no"], "name": peer_info["full_name"], "score_pct": peer_info.get("score_pct", 0.0)},
                    "reason": f"Weak in {weak_units_desc} with overall score {subj_pct:.1f}%"
                })
        for l in LAB_LIST:
            lab_pct = float(row[f"lab_{l}_pct"])
            if int(row[f"lab_{l}_bad"]) == 1:
                current_t=self._get_current_teacher(l,section)
                ranked_teachers = self.ranked_dict.get(("lab", l, "lab overall"), [])
                assigned_teacher = "Faculty Pool"
                mentor_score=0.0
                for t_name,sc in ranked_teachers:
                    if t_name !=current_t:
                        assigned_teacher=t_name
                        mentor_score=sc
                        break
                if assigned_teacher == "Faculty Pool" and ranked_teachers:
                    assigned_teacher=ranked_teachers[0][0]
                    mentor_score=ranked_teachers[0][1]
                peers = self.peer_dict.get(("lab", l, section), [])
                peer_info = peers[0] if peers else {"roll_no": "None", "full_name": "None", "score_pct": 0.0}
                weak_areas.append({
                    "type": "lab",
                    "subject": l,
                    "subject_score_pct": round(lab_pct, 1),
                    "weak_units": [{"unit": "Lab Practical", "score_pct": round(lab_pct, 1)}],
                    "primary_weak_unit": "Lab Practical",
                    "current_teacher": current_t,
                    "assigned_mentor": {"name": assigned_teacher, "expertise_unit": "Lab Practical", "rating_score": mentor_score},
                    "peer_mentor": {"roll_no": peer_info["roll_no"], "name": peer_info["full_name"], "score_pct": peer_info.get("score_pct", 0.0)},
                    "reason": f"Practical lab score {lab_pct:.1f}% is below {FAIL_MARKS}%"
                })
        needs_intervention = len(weak_areas) > 0 or risk_level in ("Need Help", "Fell Down")
        return {
            "roll_no": str(student_data.get("roll_no", "UNKNOWN")),
            "full_name": str(student_data.get("full_name", "Student")),
            "class_section": section,
            "risk_level": risk_level,
            "priority_rank": priority,
            "needs_intervention": needs_intervention,
            "academic_metrics": {
                "average_percentage": float(row["avg_pct"]),
                "lowest_subject_percentage": float(row["min_pct"]),
                "progress_trend_st1_to_st2": float(row["progress_score"]),
                "weak_subjects_count": int(row["bad_subjects"]),
                "weak_labs_count": int(row["bad_labs"]),
                "total_weak_areas": int(row["total_weakness"])
            },
            "weak_interventions": weak_areas,
            "recommendation_summary": (
                f"Student flagged as '{risk_level}' (Priority {priority}). {len(weak_areas)} subject/unit intervention(s) required."
                if needs_intervention else "Student is performing well across all subjects and labs."
            )
        }
    def save_model(self,path=None):
        save_path=path or MODEL_SAVE_PATH
        os.makedirs(os.path.dirname(save_path),exist_ok=True)
        with open(save_path, "wb") as f:
            pickle.dump({
                "scaler": self.scaler,
                "kmeans": self.kmeans,
                "group_mapping": self.group_mapping,
                "priority_mapping": self.priority_mapping,
                "ranked_dict": self.ranked_dict,
                "peer_dict": self.peer_dict,
                "max_marks": self.max_marks,
                "section_teacher_map": self.section_teacher_map,
                "teacher_ranking_df": self.teacher_ranking_df
            },f)
        print(f"Model saved to {save_path}")
    def load_model(self,path=None):
        load_path=path or MODEL_SAVE_PATH
        if not os.path.exists(load_path):
            raise FileNotFoundError(f"Model file not found at {load_path}")
        with open(load_path, "rb") as f:
            data=pickle.load(f)
            self.scaler = data["scaler"]
            self.kmeans = data["kmeans"]
            self.group_mapping = data["group_mapping"]
            self.priority_mapping = data.get("priority_mapping", {"Need Help": 1, "Fell Down": 2, "Normal": 3, "Topper": 4})
            self.ranked_dict = data["ranked_dict"]
            self.peer_dict = data["peer_dict"]
            self.max_marks = data["max_marks"]
            self.section_teacher_map = data.get("section_teacher_map", {})
            self.teacher_ranking_df = data.get("teacher_ranking_df", pd.DataFrame())
            self.is_fitted=True
        print(f"Model loaded successfully from {load_path}")
def run_pipeline(data_path=DEFAULT_DATA_PATH,artifacts_dir=DEFAULT_ARTIFACTS_DIR):
    print("=" * 60)
    print("Starting Mentor Pipeline...")
    print(f"Reading dataset: {data_path}")
    df=pd.read_csv(data_path)
    print(f"Dataset Loaded. Total Records: {len(df)}")
    assigner=MentorAssigner()
    assigner.fit(df)
    os.makedirs(artifacts_dir,exist_ok=True)
    teacher_csv = artifacts_dir / "teacher_ranking.csv"
    assigner.teacher_ranking_df.to_csv(teacher_csv,index=False)
    print(f"Exported teacher rankings to: {teacher_csv}")
    mentor_csv = artifacts_dir / "mentor_assign.csv"
    assigner.generate_assignments_csv(df,output_path=mentor_csv)
    model_pkl = artifacts_dir / "mentor_models.pkl"
    assigner.save_model(model_pkl)
    sample_student=df.iloc[0].to_dict()
    analysis=assigner.analyze_single_student(sample_student)
    print("Verification single student test:", analysis["roll_no"], analysis["risk_level"])
    print("=" * 60)
    return assigner
if __name__ == "__main__":
    run_pipeline()