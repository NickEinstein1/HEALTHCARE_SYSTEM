"""
UniHealth EHR Phase 1 - Edge FHIR gateway.

Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
Strategy: Redis (hot) first; on miss, PostgreSQL (warm) then backfill cache.
Pilot EMRs POST Patient/Encounter to Kafka via ingestion API.
"""

import asyncpg
import time
from collections import defaultdict

from fastapi import Body, FastAPI, HTTPException, Header, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from app.api.router import api_router

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

app.include_router(api_router)

# NOTE: Admin + Nurse Phase 1 endpoints moved to routers; kept here disabled.
'''
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

#
# NOTE:
# Lab + Pharmacy Phase 1 in-memory state moved to `app/state.py`
# and endpoints moved under `app/api/routers/`.


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


# Lab + Pharmacy endpoints moved to `app/api/routers/lab.py` and `app/api/routers/pharmacy.py`.


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
'''

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
    # Phase 3: seed AI simulation data
    from app.state import bootstrap_ai_state
    bootstrap_ai_state()


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

"""
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
"""


"""
NOTE:
FHIR + consent endpoints moved to `app/api/routers/fhir.py`.
"""
