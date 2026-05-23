"""
Appointments router — cross-user scheduling.
Patient books → Doctor and Nurse see it in their queues.
"""
import time
import uuid
from fastapi import APIRouter, HTTPException, Query
from app import state

router = APIRouter(prefix="/appointments", tags=["appointments"])

VALID_STATUSES = {"pending", "confirmed", "cancelled", "completed", "no-show"}
VALID_DEPARTMENTS = [
    "Cardiology", "Oncology", "Neurology", "Orthopaedics",
    "General Surgery", "Internal Medicine", "Paediatrics",
    "Gynaecology & Obstetrics", "Ophthalmology", "ENT",
    "Dermatology", "Psychiatry", "Radiology", "Emergency",
    "Outpatient", "Follow-up", "Pharmacy",
]
AVAILABLE_TIMES = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30",
                   "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00"]


@router.get("")
def list_appointments(
    patient_id: str | None = Query(None),
    department: str | None = Query(None),
    status: str | None = Query(None),
    date: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
):
    rows = state.appointments[:]
    if patient_id:
        rows = [r for r in rows if r.get("patient_id") == patient_id]
    if department:
        rows = [r for r in rows if r.get("department", "").lower() == department.lower()]
    if status:
        rows = [r for r in rows if r.get("status") == status]
    if date:
        rows = [r for r in rows if r.get("date") == date]
    return rows[:limit]


@router.post("")
def create_appointment(payload: dict):
    patient_id = str(payload.get("patient_id") or "").strip()
    facility   = str(payload.get("facility") or "").strip()
    department = str(payload.get("department") or "").strip()
    date       = str(payload.get("date") or "").strip()
    appt_time  = str(payload.get("time") or "").strip()
    notes      = str(payload.get("notes") or "").strip()
    patient_name = str(payload.get("patient_name") or "").strip()
    booked_by  = str(payload.get("booked_by") or "patient").strip()

    if not patient_id:
        raise HTTPException(400, "patient_id required")
    if not facility:
        raise HTTPException(400, "facility required")
    if not department:
        raise HTTPException(400, "department required")
    if not date:
        raise HTTPException(400, "date required")
    if not appt_time:
        raise HTTPException(400, "time required")

    apt_id = f"APT-{uuid.uuid4().hex[:8].upper()}"
    record = {
        "id": apt_id,
        "patient_id": patient_id,
        "patient_name": patient_name or patient_id,
        "facility": facility,
        "department": department,
        "date": date,
        "time": appt_time,
        "notes": notes,
        "status": "pending",
        "booked_by": booked_by,
        "created_at": time.time(),
    }
    state.appointments.append(record)
    return {"status": "created", "id": apt_id, "appointment": record}


@router.get("/slots")
def available_slots(date: str = Query(...), facility: str = Query(""), department: str = Query("")):
    """Return available time slots for a given date/facility/department."""
    booked = {
        r["time"]
        for r in state.appointments
        if r.get("date") == date
        and (not facility or r.get("facility", "").lower() == facility.lower())
        and (not department or r.get("department", "").lower() == department.lower())
        and r.get("status") not in ("cancelled", "no-show")
    }
    slots = [t for t in AVAILABLE_TIMES if t not in booked]
    return {"date": date, "available": slots, "booked": list(booked)}


@router.get("/departments")
def get_departments():
    return {"departments": VALID_DEPARTMENTS}


@router.get("/{apt_id}")
def get_appointment(apt_id: str):
    for r in state.appointments:
        if r["id"] == apt_id:
            return r
    raise HTTPException(404, f"Appointment {apt_id} not found")


@router.post("/{apt_id}/confirm")
def confirm_appointment(apt_id: str):
    for r in state.appointments:
        if r["id"] == apt_id:
            r["status"] = "confirmed"
            r["updated_at"] = time.time()
            return {"status": "confirmed", "id": apt_id}
    raise HTTPException(404, f"Appointment {apt_id} not found")


@router.post("/{apt_id}/cancel")
def cancel_appointment(apt_id: str, payload: dict = {}):
    for r in state.appointments:
        if r["id"] == apt_id:
            r["status"] = "cancelled"
            r["cancel_reason"] = str(payload.get("reason") or "")
            r["updated_at"] = time.time()
            return {"status": "cancelled", "id": apt_id}
    raise HTTPException(404, f"Appointment {apt_id} not found")


@router.post("/{apt_id}/complete")
def complete_appointment(apt_id: str):
    for r in state.appointments:
        if r["id"] == apt_id:
            r["status"] = "completed"
            r["updated_at"] = time.time()
            return {"status": "completed", "id": apt_id}
    raise HTTPException(404, f"Appointment {apt_id} not found")


@router.put("/{apt_id}")
def update_appointment(apt_id: str, payload: dict):
    for r in state.appointments:
        if r["id"] == apt_id:
            for key in ("patient_id", "patient_name", "facility", "department", "date", "time", "notes", "status"):
                if key in payload and payload[key] is not None:
                    val = payload[key]
                    if key == "status":
                        st = str(val).strip().lower()
                        if st and st not in VALID_STATUSES:
                            raise HTTPException(400, f"invalid status: {val}")
                        r["status"] = st
                    elif key == "time":
                        r["time"] = str(val).strip()
                    else:
                        r[key] = str(val).strip() if isinstance(val, str) else val
            r["updated_at"] = time.time()
            return {"status": "updated", "id": apt_id, "appointment": r}
    raise HTTPException(404, f"Appointment {apt_id} not found")


@router.delete("/{apt_id}")
def delete_appointment(apt_id: str):
    for i, r in enumerate(state.appointments):
        if r["id"] == apt_id:
            state.appointments.pop(i)
            return {"status": "deleted", "id": apt_id}
    raise HTTPException(404, f"Appointment {apt_id} not found")
