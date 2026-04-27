"""
UniHealth EHR Phase 1 - Edge FHIR gateway.

Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
Strategy: Redis (hot) first; on miss, PostgreSQL (warm) then backfill cache.
Pilot EMRs POST Patient/Encounter to Kafka via ingestion API.
"""

import asyncpg
import os
import time
from collections import defaultdict

from fastapi import Body, FastAPI, HTTPException, Header, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
import httpx

from app.config import settings
from app.ingestion import send_encounter, send_medication_request, send_observation, send_patient
from app.models import MedicationRequest, Observation, PatientSummary
from app.store import (
    close_postgres_pool,
    close_redis_client,
    get_summary_from_cache,
    get_summary_from_db,
    get_med_requests_from_cache,
    get_med_requests_from_db,
    get_observations_from_cache,
    get_observations_from_db,
    set_summary_in_cache,
    set_med_requests_in_cache,
    set_observations_in_cache,
    grant_consent,
    has_active_consent,
    init_postgres_pool,
    init_redis_client,
    patient_exists,
    revoke_consent,
)

app = FastAPI(
    title="UniHealth EHR Edge Gateway",
    description="Phase 1: Patient + recent encounters with <50ms P95",
    version="0.1.0",
)

# ----- Generic action log (remove "demo" placeholders) -----
_ui_actions: list[dict] = []

# ----- Integration: Kenya MOH Master Facility List (KMHFL) -----
_kmhfl_cache: dict[str, tuple[float, dict]] = {}
_KMHFL_TTL_S = 300.0


def _kmhfl_base_url() -> str:
    # Pick a stable default, but allow override.
    return (os.getenv("KMHFL_BASE_URL") or "https://kmhfl.health.go.ke").rstrip("/")


@app.get("/integrations/kmhfl/facilities", status_code=200, summary="Proxy Kenya KMHFL facilities with caching.")
async def kmhfl_facilities(
    search: str | None = Query(default=None),
    name: str | None = Query(default=None),
    code: str | None = Query(default=None, description="Comma-separated facility codes"),
    is_published: bool | None = Query(default=True),
    is_classified: bool | None = Query(default=False),
    limit: int = Query(default=50, ge=1, le=200),
    page: int = Query(default=1, ge=1, le=5000),
):
    """
    Proxies the KMHFL API so the frontend can call it without CORS issues.
    Response is cached briefly to reduce load and improve perceived speed.
    """
    base = _kmhfl_base_url()
    url = f"{base}/api/facilities/facilities/"
    params: dict[str, str] = {"page": str(page), "page_size": str(limit)}
    if search:
        params["search"] = search
    if name:
        params["name"] = name
    if code:
        params["code"] = code
    if is_published is not None:
        params["is_published"] = "true" if is_published else "false"
    if is_classified is not None:
        params["is_classified"] = "true" if is_classified else "false"

    key = f"{url}?{sorted(params.items())}"
    now = time.time()
    cached = _kmhfl_cache.get(key)
    if cached and (now - cached[0]) < _KMHFL_TTL_S:
        return {"source": "kmhfl", "cached": True, "base_url": base, **cached[1]}

    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers={"Accept": "application/json"})
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"KMHFL fetch failed: {e}")

    if resp.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"KMHFL returned {resp.status_code}: {resp.text[:400]}")

    data = resp.json()
    if not isinstance(data, dict):
        data = {"results": data}
    _kmhfl_cache[key] = (now, data)
    return {"source": "kmhfl", "cached": False, "base_url": base, **data}

