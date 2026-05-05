import time

from fastapi import APIRouter, Body, HTTPException, Query

from app.state import admin_facilities, admin_patients, admin_users

router = APIRouter(prefix="/admin")


@router.get("/users", status_code=200, summary="List admin-managed users (Phase 1 UI).")
async def admin_list_users(
    q: str | None = Query(default=None, description="Optional search across name/email/reg/facility/role"),
    role: str | None = Query(default=None),
    facility: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=500),
):
    rows = list(admin_users)
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


@router.post("/users", status_code=200, summary="Create a user (Phase 1 UI).")
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
    if any(str(u.get("email", "")).lower() == email for u in admin_users):
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
    admin_users.insert(0, row)
    return {"status": "created", "id": user_id, "user": row}


@router.put("/users/{user_id}", status_code=200, summary="Update a user (Phase 1 UI).")
async def admin_update_user(user_id: str, payload: dict = Body(...)):
    now = time.time()
    for u in admin_users:
        if str(u.get("id")) == user_id:
            if "email" in payload:
                new_email = (payload.get("email") or "").strip().lower()
                if not new_email:
                    raise HTTPException(status_code=400, detail="email cannot be empty")
                if any(str(x.get("email", "")).lower() == new_email and str(x.get("id")) != user_id for x in admin_users):
                    raise HTTPException(status_code=409, detail="email already exists")
                u["email"] = new_email
            for k in ["name", "role", "reg", "facility", "auth", "status", "last_login"]:
                if k in payload:
                    val = payload.get(k)
                    u[k] = val.strip() if isinstance(val, str) else val
            u["updated_at"] = now
            return {"status": "updated", "id": user_id, "user": u}
    raise HTTPException(status_code=404, detail="User not found")


@router.delete("/users/{user_id}", status_code=200, summary="Delete a user (Phase 1 UI).")
async def admin_delete_user(user_id: str):
    for i, u in enumerate(admin_users):
        if str(u.get("id")) == user_id:
            admin_users.pop(i)
            return {"status": "deleted", "id": user_id}
    raise HTTPException(status_code=404, detail="User not found")


@router.post("/users/bulk", status_code=200, summary="Create multiple users (CSV import, Phase 1 UI).")
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
        if any(str(u.get("email", "")).lower() == email for u in admin_users):
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
        admin_users.insert(0, row)
        created.append(row)
    return {"status": "ok", "created_count": len(created), "created": created, "errors": errors}


@router.get("/facilities", status_code=200, summary="List facilities (Phase 1 UI).")
async def admin_list_facilities(
    q: str | None = Query(default=None),
    county: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
):
    rows = list(admin_facilities)
    if q:
        qq = q.strip().lower()
        if qq:
            rows = [r for r in rows if qq in str(r.get("name", "")).lower() or qq in str(r.get("id", "")).lower()]
    if county:
        rows = [r for r in rows if str(r.get("county", "")).lower() == county.strip().lower()]
    if status:
        rows = [r for r in rows if str(r.get("status", "")).lower() == status.strip().lower()]
    return rows[:limit]


@router.post("/facilities", status_code=200, summary="Create a facility (Phase 1 UI).")
async def admin_create_facility(payload: dict = Body(...)):
    name = (payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if any(str(f.get("name", "")).strip().lower() == name.lower() for f in admin_facilities):
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
    admin_facilities.insert(0, row)
    return {"status": "created", "id": fac_id, "facility": row}


@router.put("/facilities/{facility_id}", status_code=200, summary="Update a facility (Phase 1 UI).")
async def admin_update_facility(facility_id: str, payload: dict = Body(...)):
    now = time.time()
    for f in admin_facilities:
        if str(f.get("id")) == facility_id:
            if "name" in payload:
                new_name = (payload.get("name") or "").strip()
                if not new_name:
                    raise HTTPException(status_code=400, detail="name cannot be empty")
                if any(str(x.get("name", "")).strip().lower() == new_name.lower() and str(x.get("id")) != facility_id for x in admin_facilities):
                    raise HTTPException(status_code=409, detail="facility name already exists")
                f["name"] = new_name
            for k in ["level", "county", "status", "latency"]:
                if k in payload:
                    val = payload.get(k)
                    f[k] = val.strip() if isinstance(val, str) else val
            f["updated_at"] = now
            return {"status": "updated", "id": facility_id, "facility": f}
    raise HTTPException(status_code=404, detail="Facility not found")


@router.delete("/facilities/{facility_id}", status_code=200, summary="Delete a facility (Phase 1 UI).")
async def admin_delete_facility(facility_id: str):
    for i, f in enumerate(admin_facilities):
        if str(f.get("id")) == facility_id:
            admin_facilities.pop(i)
            return {"status": "deleted", "id": facility_id}
    raise HTTPException(status_code=404, detail="Facility not found")


@router.get("/patients", status_code=200, summary="List patients (Phase 1 UI).")
async def admin_list_patients(
    q: str | None = Query(default=None),
    facility: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
):
    rows = list(admin_patients)
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


@router.post("/patients", status_code=200, summary="Register a patient (Phase 1 UI).")
async def admin_create_patient(payload: dict = Body(...)):
    afl_id = (payload.get("afl_id") or "").strip()
    name = (payload.get("name") or "").strip()
    if not afl_id:
        raise HTTPException(status_code=400, detail="afl_id is required")
    if not name:
        raise HTTPException(status_code=400, detail="name is required")
    if any(str(p.get("afl_id", "")).strip().lower() == afl_id.lower() for p in admin_patients):
        raise HTTPException(status_code=409, detail="afl_id already exists")
    pat_id = payload.get("id") or f"PAT-{int(time.time() * 1000)}"
    now = time.time()
    row = {
        "id": pat_id,
        "afl_id": afl_id,
        "name": name,
        "email": (payload.get("email") or "").strip() or None,
        "phone": (payload.get("phone") or "").strip() or None,
        "facility": (payload.get("facility") or "").strip() or None,
        "status": (payload.get("status") or "").strip() or "Active",
        "created_at": now,
        "updated_at": now,
    }
    admin_patients.insert(0, row)
    return {"status": "created", "id": pat_id, "patient": row}


@router.put("/patients/{patient_id}", status_code=200, summary="Update a patient (Phase 1 UI).")
async def admin_update_patient(patient_id: str, payload: dict = Body(...)):
    now = time.time()
    for p in admin_patients:
        if str(p.get("id")) == patient_id:
            if "afl_id" in payload:
                new_afl = (payload.get("afl_id") or "").strip()
                if not new_afl:
                    raise HTTPException(status_code=400, detail="afl_id cannot be empty")
                if any(str(x.get("afl_id", "")).strip().lower() == new_afl.lower() and str(x.get("id")) != patient_id for x in admin_patients):
                    raise HTTPException(status_code=409, detail="afl_id already exists")
                p["afl_id"] = new_afl
            for k in ["name", "email", "phone", "facility", "status"]:
                if k in payload:
                    val = payload.get(k)
                    p[k] = val.strip() if isinstance(val, str) else val
            p["updated_at"] = now
            return {"status": "updated", "id": patient_id, "patient": p}
    raise HTTPException(status_code=404, detail="Patient not found")


@router.delete("/patients/{patient_id}", status_code=200, summary="Delete a patient (Phase 1 UI).")
async def admin_delete_patient(patient_id: str):
    for i, p in enumerate(admin_patients):
        if str(p.get("id")) == patient_id:
            admin_patients.pop(i)
            return {"status": "deleted", "id": patient_id}
    raise HTTPException(status_code=404, detail="Patient not found")

