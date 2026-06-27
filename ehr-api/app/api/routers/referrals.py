"""Referral management — create and track inter-facility referrals."""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query, Request

import app.state as st
from app.auth import require_role
from app.legal_documents import validate_patient_id

router = APIRouter(prefix="/referrals", tags=["referrals"])

REFERRAL_DEPARTMENTS = [
    "Cardiology",
    "Neurology",
    "Oncology",
    "Orthopaedics",
    "Paediatrics",
    "Obstetrics & Gynaecology",
    "General Surgery",
    "Internal Medicine",
    "Nephrology",
    "Pulmonology",
    "Psychiatry",
    "Radiology",
    "ICU / Critical Care",
    "Emergency Medicine",
    "Physiotherapy",
]

REFERRAL_PRIORITIES = ("Routine", "Urgent", "Emergency")


@router.get("/departments", summary="List referral specialty departments.")
async def referral_departments(request: Request):
    require_role(request, ["doctor", "nurse", "admin"])
    return {"departments": REFERRAL_DEPARTMENTS}


@router.get("", summary="List referrals.")
async def list_referrals(
    request: Request,
    patient_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    require_role(request, ["doctor", "nurse", "admin"])
    rows = list(st.referrals)
    if patient_id:
        try:
            pid = validate_patient_id(patient_id)
            rows = [r for r in rows if str(r.get("patient_id") or "") == pid]
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid patient_id")
    if status:
        rows = [r for r in rows if str(r.get("status") or "").lower() == status.strip().lower()]
    rows.sort(key=lambda r: r.get("created_at") or 0, reverse=True)
    return {"referrals": rows[:limit], "count": len(rows[:limit])}


@router.post("", summary="Create a referral.")
async def create_referral(request: Request, payload: dict = Body(...)):
    role = require_role(request, ["doctor", "nurse", "admin"])
    try:
        pid = validate_patient_id(str(payload.get("patient_id") or ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    patient_name = str(payload.get("patient_name") or "").strip()
    hospital_id = str(payload.get("hospital_id") or "").strip()
    hospital_name = str(payload.get("hospital_name") or "").strip()
    department = str(payload.get("department") or "").strip()
    priority = str(payload.get("priority") or "Routine").strip()
    clinical_summary = str(payload.get("clinical_summary") or "").strip()

    if not hospital_name:
        raise HTTPException(status_code=400, detail="hospital_name is required")
    if not department:
        raise HTTPException(status_code=400, detail="department is required")
    if department not in REFERRAL_DEPARTMENTS:
        raise HTTPException(status_code=400, detail=f"Invalid department. Choose from: {', '.join(REFERRAL_DEPARTMENTS[:5])}…")
    if priority not in REFERRAL_PRIORITIES:
        raise HTTPException(status_code=400, detail=f"priority must be one of: {', '.join(REFERRAL_PRIORITIES)}")

    now = time.time()
    ref_id = f"REF-{int(now * 1000)}"
    row: dict[str, Any] = {
        "id": ref_id,
        "patient_id": pid,
        "patient_name": patient_name or pid,
        "hospital_id": hospital_id or None,
        "hospital_name": hospital_name,
        "department": department,
        "priority": priority,
        "clinical_summary": clinical_summary[:2000] if clinical_summary else None,
        "status": "Sent",
        "created_by_role": role,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
        "created_at_ts": now,
    }
    st.referrals.insert(0, row)
    if len(st.referrals) > 500:
        st.referrals[:] = st.referrals[:500]
    return {"status": "created", "referral": row}