# ----- Admin: User management (Phase 1 UI, in-memory) -----
_admin_users: list[dict] = [
    {
        "id": "USR-0001",
        "name": "M. Kamau",
        "email": "m.kamau@moh.go.ke",
        "role": "System Admin",
        "reg": "ADM-0142",
        "facility": "MOH HQ",
        "auth": "Biometric",
        "status": "Active",
        "last_login": "Today 08:12",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "USR-0002",
        "name": "S. Njeri",
        "email": "s.njeri@unihealth.ke",
        "role": "Security Admin",
        "reg": "SEC-0081",
        "facility": "UniHealth SecOps",
        "auth": "Practice 360",
        "status": "Active",
        "last_login": "Today 07:51",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "USR-0003",
        "name": "J. Odhiambo",
        "email": "j.odhiambo@unihealth.ke",
        "role": "Data Manager",
        "reg": "DM-2210",
        "facility": "Data Hub",
        "auth": "OTP",
        "status": "Pending",
        "last_login": "Yesterday 19:02",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
]

# ----- Admin: Facilities (Phase 1 UI, in-memory) -----
_admin_facilities: list[dict] = [
    {
        "id": "FAC-0001",
        "name": "KNH Nairobi",
        "level": "Level 6",
        "county": "Nairobi",
        "status": "ONLINE",
        "latency": "22ms",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "FAC-0002",
        "name": "Nakuru Level 5",
        "level": "Level 5",
        "county": "Nakuru",
        "status": "DEGRADED",
        "latency": "88ms",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
    {
        "id": "FAC-0003",
        "name": "MTRH Eldoret",
        "level": "Level 6",
        "county": "Uasin Gishu",
        "status": "ONLINE",
        "latency": "31ms",
        "created_at": time.time(),
        "updated_at": time.time(),
    },
]

# ----- Admin: Patient Registry (Phase 1 UI, in-memory) -----
_admin_patients: list[dict] = [
    {
        "id": "PAT-0001",
        "afl_id": "AFL-2026-KE-00312",
        "name": "Wangui Njoroge",
        "email": "wangui.njoroge@example.com",
        "phone": "+254700000312",
        "facility": "KNH Nairobi",
        "status": "Active",
        "created_at": time.time(),
        "updated_at": time.time(),
    }
]


@app.post("/ui/actions", status_code=200, summary="Record a UI action (Phase 1 UI).")
async def ui_record_action(payload: dict = Body(...)):
    action_id = payload.get("id") or f"ACT-{int(time.time() * 1000)}"
    row = {"id": action_id, **payload, "created_at": time.time()}
    _ui_actions.insert(0, row)
    return {"status": "recorded", "id": action_id}


@app.get("/ui/actions", status_code=200, summary="List UI actions (Phase 1 UI).")
async def ui_list_actions(limit: int = Query(default=100, ge=1, le=500)):
    return _ui_actions[:limit]


@app.get("/admin/users", status_code=200, summary="List admin-managed users (Phase 1 UI).")
async def admin_list_users(
    q: str | None = Query(default=None, description="Optional search across name/email/reg/facility/role"),
    role: str | None = Query(default=None),
    facility: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
):
    rows = list(_admin_users)
    if q:
        qq = q.strip().lower()
        if qq:
            rows = [
                r
                for r in rows
                if qq in str(r.get("name", "")).lower()
                or qq in str(r.get("email", "")).lower()
                or qq in str(r.get("reg", "")).lower()
                or qq in str(r.get("facility", "")).lower()
                or qq in str(r.get("role", "")).lower()
            ]
    if role:
        rows = [r for r in rows if str(r.get("role", "")).lower() == role.strip().lower()]
    if facility:
        rows = [r for r in rows if str(r.get("facility", "")).lower() == facility.strip().lower()]
    if status:
        rows = [r for r in rows if str(r.get("status", "")).lower() == status.strip().lower()]
    return rows[:limit]


@app.post("/admin/users", status_code=200, summary="Create a user (Phase 1 UI).")
async def admin_create_user(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    email = (payload.get("email") or "").strip().lower()
    role = (payload.get("role") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not email:
        raise HTTPException(status_code=400, detail="email is required")
    if not role:
        raise HTTPException(status_code=400, detail="role is required")
    if any(str(u.get("email", "")).lower() == email for u in _admin_users):
        raise HTTPException(status_code=409, detail="email already exists")
    user_id = payload.get("id") or f"USR-{int(time.time() * 1000)}"
    now = time.time()
    row = {
        "id": user_id,
        "name": name,
        "email": email,
        "role": role,
        "reg": (payload.get("reg") or "").strip() or None,
        "facility": (payload.get("facility") or "").strip() or None,
        "auth": (payload.get("auth") or "").strip() or "OTP",
        "status": (payload.get("status") or "").strip() or "Pending",
        "last_login": payload.get("last_login") or "Never",
        "created_at": now,
        "updated_at": now,
    }
    _admin_users.insert(0, row)
    return {"status": "created", "id": user_id, "user": row}


@app.put("/admin/users/{user_id}", status_code=200, summary="Update a user (Phase 1 UI).")
async def admin_update_user(user_id: str, payload: dict = Body(...)):
    now = time.time()
    for u in _admin_users:
        if str(u.get("id")) == user_id:
            if "email" in payload:
                new_email = (payload.get("email") or "").strip().lower()
                if not new_email:
                    raise HTTPException(status_code=400, detail="email cannot be empty")
                if any(str(x.get("email", "")).lower() == new_email and str(x.get("id")) != user_id for x in _admin_users):
                    raise HTTPException(status_code=409, detail="email already exists")
                u["email"] = new_email
            for k in ["name", "role", "reg", "facility", "auth", "status", "last_login"]:
                if k in payload:
                    val = payload.get(k)
                    u[k] = val.strip() if isinstance(val, str) else val
            u["updated_at"] = now
            return {"status": "updated", "id": user_id, "user": u}
    raise HTTPException(status_code=404, detail="User not found")


@app.delete("/admin/users/{user_id}", status_code=200, summary="Delete a user (Phase 1 UI).")
async def admin_delete_user(user_id: str):
    for i, u in enumerate(_admin_users):
        if str(u.get("id")) == user_id:
            _admin_users.pop(i)
            return {"status": "deleted", "id": user_id}
    raise HTTPException(status_code=404, detail="User not found")


@app.post("/admin/users/bulk", status_code=200, summary="Create multiple users (CSV import, Phase 1 UI).")
async def admin_bulk_users(payload: dict = Body(...)):
    raw = payload.get("users")
    if not isinstance(raw, list):
        raise HTTPException(status_code=400, detail="users must be a non-empty list")
    created: list[dict] = []
    errors: list[dict] = []
    batch_ts = int(time.time() * 1000)
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            errors.append({"index": idx, "detail": "row must be an object"})
            continue
        name = (item.get("name") or "").strip()
        email = (item.get("email") or "").strip().lower()
        role = (item.get("role") or "").strip()
        if not name or not email or not role:
            errors.append({"index": idx, "detail": "name, email, and role are required"})
            continue
        if any(str(u.get("email", "")).lower() == email for u in _admin_users):
            errors.append({"index": idx, "email": email, "detail": "email already exists"})
            continue
        user_id = item.get("id") or f"USR-{batch_ts}-{idx}"
        now = time.time()
        row = {
            "id": user_id,
            "name": name,
            "email": email,
            "role": role,
            "reg": (item.get("reg") or "").strip() or None,
            "facility": (item.get("facility") or "").strip() or None,
            "auth": (item.get("auth") or "").strip() or "OTP",
            "status": (item.get("status") or "").strip() or "Pending",
            "last_login": item.get("last_login") or "Never",
            "created_at": now,
            "updated_at": now,
        }
        _admin_users.insert(0, row)
        created.append(row)
    return {"status": "ok", "created_count": len(created), "created": created, "errors": errors}


@app.get("/admin/facilities", status_code=200, summary="List facilities (Phase 1 UI).")
async def admin_list_facilities(
    q: str | None = Query(default=None),
    county: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
):
    rows = list(_admin_facilities)
    if q:
        qq = q.strip().lower()
        if qq:
            rows = [r for r in rows if qq in str(r.get("name", "")).lower() or qq in str(r.get("id", "")).lower()]
    if county:
        rows = [r for r in rows if str(r.get("county", "")).lower() == county.strip().lower()]
    if status:
        rows = [r for r in rows if str(r.get("status", "")).lower() == status.strip().lower()]
    return rows[:limit]


@app.post("/admin/facilities", status_code=200, summary="Create a facility (Phase 1 UI).")
async def admin_create_facility(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if any(str(f.get("name", "")).strip().lower() == name.lower() for f in _admin_facilities):
        raise HTTPException(status_code=409, detail="facility name already exists")
    fac_id = payload.get("id") or f"FAC-{int(time.time() * 1000)}"
    now = time.time()
    row = {
        "id": fac_id,
        "name": name,
        "level": (payload.get("level") or "").strip() or None,
        "county": (payload.get("county") or "").strip() or None,
        "status": (payload.get("status") or "").strip() or "ONLINE",
        "latency": (payload.get("latency") or "").strip() or None,
        "created_at": now,
        "updated_at": now,
    }
    _admin_facilities.insert(0, row)
    return {"status": "created", "id": fac_id, "facility": row}


@app.put("/admin/facilities/{facility_id}", status_code=200, summary="Update a facility (Phase 1 UI).")
async def admin_update_facility(facility_id: str, payload: dict = Body(...)):
    now = time.time()
    for f in _admin_facilities:
        if str(f.get("id")) == facility_id:
            if "name" in payload:
                new_name = (payload.get("name") or "").strip()
                if not new_name:
                    raise HTTPException(status_code=400, detail="name cannot be empty")
                if any(str(x.get("name", "")).strip().lower() == new_name.lower() and str(x.get("id")) != facility_id for x in _admin_facilities):
                    raise HTTPException(status_code=409, detail="facility name already exists")
                f["name"] = new_name
            for k in ["level", "county", "status", "latency"]:
                if k in payload:
                    val = payload.get(k)
                    f[k] = val.strip() if isinstance(val, str) else val
            f["updated_at"] = now
            return {"status": "updated", "id": facility_id, "facility": f}
    raise HTTPException(status_code=404, detail="Facility not found")


@app.delete("/admin/facilities/{facility_id}", status_code=200, summary="Delete a facility (Phase 1 UI).")
async def admin_delete_facility(facility_id: str):
    for i, f in enumerate(_admin_facilities):
        if str(f.get("id")) == facility_id:
            _admin_facilities.pop(i)
            return {"status": "deleted", "id": facility_id}
    raise HTTPException(status_code=404, detail="Facility not found")


@app.get("/admin/patients", status_code=200, summary="List patients (Phase 1 UI).")
async def admin_list_patients(
    q: str | None = Query(default=None),
    facility: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
):
    rows = list(_admin_patients)
    if q:
        qq = q.strip().lower()
        if qq:
            rows = [
                r
                for r in rows
                if qq in str(r.get("name", "")).lower()
                or qq in str(r.get("afl_id", "")).lower()
                or qq in str(r.get("email", "")).lower()
                or qq in str(r.get("phone", "")).lower()
            ]
    if facility:
        rows = [r for r in rows if str(r.get("facility", "")).lower() == facility.strip().lower()]
    if status:
        rows = [r for r in rows if str(r.get("status", "")).lower() == status.strip().lower()]
    return rows[:limit]


@app.post("/admin/patients", status_code=200, summary="Register a patient (Phase 1 UI).")
async def admin_create_patient(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    afl_id = (payload.get("afl_id") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if not afl_id:
        raise HTTPException(status_code=400, detail="afl_id is required")
    if any(str(p.get("afl_id", "")).strip().lower() == afl_id.lower() for p in _admin_patients):
        raise HTTPException(status_code=409, detail="afl_id already exists")
    pat_id = payload.get("id") or f"PAT-{int(time.time() * 1000)}"
    now = time.time()
    row = {
        "id": pat_id,
        "afl_id": afl_id,
        "name": name,
        "email": (payload.get("email") or "").strip().lower() or None,
        "phone": (payload.get("phone") or "").strip() or None,
        "facility": (payload.get("facility") or "").strip() or None,
        "status": (payload.get("status") or "").strip() or "Active",
        "created_at": now,
        "updated_at": now,
    }
    _admin_patients.insert(0, row)
    return {"status": "created", "id": pat_id, "patient": row}


@app.put("/admin/patients/{patient_id}", status_code=200, summary="Update a patient (Phase 1 UI).")
async def admin_update_patient(patient_id: str, payload: dict = Body(...)):
    now = time.time()
    for p in _admin_patients:
        if str(p.get("id")) == patient_id:
            if "afl_id" in payload:
                new_afl = (payload.get("afl_id") or "").strip()
                if not new_afl:
                    raise HTTPException(status_code=400, detail="afl_id cannot be empty")
                if any(str(x.get("afl_id", "")).strip().lower() == new_afl.lower() and str(x.get("id")) != patient_id for x in _admin_patients):
                    raise HTTPException(status_code=409, detail="afl_id already exists")
                p["afl_id"] = new_afl
            for k in ["name", "email", "phone", "facility", "status"]:
                if k in payload:
                    val = payload.get(k)
                    p[k] = val.strip() if isinstance(val, str) else val
            p["updated_at"] = now
            return {"status": "updated", "id": patient_id, "patient": p}
    raise HTTPException(status_code=404, detail="Patient not found")


@app.delete("/admin/patients/{patient_id}", status_code=200, summary="Delete a patient (Phase 1 UI).")
async def admin_delete_patient(patient_id: str):
    for i, p in enumerate(_admin_patients):
        if str(p.get("id")) == patient_id:
            _admin_patients.pop(i)
            return {"status": "deleted", "id": patient_id}
    raise HTTPException(status_code=404, detail="Patient not found")

# ----- Nurse action endpoints (Phase 1 UI) -----
_nurse_incidents: list[dict] = []
_nurse_supply_requests: list[dict] = []
_nurse_tasks: list[dict] = []
_nurse_fluid_entries: list[dict] = []
_nurse_wound_entries: list[dict] = []
_nurse_handover_notes: list[dict] = []


@app.post("/nurse/incidents", status_code=200, summary="Create a nurse incident report (Phase 1 UI).")
async def nurse_create_incident(payload: dict = Body(...)):
    """
    Minimal endpoint for the nurse UI to submit an incident report.
    Stored in-memory for Phase 1; can be moved to Postgres + Kafka later.
    """
    incident_id = payload.get("id") or f"INC-{int(time.time() * 1000)}"
    row = {"id": incident_id, **payload, "created_at": time.time()}
    _nurse_incidents.insert(0, row)
    return {"status": "created", "id": incident_id}


@app.get("/nurse/incidents", status_code=200, summary="List nurse incident reports (Phase 1 UI).")
async def nurse_list_incidents(limit: int = Query(default=50, ge=1, le=200)):
    return _nurse_incidents[:limit]


@app.post("/nurse/supplies", status_code=200, summary="Create a nurse supply request (Phase 1 UI).")
async def nurse_create_supply(payload: dict = Body(...)):
    req_id = payload.get("id") or f"SUP-{int(time.time() * 1000)}"
    row = {"id": req_id, **payload, "created_at": time.time()}
    _nurse_supply_requests.insert(0, row)
    return {"status": "created", "id": req_id}


@app.get("/nurse/supplies", status_code=200, summary="List nurse supply requests (Phase 1 UI).")
async def nurse_list_supplies(limit: int = Query(default=50, ge=1, le=200)):
    return _nurse_supply_requests[:limit]


@app.post("/nurse/tasks", status_code=200, summary="Create a nurse task (Phase 1 UI).")
async def nurse_create_task(payload: dict = Body(...)):
    task_id = payload.get("id") or f"TASK-{int(time.time() * 1000)}"
    row = {
        "id": task_id,
        "patient_id": payload.get("patient_id"),
        "title": payload.get("title"),
        "due": payload.get("due"),
        "status": payload.get("status", "pending"),
        "created_at": time.time(),
    }
    _nurse_tasks.insert(0, row)
    return {"status": "created", "id": task_id}


@app.get("/nurse/tasks", status_code=200, summary="List nurse tasks (Phase 1 UI).")
async def nurse_list_tasks(limit: int = Query(default=100, ge=1, le=500)):
    return _nurse_tasks[:limit]


@app.post("/nurse/tasks/complete", status_code=200, summary="Complete a nurse task (Phase 1 UI).")
async def nurse_complete_task(payload: dict = Body(...)):
    task_id = payload.get("id")
    if not task_id:
        raise HTTPException(status_code=400, detail="id is required")
    for t in _nurse_tasks:
        if t.get("id") == task_id:
            t["status"] = "complete"
            t["completed_at"] = time.time()
            return {"status": "completed", "id": task_id}
    raise HTTPException(status_code=404, detail="Task not found")


@app.post("/nurse/fluids", status_code=200, summary="Create a fluid balance entry (Phase 1 UI).")
async def nurse_create_fluid(payload: dict = Body(...)):
    entry_id = payload.get("id") or f"FLD-{int(time.time() * 1000)}"
    row = {
        "id": entry_id,
        "patient_id": payload.get("patient_id"),
        "type": payload.get("type"),  # intake|output
        "route": payload.get("route"),
        "volume_ml": payload.get("volume_ml"),
        "time": payload.get("time") or time.time(),
        "notes": payload.get("notes"),
        "created_at": time.time(),
    }
    _nurse_fluid_entries.insert(0, row)
    return {"status": "created", "id": entry_id}


@app.get("/nurse/fluids", status_code=200, summary="List fluid balance entries (Phase 1 UI).")
async def nurse_list_fluids(limit: int = Query(default=200, ge=1, le=500)):
    return _nurse_fluid_entries[:limit]


@app.post("/nurse/wounds", status_code=200, summary="Create a wound/dressing entry (Phase 1 UI).")
async def nurse_create_wound(payload: dict = Body(...)):
    entry_id = payload.get("id") or f"WND-{int(time.time() * 1000)}"
    row = {
        "id": entry_id,
        "patient_id": payload.get("patient_id"),
        "site": payload.get("site"),
        "wound_type": payload.get("wound_type"),
        "dressing": payload.get("dressing"),
        "notes": payload.get("notes"),
        "time": payload.get("time") or time.time(),
        "created_at": time.time(),
    }
    _nurse_wound_entries.insert(0, row)
    return {"status": "created", "id": entry_id}


@app.get("/nurse/wounds", status_code=200, summary="List wound/dressing entries (Phase 1 UI).")
async def nurse_list_wounds(limit: int = Query(default=200, ge=1, le=500)):
    return _nurse_wound_entries[:limit]


@app.post("/nurse/handover", status_code=200, summary="Submit/sign handover notes (Phase 1 UI).")
async def nurse_submit_handover(payload: dict = Body(...)):
    note_id = payload.get("id") or f"HND-{int(time.time() * 1000)}"
    row = {
        "id": note_id,
        "ward": payload.get("ward"),
        "shift": payload.get("shift"),
        "author": payload.get("author"),
        "summary": payload.get("summary"),
        "special_attention": payload.get("special_attention"),
        "signed": bool(payload.get("signed", True)),
        "signed_at": time.time() if payload.get("signed", True) else None,
        "created_at": time.time(),
    }
    _nurse_handover_notes.insert(0, row)
    return {"status": "submitted", "id": note_id}


@app.get("/nurse/handover", status_code=200, summary="List handover submissions (Phase 1 UI).")
async def nurse_list_handover(limit: int = Query(default=50, ge=1, le=200)):
    return _nurse_handover_notes[:limit]

# Lightweight in-memory metrics for Phase 1 validation.
_metrics_counts = defaultdict(int)
_metrics_latency_sum_ms = defaultdict(float)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_postgres_pool()
    await init_redis_client()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_redis_client()
    await close_postgres_pool()


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    path = request.url.path
    method = request.method
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        status = 500
        _metrics_counts[(method, path, status)] += 1
        raise
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        _metrics_latency_sum_ms[(method, path)] += elapsed_ms
        _metrics_counts[(method, path, "requests")] += 1
    response.headers["X-Request-Latency-Ms"] = f"{elapsed_ms:.2f}"
    _metrics_counts[(method, path, status)] += 1
    return response


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/metrics/json", summary="Simple in-memory metrics (Phase 1)")
async def metrics_json():
    rows = []
    for key, req_count in _metrics_counts.items():
        if len(key) == 3 and key[2] == "requests":
            method, path, _ = key
            total_ms = _metrics_latency_sum_ms[(method, path)]
            avg_ms = (total_ms / req_count) if req_count else 0.0
            status_counts = {
                str(k[2]): v
                for k, v in _metrics_counts.items()
                if len(k) == 3 and k[0] == method and k[1] == path and k[2] != "requests"
            }
            rows.append(
                {
                    "method": method,
                    "path": path,
                    "requests": req_count,
                    "avg_latency_ms": round(avg_ms, 2),
                    "status_counts": status_counts,
                }
            )
    return {"routes": sorted(rows, key=lambda r: (r["path"], r["method"]))}


@app.get("/metrics/prometheus", response_class=PlainTextResponse, summary="Prometheus-style metrics")
async def metrics_prometheus():
    lines = []
    for key, req_count in _metrics_counts.items():
        if len(key) == 3 and key[2] == "requests":
            method, path, _ = key
            safe_path = path.replace('"', '\\"')
            lines.append(
                f'unihealth_http_requests_total{{method="{method}",path="{safe_path}"}} {req_count}'
            )
            total_ms = _metrics_latency_sum_ms[(method, path)]
            lines.append(
                f'unihealth_http_latency_ms_sum{{method="{method}",path="{safe_path}"}} {total_ms:.2f}'
            )
    for key, cnt in _metrics_counts.items():
        if len(key) == 3 and key[2] != "requests":
            method, path, status = key
            safe_path = path.replace('"', '\\"')
            lines.append(
                f'unihealth_http_status_total{{method="{method}",path="{safe_path}",status="{status}"}} {cnt}'
            )
    return "\n".join(lines) + "\n"


@app.get(
    "/fhir/r5/Patient/{patient_id}/summary",
    response_model=PatientSummary,
    summary="Patient + recent encounters (edge-first, <50ms target)",
)
async def patient_summary(
    patient_id: str,
    encounters: int = Query(
        default=5,
        ge=1,
        le=20,
        description="Number of recent encounters to return",
    ),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
    response: Response = None,
):
    start = time.perf_counter()
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    # Phase 1: simple consent enforcement. Emergency bypass is allowed but can be audited later.
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    # 1. Try Redis (hot path)
    summary = await get_summary_from_cache(patient_id)
    if summary is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
            response.headers["X-Endpoint-Latency-Ms"] = f"{((time.perf_counter() - start) * 1000.0):.2f}"
        # Trim encounters to requested count if cache had more
        if len(summary.encounters) > encounters:
            summary = PatientSummary(
                patient=summary.patient,
                encounters=summary.encounters[:encounters],
            )
        return summary

    # 2. Fallback: PostgreSQL (warm)
    summary = await get_summary_from_db(patient_id, encounters)
    if summary is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 3. Backfill cache for next time
    await set_summary_in_cache(patient_id, summary)
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
        response.headers["X-Endpoint-Latency-Ms"] = f"{((time.perf_counter() - start) * 1000.0):.2f}"

    return summary


# ----- Consent (Phase 1) -----


@app.post(
    "/consent/grant",
    status_code=200,
    summary="Grant consent for (patient, facility, scope).",
)
async def consent_grant(payload: dict = Body(...)):
    patient_id = payload.get("patient_id")
    facility_id = payload.get("facility_id")
    scope = payload.get("scope", "treatment")
    if not patient_id or not facility_id:
        raise HTTPException(status_code=400, detail="patient_id and facility_id are required")
    if not await patient_exists(patient_id):
        raise HTTPException(
            status_code=404,
            detail=(
                "Patient not in database. Create P001 first: run edge consumer + "
                "scripts/produce_sample_events.py, or: source ehr-api/.venv/bin/activate && "
                "python scripts/seed_data.py"
            ),
        )
    try:
        await grant_consent(patient_id=patient_id, facility_id=facility_id, scope=scope)
    except asyncpg.UndefinedTableError:
        raise HTTPException(
            status_code=503,
            detail="Table 'consents' missing. Apply schema: PGPASSWORD=ehr_dev_password psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql",
        )
    except asyncpg.ForeignKeyViolationError:
        raise HTTPException(
            status_code=404,
            detail="Patient not in database (foreign key). Seed or ingest patient first.",
        )
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=f"Database error: {e}")
    return {"status": "granted", "patient_id": patient_id, "facility_id": facility_id, "scope": scope}


@app.post(
    "/consent/revoke",
    status_code=200,
    summary="Revoke consent for (patient, facility, scope).",
)
async def consent_revoke(payload: dict = Body(...)):
    patient_id = payload.get("patient_id")
    facility_id = payload.get("facility_id")
    scope = payload.get("scope", "treatment")
    if not patient_id or not facility_id:
        raise HTTPException(status_code=400, detail="patient_id and facility_id are required")
    changed = await revoke_consent(patient_id=patient_id, facility_id=facility_id, scope=scope)
    return {
        "status": "revoked",
        "patient_id": patient_id,
        "facility_id": facility_id,
        "scope": scope,
        "rows_changed": changed,
    }


# ----- Pilot EMR ingestion (POST → Kafka) -----


@app.post(
    "/fhir/r5/Patient",
    status_code=202,
    summary="Ingest patient (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_patient(payload: dict = Body(...)):
    """Accept FHIR-style Patient JSON. Required: id. Optional: nhi_number, family_name, given_name, birth_date, gender."""
    try:
        send_patient(payload)
        return {"status": "accepted", "resourceType": "Patient", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/Encounter",
    status_code=202,
    summary="Ingest encounter (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_encounter(payload: dict = Body(...)):
    """Accept FHIR-style Encounter JSON. Required: id, patient_id (or subject.reference). Optional: facility_id, facility_name, status, class_code, period."""
    try:
        send_encounter(payload)
        return {"status": "accepted", "resourceType": "Encounter", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/Observation",
    status_code=202,
    summary="Ingest observation (pilot EMR/device). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_observation(payload: dict = Body(...)):
    try:
        send_observation(payload)
        return {"status": "accepted", "resourceType": "Observation", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/MedicationRequest",
    status_code=202,
    summary="Ingest MedicationRequest (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_medication_request(payload: dict = Body(...)):
    try:
        send_medication_request(payload)
        return {"status": "accepted", "resourceType": "MedicationRequest", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.get(
    "/fhir/r5/Patient/{patient_id}/observations",
    response_model=list[Observation],
    summary="Get patient observations (edge cache + warm store).",
)
async def patient_observations(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
    response: Response = None,
):
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    cached = await get_observations_from_cache(patient_id)
    if cached is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
        return cached[:limit]

    obs = await get_observations_from_db(patient_id, limit)
    await set_observations_in_cache(patient_id, obs)
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
    return obs


@app.get(
    "/fhir/r5/Patient/{patient_id}/medication-requests",
    response_model=list[MedicationRequest],
    summary="Get patient medication requests (edge cache + warm store).",
)
async def patient_med_requests(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
    response: Response = None,
):
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    cached = await get_med_requests_from_cache(patient_id)
    if cached is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
        return cached[:limit]

    meds = await get_med_requests_from_db(patient_id, limit)
    await set_med_requests_in_cache(patient_id, meds)
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
    return meds
