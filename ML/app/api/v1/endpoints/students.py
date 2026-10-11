"""
Student management endpoints -- the database is the single source of truth.

    POST   /api/v1/students             add (or upsert) one student  (+ mentor)
    PUT    /api/v1/students/{roll_no}   partial update               (+ mentor)
    GET    /api/v1/students             list students (paged)
    GET    /api/v1/students/{roll_no}   one student
    DELETE /api/v1/students/{roll_no}   delete one student

Body accepts *any* column from the cleaned dataset; unknown keys are stored in
the row's ``payload``. No CSV is involved anywhere.
"""
from fastapi import APIRouter, BackgroundTasks, HTTPException, Path, Query

from app.schemas.student_schema import StudentCreate, StudentUpdate
from app.services import student_service
from app.services.student_service import StudentServiceError

router = APIRouter()


@router.post("", summary="Add or upsert a student (mentor assigned in the background)")
def add_student(payload: StudentCreate, background_tasks: BackgroundTasks):
    """Insert a student. If the roll number already exists, its fields are updated."""
    try:
        saved = student_service.add_student(payload.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    background_tasks.add_task(student_service.assign_mentor, saved["roll_no"])
    return saved


@router.put("/{roll_no}", summary="Update a student (partial, mentor re-assigned in the background)")
def update_student(
    payload: StudentUpdate,
    background_tasks: BackgroundTasks,
    roll_no: str = Path(..., description="Student roll number"),
):
    """Update only the fields you send; everything else stays as it was."""
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update.")
    try:
        saved = student_service.update_student(roll_no, data)
    except StudentServiceError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    background_tasks.add_task(student_service.assign_mentor, roll_no)
    return saved


@router.get("", summary="List students (paged, optional search)")
def list_students(
    limit: int = Query(50, ge=1, le=500, description="Rows per page"),
    offset: int = Query(0, ge=0, description="Rows to skip"),
    search: str | None = Query(
        None,
        description="Case-insensitive substring match on roll number OR full name",
        max_length=120,
    ),
):
    return student_service.list_students(limit=limit, offset=offset, search=search)


@router.get("/{roll_no}", summary="Get one student")
def get_student(roll_no: str = Path(..., description="Student roll number")):
    record = student_service.get_student(roll_no)
    if not record:
        raise HTTPException(status_code=404, detail=f"No student found for '{roll_no}'.")
    return record


@router.delete("/{roll_no}", summary="Delete one student")
def delete_student(roll_no: str = Path(..., description="Student roll number")):
    if not student_service.delete_student(roll_no):
        raise HTTPException(status_code=404, detail=f"No student found for '{roll_no}'.")
    return {"deleted": roll_no}
