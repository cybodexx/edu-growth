from fastapi import FastAPI, HTTPException
import joblib
import pandas as pd
from schema import StudentRiskRequest, StudentRiskResponse, SubjectRisk
app = FastAPI()

coa_model = joblib.load("../artifacts/coa_risk.pkl")
maths4_model = joblib.load("../artifacts/maths4_risk.pkl")
dstl_model = joblib.load("../artifacts/dstl_risk.pkl")
ds_model = joblib.load("../artifacts/ds_risk.pkl")
python_model = joblib.load("../artifacts/python_risk.pkl")
cyber_model = joblib.load("../artifacts/cyber_risk.pkl")

risk_models = [
    ("coa", coa_model),
    ("maths4", maths4_model),
    ("dstl", dstl_model),
    ("ds", ds_model),
    ("python", python_model),
    ("cyber", cyber_model)
]

df = pd.read_csv("../data/processed/edu_growth_cleaned.csv")

@app.get("/student/{roll_no}")
def get_student_by_roll_no(roll_no: int):
    student = df[df["roll_no"] == roll_no]
    if student.empty:
        return None
    return student.iloc[0].to_dict()

@app.post("/predict-risk", response_model=StudentRiskResponse)
def predict_risk(data: StudentRiskRequest):
    roll_no = data.roll_no
    student_df = df[df["roll_no"] == roll_no]
    if student_df.empty:raise HTTPException( status_code=404, detail="Student not found")

    predictions = []
    for subject, model_data in risk_models:
        model = model_data["model"]
        features = model_data["features"]
        threshold = model_data["threshold"]

        X = student_df[features]
        probability = model.predict_proba(X)[0, 1]
        prediction = int(probability >= threshold)

        predictions.append(SubjectRisk(subject=subject,prediction=prediction,status="At Risk" if prediction == 1 else "Safe "))

    return StudentRiskResponse(roll_no=roll_no,predictions=predictions)