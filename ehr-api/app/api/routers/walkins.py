import re
import time

from fastapi import APIRouter, Body, HTTPException, Query

from app.state import admin_facilities, patient_aliases, patients_core, walkin_visits

router = APIRouter(prefix="/walkins")


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _norm_phone(s: str) -> str:
    raw = re.sub(r"[^\d+]", "", (s or "").strip())
    if raw.startswith("0") and len(raw) >= 10:
        # naive KE normalization: 07xx -> +2547xx
        return "+254" + raw[1:]
    if raw and not raw.startswith("+") and len(raw) >= 10:
        return "+" + raw
    return raw


def _facility_by_id(fid: str) -> dict | None:
    for f in admin_facilities:
        if str(f.get("id")) == str(fid):
            return f
    return None


def _find_candidates(payload: dict) -> list[dict]:
    """
    Conservative matching:
    - Exact match on national_id or phone (if provided)
    - Otherwise, score on name + dob + gender.
    """
    full_name = _norm(payload.get("full_name") or "")
    dob = (payload.get("dob") or "").strip()
    gender = _norm(payload.get("gender") or "")
    phone = _norm_phone(payload.get("phone") or "")
    national_id = _norm(str(payload.get("national_id") or ""))

    candidates: list[dict] = []

    # Exact keys first
    if national_id:
        for p in patients_core:
            if _norm(str(p.get("national_id") or "")) == national_id:
                candidates.append({"uhid": p.get("uhid"), "score": 1.0, "reason": "national_id exact"})
        if candidates:
            return candidates

    if phone:
        for p in patients_core:
            if _norm_phone(str(p.get("phone") or "")) == phone:
                candidates.append({"uhid": p.get("uhid"), "score": 0.98, "reason": "phone exact"})
        if candidates:
            return candidates

    # Fallback: score-based
    for p in patients_core:
        score = 0.0
        reasons: list[str] = []

        p_name = _norm(str(p.get("full_name") or ""))
        p_dob = (p.get("dob") or "").strip()
        p_gender = _norm(str(p.get("gender") or ""))

        if full_name and p_name:
            if full_name == p_name:
                score += 0.7
                reasons.append("name exact")
            else:
                # token overlap
                a = set(full_name.split(" "))
                b = set(p_name.split(" "))
                if a and b:
                    overlap = len(a & b) / max(1, len(a | b))
                    if overlap >= 0.6:
                        score += 0.45
                        reasons.append("name similar")
                    elif overlap >= 0.4:
                        score += 0.25
                        reasons.append("name partial")

        if dob and p_dob and dob == p_dob:
            score += 0.25
            reasons.append("dob exact")

        if gender and p_gender and gender == p_gender:
            score += 0.05
            reasons.append("gender match")

        if score >= 0.55:
            candidates.append({"uhid": p.get("uhid"), "score": round(score, 2), "reason": ", ".join(reasons)})

    candidates.sort(key=lambda x: float(x.get("score") or 0.0), reverse=True)
    return candidates[:5]


def _get_patient_by_uhid(uhid: str) -> dict | None:
    for p in patients_core:
        if str(p.get("uhid")) == str(uhid):
            return p
    return None


@router.get("", status_code=200, summary="List walk-in visits (Phase 1 UI).")
async def walkins_list(
    limit: int = Query(default=50, ge=1, le=500),
    facility_id: str | None = Query(default=None),
    triage_level: str | None = Query(default=None),
    uhid: str | None = Query(default=None),
):
    rows = walkin_visits[:]
    if facility_id:
        rows = [r for r in rows if str(r.get("facility_id") or "") == facility_id]
    if triage_level:
        rows = [r for r in rows if _norm(str(r.get("triage_level") or "")) == _norm(triage_level)]
    if uhid:
        rows = [r for r in rows if str(r.get("uhid") or "") == uhid]
    return rows[:limit]


@router.get("/search", status_code=200, summary="Search the global patient identity index (Phase 1 UI).")
async def walkins_search(q: str = Query(..., min_length=1), limit: int = Query(default=20, ge=1, le=200)):
    qq = _norm(q)
    qq_phone = _norm_phone(q)
    results: list[dict] = []
    for p in patients_core:
        matched = (
            qq in _norm(str(p.get("full_name") or ""))
            or qq in _norm(str(p.get("national_id") or ""))
            or (_norm_phone(str(p.get("phone") or "")) and qq_phone and qq_phone in _norm_phone(str(p.get("phone") or "")))
        )
        if matched:
            aliases = [a for a in patient_aliases if str(a.get("uhid")) == str(p.get("uhid"))]
            visits = [v for v in walkin_visits if str(v.get("uhid")) == str(p.get("uhid"))]
            results.append({**p, "aliases": aliases, "visit_count": len(visits)})
    return results[:limit]


