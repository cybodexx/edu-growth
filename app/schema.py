from pydantic import BaseModel

class StudentRiskRequest(BaseModel):
    roll_no: int

class SubjectRisk(BaseModel):
    subject: str
    prediction: int
    status: str

class StudentRiskResponse(BaseModel):
    roll_no: int
    predictions: list[SubjectRisk]    