@router.get("/patient/{uhid}", status_code=200, summary="Patient 360 — core record + all facility aliases + walk-in history (Phase 1 UI).")
async def patient_360(uhid: str):
    patient = _get_patient_by_uhid(uhid)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    aliases = [a for a in patient_aliases if str(a.get("uhid")) == uhid]
    visits = [v for v in walkin_visits if str(v.get("uhid")) == uhid]
    facility_ids_visited = list({str(v.get("facility_id") or "") for v in visits if v.get("facility_id")})
    return {
        "patient": patient,
        "aliases": aliases,
        "visits": visits,
        "facilities_visited": facility_ids_visited,
        "total_visits": len(visits),
    }


@router.post("", status_code=200, summary="Create a walk-in visit with cross-facility correlation (Phase 1 UI).")
async def walkin_create(payload: dict = Body(...)):
    facility_id = (payload.get("facility_id") or "").strip()
    facility_name = (payload.get("facility_name") or "").strip()
    if not facility_id and not facility_name:
        raise HTTPException(status_code=400, detail="facility_id or facility_name is required")

    if facility_id:
        f = _facility_by_id(facility_id)
        if f and not facility_name:
            facility_name = str(f.get("name") or "").strip()
    if not facility_name:
        facility_name = facility_id or "Unknown Facility"

    full_name = (payload.get("full_name") or "").strip()
    if not full_name:
        raise HTTPException(status_code=400, detail="full_name is required")

    dob = (payload.get("dob") or "").strip() or None
    gender = (payload.get("gender") or "").strip() or None
    phone = (payload.get("phone") or "").strip() or None
    national_id = (payload.get("national_id") or "").strip() or None

    candidates = _find_candidates(payload)
    chosen_uhid = payload.get("uhid")

    correlation = {"action": None, "candidates": candidates}

    # Choose UHID:
    if chosen_uhid:
        uhid = str(chosen_uhid)
        if _get_patient_by_uhid(uhid) is None:
            raise HTTPException(status_code=404, detail="Provided uhid not found")
        correlation["action"] = "linked_by_uhid"
    elif candidates and float(candidates[0].get("score") or 0.0) >= 0.85:
        uhid = str(candidates[0]["uhid"])
        correlation["action"] = "auto_linked"
    else:
        uhid = f"UHID-{int(time.time() * 1000)}"
        now = time.time()
        patients_core.insert(
            0,
            {
                "uhid": uhid,
                "full_name": full_name,
                "dob": dob,
                "gender": gender,
                "phone": phone,
                "national_id": national_id,
                "created_at": now,
                "updated_at": now,
            },
        )
        correlation["action"] = "created_new"

    # Create alias for this facility MRN (if supplied)
    mrn = (payload.get("mrn") or "").strip() or None
    if mrn and facility_id:
        if not any(
            str(a.get("facility_id")) == facility_id and str(a.get("mrn")) == mrn for a in patient_aliases
        ):
            patient_aliases.insert(
                0,
                {
                    "uhid": uhid,
                    "facility_id": facility_id,
                    "facility_name": facility_name,
                    "mrn": mrn,
                    "created_at": time.time(),
                },
            )

    walkin_id = f"WALKIN-{int(time.time() * 1000)}"
    visit = {
        "id": walkin_id,
        "uhid": uhid,
        "facility_id": facility_id or None,
        "facility_name": facility_name,
        "mrn": mrn,
        "chief_complaint": (payload.get("chief_complaint") or "").strip() or None,
        "triage_level": (payload.get("triage_level") or "").strip() or None,
        "arrived_at": payload.get("arrived_at") or time.strftime("%Y-%m-%d %H:%M"),
        "created_at": time.time(),
    }
    walkin_visits.insert(0, visit)

    patient = _get_patient_by_uhid(uhid)
    aliases = [a for a in patient_aliases if str(a.get("uhid")) == uhid]
    return {"status": "created", "walkin": visit, "patient": patient, "aliases": aliases, "correlation": correlation}


@router.post("/{walkin_id}/resolve", status_code=200, summary="Mark a walk-in as triaged/resolved (Phase 1 UI).")
async def walkin_resolve(walkin_id: str, payload: dict = Body(default={})):
    for v in walkin_visits:
        if str(v.get("id")) == walkin_id:
            v["status"] = "Resolved"
            v["resolved_at"] = time.strftime("%Y-%m-%d %H:%M")
            v["resolved_by"] = (payload.get("resolved_by") or "Staff").strip()
            return {"status": "resolved", "walkin": v}
    raise HTTPException(status_code=404, detail="Walk-in not found")

